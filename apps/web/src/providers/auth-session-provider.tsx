"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { useEffect, type ReactNode } from "react";

import { useAuthStore, type AuthUser } from "@/stores/auth-store";

interface AuthSessionProviderProps {
  readonly children: ReactNode;
}

function SessionStoreSyncer() {
  const { data: session, status } = useSession();
  const setFromSession = useAuthStore((s) => s.setFromSession);
  const clear = useAuthStore((s) => s.clear);

  useEffect(() => {
    if (status === "loading") {
      setFromSession({ user: null, accessToken: null, isLoading: true });
      return;
    }

    if (status === "unauthenticated") {
      clear();
      return;
    }

    const user: AuthUser = {
      id: session?.user?.id ?? "",
      email: session?.user?.email ?? "",
      name: session?.user?.name ?? null,
      role: session?.user?.role ?? "FREE",
    };

    setFromSession({
      user,
      accessToken: session?.accessToken ?? null,
      isLoading: false,
    });
  }, [clear, session, setFromSession, status]);

  return null;
}

export function AuthSessionProvider({ children }: AuthSessionProviderProps) {
  return (
    <SessionProvider>
      <SessionStoreSyncer />
      {children}
    </SessionProvider>
  );
}
