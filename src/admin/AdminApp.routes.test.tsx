import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { can, type CmsRole } from "@/lib/permissions";
import type { AuthValue } from "@/contexts/AuthContext";

// Controllable auth state. The real AuthContext (and Supabase client) is never loaded.
let mockAuth: Pick<AuthValue, "status" | "role" | "error" | "sessionExpired"> & { editorsCanPublish: boolean };
const signOut = vi.fn();
const retry = vi.fn();

vi.mock("@/contexts/AuthContext", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({
    ...mockAuth,
    user: mockAuth.status === "authenticated" ? { id: "u1", email: "test@example.invalid" } : null,
    roleSource: "rpc",
    signIn: vi.fn(async () => ({ error: "Invalid email or password." })),
    signOut,
    retry,
    can: (c: Parameters<typeof can>[1]) => can(mockAuth.role, c, { editorsCanPublish: mockAuth.editorsCanPublish }),
  }),
}));

// Stub Supabase so page modules can be imported without environment variables.
vi.mock("@/integrations/supabase/client", () => {
  const emptyResult = { data: [], count: 0, error: null };
  const makeBuilder = () => {
    const promise = Promise.resolve(emptyResult);
    return {
      select: () => makeBuilder(),
      eq: () => makeBuilder(),
      order: () => makeBuilder(),
      limit: () => makeBuilder(),
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
      then: promise.then.bind(promise),
      catch: promise.catch.bind(promise),
      finally: promise.finally.bind(promise),
    };
  };
  return {
    supabase: {
      from: () => makeBuilder(),
      rpc: async () => ({ data: null, error: null }),
      auth: { signOut: vi.fn(), updateUser: vi.fn() },
      functions: { invoke: vi.fn() },
    },
  };
});

import { Route, Routes } from "react-router-dom";
import AdminApp from "@/admin/AdminApp";

function setAuth(status: AuthValue["status"], role: CmsRole | null, extra: Partial<typeof mockAuth> = {}) {
  mockAuth = { status, role, error: null, sessionExpired: false, editorsCanPublish: false, ...extra };
}

const renderAt = (path: string) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/admin/*" element={<AdminApp />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe("admin route guards (AUTH-004, ROLE-004, SEC-001 UI layer)", () => {
  beforeEach(() => {
    signOut.mockReset();
    retry.mockReset();
  });

  it("AUTH-004: unauthenticated user visiting a protected route is sent to login", () => {
    setAuth("unauthenticated", null);
    renderAt("/admin/pages");
    expect(screen.getByRole("heading", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.queryByText("Pages")).not.toBeInTheDocument();
  });

  it("AUTH-004: unauthenticated user cannot reach the Users page", () => {
    setAuth("unauthenticated", null);
    renderAt("/admin/users");
    expect(screen.getByRole("heading", { name: /sign in/i })).toBeInTheDocument();
  });

  it("shows a loading state and no protected content while the session is checked", () => {
    setAuth("loading", null);
    renderAt("/admin/users");
    expect(screen.getByRole("status")).toHaveTextContent(/checking your session/i);
    expect(screen.queryByText(/create editor accounts/i)).not.toBeInTheDocument();
  });

  it("shows an error state with retry when the account cannot be verified", () => {
    setAuth("error", null, { error: "network down" });
    renderAt("/admin/pages");
    expect(screen.getByRole("alert")).toHaveTextContent(/network down/i);
    screen.getByRole("button", { name: /try again/i }).click();
    expect(retry).toHaveBeenCalled();
  });

  it("signed in but with no CMS role: no access, sign-out offered", () => {
    setAuth("authenticated", null);
    renderAt("/admin/pages");
    expect(screen.getByRole("heading", { name: /no cms access/i })).toBeInTheDocument();
    screen.getByRole("button", { name: /sign out/i }).click();
    expect(signOut).toHaveBeenCalled();
  });

  it("ROLE-004: editor is denied the Users page", () => {
    setAuth("authenticated", "editor");
    renderAt("/admin/users");
    expect(screen.getByRole("heading", { name: /don't have access/i })).toBeInTheDocument();
    expect(screen.queryByText(/create editor accounts/i)).not.toBeInTheDocument();
  });

  it("editor is denied the Activity log", () => {
    setAuth("authenticated", "editor");
    renderAt("/admin/activity");
    expect(screen.getByRole("heading", { name: /don't have access/i })).toBeInTheDocument();
  });

  it("editor is denied patient inboxes (appointments)", () => {
    setAuth("authenticated", "editor");
    renderAt("/admin/appointments");
    expect(screen.getByRole("heading", { name: /don't have access/i })).toBeInTheDocument();
  });

  it("ROLE-005 (UI only): super admin can open the Users page", () => {
    setAuth("authenticated", "super_admin");
    renderAt("/admin/users");
    expect(screen.getByRole("heading", { name: /users & role management/i })).toBeInTheDocument();
    expect(screen.queryByText(/don't have access/i)).not.toBeInTheDocument();
  });

  it("ROLE-001 (UI only): editor can open Pages and Media", () => {
    setAuth("authenticated", "editor");
    renderAt("/admin/pages");
    expect(screen.getByRole("heading", { name: /pages & homepage sections/i })).toBeInTheDocument();
  });

  it("editor navigation does not list Users or Activity log", () => {
    setAuth("authenticated", "editor");
    renderAt("/admin/pages");
    const nav = screen.getByRole("navigation", { name: "Admin" });
    expect(nav).toHaveTextContent("Media library");
    expect(nav).not.toHaveTextContent("Users");
    expect(nav).not.toHaveTextContent("Activity log");
  });

  it("login page redirects an already-authenticated editor into the admin area", () => {
    setAuth("authenticated", "editor");
    renderAt("/admin/login");
    expect(screen.queryByRole("heading", { name: /sign in/i })).not.toBeInTheDocument();
  });

  it("login page shows AccessDenied (No CMS access) when authenticated without a CMS role", () => {
    setAuth("authenticated", null);
    renderAt("/admin/login");
    expect(screen.getByRole("heading", { name: /no cms access/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /sign in/i })).not.toBeInTheDocument();
    screen.getByRole("button", { name: /sign out/i }).click();
    expect(signOut).toHaveBeenCalled();
  });

  it("login page shows verification error with retry and sign-out when role RPC fails (e.g. uninitialized DB)", () => {
    setAuth("error", null, { error: "Could not find the function public.has_role in the schema cache" });
    renderAt("/admin/login");
    expect(screen.getByRole("heading", { name: /couldn't verify your account/i })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(/public\.has_role/i);
    expect(screen.queryByRole("heading", { name: /sign in/i })).not.toBeInTheDocument();
    screen.getByRole("button", { name: /try again/i }).click();
    expect(retry).toHaveBeenCalled();
    screen.getByRole("button", { name: /sign out/i }).click();
    expect(signOut).toHaveBeenCalled();
  });

  it("login page tells the user when the previous session expired", () => {
    setAuth("unauthenticated", null, { sessionExpired: true });
    renderAt("/admin/login");
    expect(screen.getByRole("status")).toHaveTextContent(/session has ended/i);
  });
});
