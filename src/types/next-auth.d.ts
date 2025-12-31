import "next-auth";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    id?: string;
    needsUsername?: boolean;
    username?: string | null;
  }

  interface Session {
    user: {
      id?: string;
      needsUsername?: boolean;
      username?: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    needsUsername?: boolean;
    username?: string | null;
  }
}
