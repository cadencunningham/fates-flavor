import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <section>
      <h1 className="text-2xl font-bold text-text">Page not found</h1>
      <p className="mt-sm text-text-muted">
        We couldn&apos;t find what you were looking for.
      </p>
      <Link
        to="/"
        className="mt-md inline-block rounded-[var(--radius)] bg-accent px-md py-sm text-accent-contrast"
      >
        Back to browse
      </Link>
    </section>
  );
}
