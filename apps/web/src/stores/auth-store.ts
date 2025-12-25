import { create } from "zustand";

export type UserRole = "FREE" | "PRO" | "ADMIN";

export interface AuthUser {
  readonly id: string;
  readonly email: string;
  readonly name: string | null;
  readonly role: UserRole;
}

interface AuthStoreState {
  readonly user: AuthUser | null;
  readonly accessToken: string | null;
  readonly isLoading: boolean;
  readonly isAuthenticated: boolean;
  readonly isAdmin: boolean;
  setFromSession: (params: {
    readonly user: AuthUser | null;
    readonly accessToken: string | null;
    readonly isLoading: boolean;
  }) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthStoreState>((set) => ({
  user: null,
  accessToken: null,
  isLoading: true,
  isAuthenticated: false,
  isAdmin: false,
  setFromSession: ({ user, accessToken, isLoading }) =>
    set({
      user,
      accessToken,
      isLoading,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === "ADMIN",
    }),
  clear: () =>
    set({
      user: null,
      accessToken: null,
      isLoading: false,
      isAuthenticated: false,
      isAdmin: false,
    }),
}));
