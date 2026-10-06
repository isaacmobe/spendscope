import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { onPulse } from "./events";

/**
 * AmbientScene
 * ------------
 * The backdrop is a wall of hexagonal tiles, like the flipping walls of a split-flap display, but
 * they show nothing: tiles turn over one at a time (and in waves when you add an entry), each
 * flip lifting the tile toward you so it never cuts into its neighbours. Real lighting, with a
 * soft light drifting across the wall, gives the tiles their solid 3D look. The wall bends away
 * from the centre like a shallow bowl and follows the pointer slightly. It never receives pointer
 * events and sits behind the HTML interface.
 */

// Tile colours per theme. Light and dark are both kept close to the page colour so the wall is
// atmosphere, not noise; a few accent tiles add life.
const THEMES = {
  light: { tiles: ["#EBE7DB", "#EFEBE0", "#E6E2D6", "#F3F0E7"], accent: ["#DADCF4", "#E2E4F7"], light: "#8A8EEA", ambient: 1.6, key: 0.5, drift: 55, metal: 0.04, dust: "#2A2A31", dustOpacity: 0.3 },
  dark: { tiles: ["#24242C", "#2B2B35", "#1E1E26", "#30303B"], accent: ["#2F3264", "#383C75"], light: "#8F94FF", ambient: 0.7, key: 1.15, drift: 130, metal: 0.35, dust: "#C9CCFF", dustOpacity: 0.55 }
};
const PULSE_COLORS = { income: "#5E62C4", save: "#2E9C8F", spend: "#E2793F", milestone: "#D4A83A" };

