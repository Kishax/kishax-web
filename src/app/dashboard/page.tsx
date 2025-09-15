import { auth } from "@/lib/auth";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { DashboardClient } from "@/components/DashboardClient";

export default async function DashboardPage() {
  const session = await auth();

  // Allow access without session, but show sign-in prompt
  const isLoggedIn = !!session;

  // Get user's MC authentication status only if logged in
  const mcConnections = isLoggedIn
    ? await prisma.minecraftPlayer.findMany({
        where: {
          kishaxUserId: session.user.id,
          confirmed: true,
        },
      })
    : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardClient />
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <nav className="flex space-x-4">
              <Link href="/" className="text-blue-600 hover:text-blue-800">
                Home
              </Link>
              <Link
                href="/mc/auth"
                className="text-blue-600 hover:text-blue-800"
              >
                MC認証
              </Link>
              <Link
                href="/api/auth/signout?callbackUrl=/"
                className="text-red-600 hover:text-red-800"
              >
                Logout
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            {isLoggedIn ? (
              <h2 className="text-2xl font-bold text-gray-900">
                ようこそ、
                {session.user?.username ||
                  session.user?.name ||
                  "[ユーザーID未設定]"}
                さん
              </h2>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h2 className="text-2xl font-bold text-blue-900 mb-2">
                  KishaXへようこそ！
                </h2>
                <p className="text-blue-700 mb-4">
                  アカウントにログインして、すべての機能をご利用ください。
                </p>
                <Link
                  href="/signin"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  ログイン
                </Link>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* MC Authentication Card */}
            <Link
              href="/mc/auth"
              className="relative group bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-green-500 rounded-lg shadow hover:shadow-md hover:from-green-100 hover:to-green-200 transition-all duration-200"
            >
              <div>
                <span className="rounded-lg inline-flex p-3 bg-green-500 text-white group-hover:bg-green-600">
                  🎮
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-lg font-medium text-green-800">
                  Minecraft認証
                </h3>
                <p className="mt-2 text-sm text-green-600">
                  {mcConnections.length > 0
                    ? `${mcConnections.length}個のアカウント連携済み - 新しい認証を追加`
                    : "Minecraftサーバーで認証を完了してください"}
                </p>
                <div className="mt-3 text-xs text-green-500 font-medium">
                  認証ページへ →
                </div>
              </div>
            </Link>

            {/* Account Management Card */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-2xl">👤</span>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        アカウント管理
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        プロフィール設定
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-5 py-3">
                <div className="text-sm">
                  <span className="font-medium text-gray-600">
                    設定画面 (準備中)
                  </span>
                </div>
              </div>
            </div>

            {/* Server Features Card */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-2xl">⚡</span>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        サーバー機能
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {mcConnections.length > 0 ? "利用可能" : "MC認証が必要"}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-5 py-3">
                <div className="text-sm">
                  <span className="font-medium text-gray-600">
                    機能一覧 (準備中)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* MC Connections List */}
          {mcConnections.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                連携済みMinecraftアカウント
              </h3>
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {mcConnections.map((connection) => (
                    <li key={connection.id}>
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <span className="text-lg mr-3">🎯</span>
                            <div>
                              <p className="text-sm font-medium text-green-600">
                                {connection.mcid}
                              </p>
                              <p className="text-xs text-gray-500">
                                UUID: {connection.uuid}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              認証済み
                            </span>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Coming Soon Features */}
          <div className="mt-8">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              今後追加予定の機能
            </h3>
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <ul className="space-y-3">
                  <li className="flex items-center">
                    <span className="text-green-500 mr-3">✓</span>
                    <span className="text-gray-700">
                      イメージマップの発行（1日5枚まで）
                    </span>
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-500 mr-3">✓</span>
                    <span className="text-gray-700">
                      サーバの起動リクエスト（Discordを通じて）
                    </span>
                  </li>
                  <li className="flex items-center">
                    <span className="text-yellow-500 mr-3">⏳</span>
                    <span className="text-gray-700">プレイヤー統計の表示</span>
                  </li>
                  <li className="flex items-center">
                    <span className="text-yellow-500 mr-3">⏳</span>
                    <span className="text-gray-700">サーバー状況の監視</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
