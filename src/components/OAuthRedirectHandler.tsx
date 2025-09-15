"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

export function OAuthRedirectHandler() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (status === "loading") return;

    if (status === "authenticated" && session?.user?.email) {
      // Check for MC auth token in URL parameters
      const mcAuthToken = searchParams.get("mcAuthToken");

      if (mcAuthToken) {
        // Process MC linking with JWT token
        handleMcAuthLink(mcAuthToken);
        // URLからパラメータを削除（セキュリティのため）
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete("mcAuthToken");
        window.history.replaceState({}, "", newUrl.toString());
        return;
      }

      // Normal OAuth flow - check if user needs to set username
      checkUserStatus();
    }
  }, [status, session, router, searchParams]);

  const handleMcAuthLink = async (mcAuthToken: string) => {
    try {
      const response = await fetch("/api/auth/oauth-mc-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mcAuthToken }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.linked) {
          // MC account linked successfully
          router.push("/dashboard?mc_linked=true");
        } else {
          // Continue with normal flow
          checkUserStatus();
        }
      } else {
        console.warn("Failed to link MC account after OAuth");
        checkUserStatus();
      }
    } catch (error) {
      console.error("Error linking MC account:", error);
      checkUserStatus();
    }
  };

  const checkUserStatus = async () => {
    try {
      const response = await fetch("/api/auth/user-status");
      const data = await response.json();
      if (!data.hasUsername) {
        router.push("/auth/setup-username");
      }
    } catch (error) {
      // If API fails, continue normally
      console.warn("Failed to check user status:", error);
    }
  };

  return null;
}
