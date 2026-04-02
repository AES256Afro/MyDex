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
 * Usage:
 *   const { authorized } = useRequireRole("ADMIN");
 *   if (!authorized) return null;
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
