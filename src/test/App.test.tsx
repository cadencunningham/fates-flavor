import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { App, AppRoutes } from "../app/App";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

describe("app shell", () => {
  it("test_DW_1_2_renders_shell_chrome_around_routed_content", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );

    // Header chrome (brand) is rendered by App itself, not by the routed page.
    expect(
      within(screen.getByRole("banner")).getByText("Fate's Flavor"),
    ).toBeInTheDocument();
    // Routed content (Home) is still rendered inside the shell.
    expect(
      screen.getByRole("heading", { name: "Fate's Flavor" }),
    ).toBeInTheDocument();
  });
});

describe("app shell routing", () => {
  it("test_DW_1_2_renders_home_at_root", () => {
    renderAt("/");

    expect(
      screen.getByRole("heading", { name: "Fate's Flavor" }),
    ).toBeInTheDocument();
  });

  it("test_DW_1_2_renders_not_found_at_unknown_hash_route", () => {
    renderAt("/does-not-exist");

    expect(
      screen.getByRole("heading", { name: "Page not found" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to browse" })).toHaveAttribute(
      "href",
      "/",
    );
  });
});
