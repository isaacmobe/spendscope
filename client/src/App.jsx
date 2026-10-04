import { useAuth } from "./context/auth";
import { FinanceProvider } from "./context/FinanceProvider";
import AuthPage from "./components/AuthPage";
import Dashboard from "./components/Dashboard";
import SceneBackground from "./scene/SceneBackground";

/**
 * App
 * ---
 * Picks the screen: loading while we check the session, the dashboard when logged in,
 * the login page otherwise. The 3D scene sits behind all of them.
 * FinanceProvider is keyed by user id so a different login never sees stale data.
 */
export default function App() {
  const { status, user } = useAuth();

  return (
    <>
      <SceneBackground />
      <div className="relative z-10">
        {status === "loading" ? (
          <p className="py-40 text-center font-mono text-sm text-ink-soft">Connecting...</p>
        ) : user ? (
          <FinanceProvider key={user.id}>
            <Dashboard />
          </FinanceProvider>
        ) : (
          <AuthPage />
        )}
      </div>
    </>
  );
}
