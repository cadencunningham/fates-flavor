import { Route, Routes } from "react-router-dom";
import { Home } from "./routes/Home";
import { NotFound } from "./routes/NotFound";

/**
 * Route table only — no router provider here, so tests can mount this under
 * whichever router (MemoryRouter, HashRouter) fits the scenario.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export function App() {
  return (
    <div className="min-h-screen bg-surface text-text">
      <header className="border-b border-border bg-surface-raised px-md py-sm">
        <span className="text-lg font-semibold">Fate&apos;s Flavor</span>
      </header>
      <main className="px-md py-lg">
        <AppRoutes />
      </main>
    </div>
  );
}
