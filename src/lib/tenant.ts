import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function getSession() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return session;
}

export async function getTenantPrisma() {
  const session = await getSession();
  const organizationId = session.user.organizationId;

  return {
    session,
    organizationId,
    prisma,
  };
}
