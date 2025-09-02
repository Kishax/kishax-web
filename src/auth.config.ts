import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/signin",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      // Always allow access to the home page and mc/auth page
      if (nextUrl.pathname === "/" || nextUrl.pathname === "/mc/auth") {
        return true;
      }

      // For dashboard and other protected routes, require authentication
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");

      if (isOnDashboard) {
        return isLoggedIn;
      }

      return true;
    },
  },
  providers: [
    // プロバイダーの定義はメインのauth.tsに置くため、ここは空の配列のままにします。
    // middlewareはプロバイダー設定を必要としないため、これで問題ありません。
  ],
  trustHost: true,
} satisfies NextAuthConfig;
