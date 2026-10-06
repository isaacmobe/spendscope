import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { onPulse } from "./events";

/**
 * AmbientScene
 * ------------
 * A calm 3D backdrop: drifting hexagonal wireframes and dust, a gentle pointer parallax,
 * and expanding hexagon "ripples" when something happens (earning added, money spent or saved).
 * It never receives pointer events and sits behind the HTML interface.
 */
// Colours per theme: indigo lines on cream, lighter indigo lines on soft black.
const THEMES = {
  light: { line: "#5E62C4", dust: "#2A2A31", fog: "#F1EEE6", lineOpacity: 0.28, plateOpacity: 0.025, dustOpacity: 0.4, tunnel: 0.4, additive: false },
  dark: { line: "#9296EC", dust: "#C9CCFF", fog: "#16161A", lineOpacity: 0.45, plateOpacity: 0.05, dustOpacity: 0.7, tunnel: 0.65, additive: true }
};
const PULSE_COLORS = { income: "#5E62C4", save: "#2E9C8F", spend: "#E2793F", milestone: "#D4A83A" };

// Small deterministic random generator: the same layout every load, and pure for React.
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

// Flat hexagon outline geometry (shared by every wireframe and ripple).
function useHexEdges() {
  const edges = useMemo(() => {
    const prism = new THREE.CylinderGeometry(1, 1, 0.1, 6).rotateX(Math.PI / 2);
    const e = new THREE.EdgesGeometry(prism);
    prism.dispose();
    return e;
  }, []);
  useEffect(() => () => edges.dispose(), [edges]);
  return edges;
}

