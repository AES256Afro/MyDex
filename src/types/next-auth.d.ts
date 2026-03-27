import type { Role } from "@/generated/prisma";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      image?: string | null;
      role: Role;
      organizationId: string;
      mfaRequired?: boolean;
    };
  }

  interface User {
    mfaRequired?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    role: Role;
    organizationId: string;
    mfaRequired?: boolean;
  }
}