// Small deterministic random generator: the same wall every load, and pure for React.
function seeded(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// A hexagonal tile (pointy-top, thin prism). Vertex colours darken the back face and the sides, so
// the tile looks different when it has flipped and its edges catch less light than its face.
function useTileGeometry(radius) {
  const geometry = useMemo(() => {
    const g = new THREE.CylinderGeometry(radius * 0.93, radius * 0.93, 0.26, 6).rotateX(Math.PI / 2);
    const normal = g.attributes.normal;
    const colors = new Float32Array(normal.count * 3);
    for (let i = 0; i < normal.count; i++) {
      const nz = normal.getZ(i);
      const c = nz > 0.9 ? [1, 1, 1] : nz < -0.9 ? [0.62, 0.66, 1] : [0.68, 0.68, 0.74];
      colors.set(c, i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return g;
  }, [radius]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return geometry;
}

const WAVE_SPEED = 10; // world units per second
const WAVE_LIFE = 3.2; // seconds

// The wall itself: one InstancedMesh, so hundreds of tiles cost a single draw call.
function HexWall({ animate, palette, lowPower }) {
  const mesh = useRef(null);
  const radius = lowPower ? 0.95 : 0.62;
  const geometry = useTileGeometry(radius);
  const wave = useRef(null); // { t0, color }

  // Grid of tile centres (pointy-top honeycomb), generous enough for ultra-wide windows.
  const layout = useMemo(() => {
    const rnd = seeded(11);
    const w = Math.sqrt(3) * radius;
    const rowH = 1.5 * radius;
    const cols = Math.ceil(46 / w);
    const rows = Math.ceil(24 / rowH);
    const tiles = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = (c - cols / 2) * w + (r % 2 ? w / 2 : 0);
        const y = (r - rows / 2) * rowH;
        const bowl = 0.012 * (x * x + y * y); // the wall curves away from the centre
        tiles.push({
          x,
          y,
          z: -9 - bowl,
          axis: Math.floor(rnd() * 3), // which of the three hexagon axes it flips about
          accent: rnd() < 0.06,
          shade: Math.floor(rnd() * 4),
          dist: Math.hypot(x, y)
        });
      }
    }
    return tiles;
  }, [radius]);

  // Per-tile animation state, in a ref: it changes every frame and React never reads it for rendering.
  const stateRef = useRef(null);
  useEffect(() => {
    stateRef.current = {
      rest: new Float32Array(layout.length), // angle the tile rests at (a multiple of PI)
      start: new Float32Array(layout.length).fill(-1), // flip start time, or -1 when still
      dur: new Float32Array(layout.length).fill(1.1),
      tint: new Float32Array(layout.length), // 0..1 pulse colour mixed into the tile
      active: new Set()
    };
  }, [layout]);

  const work = useMemo(() => ({ dummy: new THREE.Object3D(), quat: new THREE.Quaternion(), axis: new THREE.Vector3(), color: new THREE.Color(), base: new THREE.Color(), pulse: new THREE.Color(), rnd: seeded(5) }), []);

  // Base colour of every tile, rebuilt when the theme changes.
  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    layout.forEach((t, i) => {
      const list = t.accent ? palette.accent : palette.tiles;
      work.color.set(list[t.shade % list.length]);
      m.setColorAt(i, work.color);
    });
    m.instanceColor.needsUpdate = true;
  }, [layout, palette, work]);

  // Place every tile once (and again whenever the layout changes).
  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    layout.forEach((t, i) => {
      work.dummy.position.set(t.x, t.y, t.z);
      work.dummy.quaternion.identity();
      work.dummy.updateMatrix();
      m.setMatrixAt(i, work.dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [layout, work]);

  // A wave of flips spreads from the middle when something happens in the app.
  useEffect(() => {
    if (!animate) return;
    return onPulse((kind) => {
      wave.current = { t0: -1, color: PULSE_COLORS[kind] || PULSE_COLORS.income };
    });
  }, [animate]);

  useFrame(({ clock }, delta) => {
    const m = mesh.current;
    const state = stateRef.current;
    if (!m || !state || !animate) return;
    const flip = (i, at, duration) => {
      state.start[i] = at;
      state.dur[i] = duration;
      state.active.add(i);
    };
    const t = clock.elapsedTime;
    const dt = Math.min(delta, 0.1);

    // Random flips: a few tiles per second, never one that is already turning.
    const toStart = work.rnd() < 7 * dt ? 1 : 0;
    for (let k = 0; k < toStart + (work.rnd() < 4 * dt ? 1 : 0); k++) {
      const i = Math.floor(work.rnd() * layout.length);
      if (state.start[i] < 0) flip(i, t, 0.9 + work.rnd() * 0.7);
    }

    // The pulse wave: tiles flip as its ring passes over them, and take on its colour for a moment.
    const w = wave.current;
    let tintChanged = false;
    if (w) {
      if (w.t0 < 0) w.t0 = t;
      const age = t - w.t0;
      if (age > WAVE_LIFE) wave.current = null;
      else {
        const r = age * WAVE_SPEED;
        work.pulse.set(w.color);
        for (let i = 0; i < layout.length; i++) {
          if (Math.abs(layout[i].dist - r) < 0.7) {
            if (state.start[i] < 0) flip(i, t, 0.8);
            state.tint[i] = 1;
            tintChanged = true;
          }
        }
      }
    }
    // Fade the pulse colour back out.
    if (tintChanged || wave.current === null) {
      for (let i = 0; i < layout.length; i++) {
        if (state.tint[i] > 0) {
          state.tint[i] = Math.max(0, state.tint[i] - dt * 0.7);
          const list = layout[i].accent ? palette.accent : palette.tiles;
          work.base.set(list[layout[i].shade % list.length]);
          work.color.copy(work.base).lerp(work.pulse, state.tint[i] * 0.55);
          m.setColorAt(i, work.color);
          tintChanged = true;
        }
      }
      if (tintChanged) m.instanceColor.needsUpdate = true;
    }

    // Advance the tiles that are turning.
    if (state.active.size) {
      for (const i of state.active) {
        const p = (t - state.start[i]) / state.dur[i];
        const tile = layout[i];
        let angle;
        let lift;
        if (p >= 1) {
          state.rest[i] += Math.PI;
          state.start[i] = -1;
          state.active.delete(i);
          angle = state.rest[i];
          lift = 0;
        } else {
          angle = state.rest[i] + Math.PI * easeInOut(p);
          lift = Math.sin(Math.PI * p) * 0.55; // pops toward the viewer while turning
        }
        const a = (tile.axis * Math.PI) / 3; // in-plane axis: 0, 60 or 120 degrees
        work.axis.set(Math.cos(a), Math.sin(a), 0);
        work.dummy.position.set(tile.x, tile.y, tile.z + lift);
        work.dummy.quaternion.setFromAxisAngle(work.axis, angle);
        work.dummy.updateMatrix();
        m.setMatrixAt(i, work.dummy.matrix);
      }
      m.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <instancedMesh ref={mesh} args={[geometry, undefined, layout.length]} frustumCulled={false}>
      <meshStandardMaterial vertexColors roughness={0.5} metalness={palette.metal} />
    </instancedMesh>
  );
}

// A soft coloured light that drifts across the wall, so the tiles' faces catch moving highlights.
function DriftLight({ animate, color, strength }) {
  const light = useRef(null);
  useFrame(({ clock }) => {
    if (!animate || !light.current) return;
    const t = clock.elapsedTime;
    light.current.position.set(Math.sin(t * 0.17) * 13, Math.cos(t * 0.23) * 6, -3);
  });
  return <pointLight ref={light} color={color} intensity={strength} distance={34} decay={1.4} position={[0, 0, -3]} />;
}

// Soft round sprite used for the dust, so each particle is a dot and never a square.
function dotTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
}

// A few fine particles floating in front of the wall for depth. Fixed pixel size, so none can swell
// into a large square near the camera.
function Dust({ count, animate, palette }) {
  const attr = useRef(null);
  const sprite = useMemo(() => dotTexture(), []);
  const positions = useMemo(() => {
    const rnd = seeded(21);
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (rnd() - 0.5) * 30;
      arr[i * 3 + 1] = (rnd() - 0.5) * 18;
      arr[i * 3 + 2] = -8 + rnd() * 12;
    }
    return arr;
  }, [count]);

  useFrame((_, delta) => {
    if (!animate || !attr.current) return;
    const a = attr.current.array;
    for (let i = 0; i < count; i++) {
      a[i * 3 + 1] += delta * (0.12 + (i % 4) * 0.05); // slow upward drift
      if (a[i * 3 + 1] > 9) a[i * 3 + 1] -= 18;
    }
    attr.current.needsUpdate = true;
  });

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute ref={attr} attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color={palette.dust} map={sprite} alphaTest={0.02} size={3} transparent opacity={palette.dustOpacity} sizeAttenuation={false} depthWrite={false} />
    </points>
  );
}

// Turns the whole wall slightly toward the pointer for a sense of depth.
function Parallax({ children, animate }) {
  const group = useRef(null);
  useFrame(({ pointer }) => {
    if (!animate || !group.current) return;
    group.current.rotation.y += (pointer.x * 0.16 - group.current.rotation.y) * 0.04;
    group.current.rotation.x += (-pointer.y * 0.1 - group.current.rotation.x) * 0.04;
  });
  return <group ref={group}>{children}</group>;
}

// With reduced motion the loop is off, so draw one frame (and again on resize or theme change).
function StaticRender({ active, version }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (active) invalidate();
  }, [active, version, invalidate]);
  return null;
}

export default function AmbientScene({ lowPower, dark }) {
  const reduced = useReducedMotion();
  const animate = !reduced;
  const palette = dark ? THEMES.dark : THEMES.light;

  return (
    <Canvas
      camera={{ position: [0, 0, 10], fov: 50 }}
      dpr={[1, lowPower ? 1 : 1.5]}
      gl={{ alpha: true, antialias: !lowPower, powerPreference: "low-power" }}
      frameloop={animate ? "always" : "demand"}
      style={{ background: "transparent" }}
    >
      <StaticRender active={!animate} version={dark} />
      <ambientLight intensity={palette.ambient} />
      <directionalLight position={[6, 9, 8]} intensity={palette.key} />
      <DriftLight animate={animate} color={palette.light} strength={palette.drift} />
      <Parallax animate={animate}>
        <HexWall animate={animate} palette={palette} lowPower={lowPower} />
        <Dust count={lowPower ? 60 : 160} animate={animate} palette={palette} />
      </Parallax>
    </Canvas>
  );
}
