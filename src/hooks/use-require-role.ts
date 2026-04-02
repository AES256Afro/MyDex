"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { Role } from "@/generated/prisma";

const ROLE_LEVEL: Record<string, number> = {
  EMPLOYEE: 1,
  MANAGER: 2,
  ADMIN: 3,
  SUPER_ADMIN: 4,
};

/**
 * Client-side role guard hook. Redirects to /dashboard if the user's role
 * is below the required minimum. Returns { session, authorized, loading }.
 *
 * The hook handles redirection via useEffect. If you want to hide UI while
 * the redirect is pending, place `if (!authorized) return null;` AFTER all
 * other hooks — never before useState/useEffect calls.
 */
export function useRequireRole(minRole: Role) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const loading = status === "loading";

  const userRole = session?.user?.role as string | undefined;
  const userLevel = userRole ? (ROLE_LEVEL[userRole] ?? 0) : 0;
  const requiredLevel = ROLE_LEVEL[minRole] ?? 0;
  const authorized = !loading && !!session && userLevel >= requiredLevel;

  useEffect(() => {
    if (!loading && session && !authorized) {
      router.replace("/dashboard");
    }
  }, [loading, session, authorized, router]);

  return { session, authorized, loading };
}