// Drifting hexagon wireframes with a faint translucent plate for depth.
function Hexagons({ count, edges, animate, palette }) {
  const group = useRef(null);
  const items = useMemo(() => {
    const rnd = seeded(7);
    return Array.from({ length: count }, () => ({
      position: [(rnd() - 0.5) * 26, (rnd() - 0.5) * 14, -5 - rnd() * 9],
      scale: 0.5 + rnd() * 1.0,
      speed: 0.05 + rnd() * 0.12,
      phase: rnd() * Math.PI * 2,
      tilt: [rnd() * 0.9, rnd() * 0.9]
    }));
  }, [count]);

  useFrame(({ clock }) => {
    if (!animate || !group.current) return;
    const t = clock.elapsedTime;
    group.current.children.forEach((mesh, i) => {
      const it = items[i];
      mesh.rotation.z = it.phase + t * it.speed;
      mesh.rotation.x = it.tilt[0] + Math.sin(t * it.speed + it.phase) * 0.3;
      mesh.rotation.y = it.tilt[1] + Math.cos(t * it.speed + it.phase) * 0.3;
      mesh.position.y = it.position[1] + Math.sin(t * 0.3 + it.phase) * 0.35;
    });
  });

  return (
    <group ref={group}>
      {items.map((it, i) => (
        <group key={i} position={it.position} scale={it.scale} rotation={[it.tilt[0], it.tilt[1], it.phase]}>
          <lineSegments geometry={edges}>
            <lineBasicMaterial color={palette.line} transparent opacity={palette.lineOpacity} />
          </lineSegments>
          <mesh>
            <circleGeometry args={[1, 6]} />
            <meshBasicMaterial color={palette.line} transparent opacity={palette.plateOpacity} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
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

// Fine particles that stream slowly toward the viewer and wrap around at the back, which gives
// the scene its sense of travelling forward. Dots have a fixed pixel size (so none can swell into
// a large square near the camera) and are all kept behind the interface layer.
function Dust({ count, animate, palette }) {
  const attr = useRef(null);
  const sprite = useMemo(() => dotTexture(), []);
  const positions = useMemo(() => {
    const rnd = seeded(21);
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (rnd() - 0.5) * 30;
      arr[i * 3 + 1] = (rnd() - 0.5) * 18;
      arr[i * 3 + 2] = -3 - rnd() * 42;
    }
    return arr;
  }, [count]);

  useFrame((_, delta) => {
    if (!animate || !attr.current) return;
    const a = attr.current.array;
    for (let i = 0; i < count; i++) {
      a[i * 3 + 2] += delta * (0.8 + (i % 5) * 0.25);
      if (a[i * 3 + 2] > 2) a[i * 3 + 2] -= 44; // past the viewer: send it back to the far end
    }
    attr.current.needsUpdate = true;
  });

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute ref={attr} attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color={palette.dust} map={sprite} alphaTest={0.02} size={3.2} transparent opacity={palette.dustOpacity} sizeAttenuation={false} depthWrite={false} blending={palette.additive ? THREE.AdditiveBlending : THREE.NormalBlending} />
    </points>
  );
}

// A tunnel of hexagon outlines receding into the distance, rushing slowly toward the viewer and
// twisting a little as they go, with six long edges running down its corners. Distant rings fade
// into the fog and rings near the camera fade out, so nothing pops.
function Tunnel({ animate, palette, count }) {
  const R = 11;
  const SPACING = 4.6;
  const LENGTH = count * SPACING;
  const rings = useRef([]);
  const ringGeometry = useMemo(() => {
    const pts = Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 3) * i + Math.PI / 6;
      return new THREE.Vector3(Math.cos(a) * R, Math.sin(a) * R, 0);
    });
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, []);
  const edgeGeometry = useMemo(() => {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i + Math.PI / 6;
      pts.push(new THREE.Vector3(Math.cos(a) * R, Math.sin(a) * R, -LENGTH), new THREE.Vector3(Math.cos(a) * R, Math.sin(a) * R, 4));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [LENGTH]);
  const z = useRef(Array.from({ length: count }, (_, i) => -i * SPACING));

  useEffect(
    () => () => {
      ringGeometry.dispose();
      edgeGeometry.dispose();
    },
    [ringGeometry, edgeGeometry]
  );

  useFrame((_, delta) => {
    const step = animate ? delta * 1.3 : 0;
    rings.current.forEach((ring, i) => {
      if (!ring) return;
      z.current[i] += step;
      if (z.current[i] > 3) z.current[i] -= LENGTH;
      const depth = z.current[i];
      ring.position.z = depth;
      ring.rotation.z = depth * 0.018;
      // Fade in from the far end and out as the ring reaches the viewer.
      const far = Math.min(1, (depth + LENGTH) / 14);
      const near = Math.min(1, Math.max(0, (2.5 - depth) / 6));
      ring.material.opacity = palette.tunnel * far * near * 0.55;
    });
  });

  return (
    <group>
      {Array.from({ length: count }, (_, i) => (
        <lineLoop key={i} ref={(el) => (rings.current[i] = el)} geometry={ringGeometry} position={[0, 0, -i * SPACING]}>
          <lineBasicMaterial color={palette.line} transparent opacity={0} blending={palette.additive ? THREE.AdditiveBlending : THREE.NormalBlending} depthWrite={false} />
        </lineLoop>
      ))}
      <lineSegments geometry={edgeGeometry}>
        <lineBasicMaterial color={palette.line} transparent opacity={palette.tunnel * 0.14} blending={palette.additive ? THREE.AdditiveBlending : THREE.NormalBlending} depthWrite={false} />
      </lineSegments>
    </group>
  );
}

// A pool of rings that expand and fade when the UI calls pulse().
function Ripples({ edges, enabled }) {
  const POOL = 4;
  const rings = useRef([]);
  const state = useRef(Array.from({ length: POOL }, () => ({ t: 1, color: PULSE_COLORS.income })));
  const next = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    return onPulse((kind) => {
      const slot = state.current[next.current];
      slot.t = 0;
      slot.color = PULSE_COLORS[kind] || PULSE_COLORS.income;
      const mesh = rings.current[next.current];
      if (mesh) mesh.material.color.set(slot.color);
      next.current = (next.current + 1) % POOL;
    });
  }, [enabled]);

  useFrame((_, delta) => {
    state.current.forEach((slot, i) => {
      const mesh = rings.current[i];
      if (!mesh) return;
      if (slot.t >= 1) {
        mesh.visible = false;
        return;
      }
      slot.t = Math.min(1, slot.t + delta / 1.8);
      const eased = 1 - Math.pow(1 - slot.t, 3);
      mesh.visible = true;
      mesh.scale.setScalar(0.6 + eased * 9);
      mesh.material.opacity = 0.9 * (1 - slot.t);
    });
  });

  return (
    <>
      {Array.from({ length: POOL }, (_, i) => (
        <lineSegments key={i} ref={(el) => (rings.current[i] = el)} geometry={edges} visible={false} position={[0, 0, -3]}>
          <lineBasicMaterial color={PULSE_COLORS.income} transparent opacity={0} />
        </lineSegments>
      ))}
    </>
  );
}

// Moves the whole scene slightly toward the pointer for a sense of depth.
function Parallax({ children, animate }) {
  const group = useRef(null);
  useFrame(({ pointer }) => {
    if (!animate || !group.current) return;
    group.current.rotation.y += (pointer.x * 0.2 - group.current.rotation.y) * 0.04;
    group.current.rotation.x += (-pointer.y * 0.13 - group.current.rotation.x) * 0.04;
  });
  return <group ref={group}>{children}</group>;
}

// With reduced motion the loop is off, so draw one frame (and again on resize).
function StaticRender({ active, version }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (active) invalidate();
  }, [active, version, invalidate]);
  return null;
}

export default function AmbientScene({ lowPower, dark }) {
  const reduced = useReducedMotion();
  const edges = useHexEdges();
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
      <fog attach="fog" args={[palette.fog, 14, 52]} />
      <Parallax animate={animate}>
        <Tunnel animate={animate} palette={palette} count={lowPower ? 9 : 14} />
        <Hexagons count={lowPower ? 7 : 16} edges={edges} animate={animate} palette={palette} />
        <Dust count={lowPower ? 140 : 420} animate={animate} palette={palette} />
        <Ripples edges={edges} enabled={animate} />
      </Parallax>
    </Canvas>
  );
}
