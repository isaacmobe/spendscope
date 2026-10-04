import { Component, lazy, Suspense, useState } from "react";
import { useTheme } from "../context/theme";
import { useMediaQuery } from "../hooks/useMediaQuery";

// Three.js is large, so it loads in a separate chunk AFTER the interface is usable.
const AmbientScene = lazy(() => import("./AmbientScene"));

// If WebGL is missing or the scene crashes, the app simply shows the plain paper background.
class SceneBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error) {
    console.warn("3D background disabled:", error.message);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function hasWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export default function SceneBackground() {
  const [supported] = useState(hasWebGL);
  const smallScreen = useMediaQuery("(max-width: 767px)");
  const { dark } = useTheme();
  if (!supported) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
      <SceneBoundary>
        <Suspense fallback={null}>
          <AmbientScene lowPower={smallScreen} dark={dark} />
        </Suspense>
      </SceneBoundary>
    </div>
  );
}
