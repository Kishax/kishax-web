"use client";

import { signIn } from "next-auth/react";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function SignInContent() {
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [mcAuthData, setMcAuthData] = useState<{
    mcid: string;
    uuid: string;
    authToken: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // URLパラメータからMC認証データを取得
    const mcid = searchParams.get("mcid");
    const uuid = searchParams.get("uuid");
    const authToken = searchParams.get("authToken");

    if (mcid && uuid && authToken) {
      setMcAuthData({ mcid, uuid, authToken });
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // MC認証データがある場合はJWTエンコードして含める
      let mcAuthToken = null;
      if (mcAuthData) {
        try {
          const response = await fetch("/api/auth/encode-mc-data", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(mcAuthData),
          });

          if (response.ok) {
            const { token } = await response.json();
            mcAuthToken = token;
          } else {
            console.warn("Failed to encode MC auth data for credentials login");
          }
        } catch (error) {
          console.warn(
            "Failed to encode MC auth data for credentials login:",
            error,
          );
        }
      }

      const result = await signIn("credentials", {
        username: formData.username,
        password: formData.password,
        mcAuthToken: mcAuthToken,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid username or password");
      } else {
        // MC認証データがある場合はMC連携パラメータ付きでリダイレクト
        const redirectUrl = mcAuthData
          ? "/dashboard?mc_linked=true"
          : "/dashboard";
        router.push(redirectUrl);
      }
    } catch {
      setError("An error occurred during sign in");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: string) => {
    let callbackUrl = "/dashboard";

    // MC認証データがある場合、サーバーサイドでJWTを生成
    if (mcAuthData) {
      try {
        const response = await fetch("/api/auth/encode-mc-data", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(mcAuthData),
        });

        if (response.ok) {
          const { token } = await response.json();
          callbackUrl = `/dashboard?mcAuthToken=${encodeURIComponent(token)}`;
        } else {
          console.warn("Failed to encode MC auth data");
        }
      } catch (error) {
        console.warn("Failed to encode MC auth data:", error);
      }
    }

    signIn(provider, { callbackUrl });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            アカウントにサインイン
          </h2>
          {mcAuthData && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">🎮</span>
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    Minecraft認証済み
                  </p>
                  <p className="text-xs text-blue-700">
                    {mcAuthData.mcid} として認証されています
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div>
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="ユーザー名またはメールアドレス"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                />
              </div>
              <div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="パスワード"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? "サインイン中..." : "サインイン"}
              </button>
            </div>
          </form>
        </div>

        <>
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-50 text-gray-500">
                  または他のサービスで続ける
                </span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
              <button
                onClick={() => handleOAuthSignIn("google")}
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
              >
                Google
              </button>
              <button
                onClick={() => handleOAuthSignIn("discord")}
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
              >
                Discord
              </button>
              <button
                onClick={() => handleOAuthSignIn("twitter")}
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
              >
                Twitter
              </button>
            </div>
          </div>

          <div className="text-center">
            <Link
              href={
                mcAuthData
                  ? `/signup?mcid=${encodeURIComponent(mcAuthData.mcid)}&uuid=${encodeURIComponent(mcAuthData.uuid)}&authToken=${encodeURIComponent(mcAuthData.authToken)}`
                  : "/signup"
              }
              className="text-indigo-600 hover:text-indigo-500"
            >
              アカウントをお持ちでない方はこちら
            </Link>
          </div>
        </>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
