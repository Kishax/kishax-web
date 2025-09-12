import { auth } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { redirect } from "next/navigation";
import Link from "next/link";
import McAccountLinkForm from "@/components/McAccountLinkForm";

const prisma = new PrismaClient();

export default async function McLinkPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/signin?callbackUrl=/mc/link");
  }

  // Check if user already has a linked MC account
  const existingLink = await prisma.minecraftPlayer.findFirst({
    where: {
      kishaxUserId: session.user.id,
      confirmed: true,
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">
              Minecraftアカウント連携
            </h1>
            <nav className="flex space-x-4">
              <Link
                href="/dashboard"
                className="text-blue-600 hover:text-blue-800"
              >
                ダッシュボード
              </Link>
              <Link href="/" className="text-blue-600 hover:text-blue-800">
                Home
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <span className="text-2xl">👋</span>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {session.user?.username || session.user?.name || "ユーザー"}
                  さん、こんにちは
                </h2>
                <p className="text-gray-600">
                  Minecraftアカウント連携ページへようこそ
                </p>
              </div>
            </div>
          </div>
        </div>

        {existingLink ? (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">✅</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-green-900 mb-2">
                  連携完了済み
                </h3>
                <p className="text-green-700 mb-4">
                  あなたのKishaxアカウントは既にMinecraftプレイヤーと連携されています。
                </p>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-green-900 mb-2">連携情報</h4>
                  <div className="space-y-1 text-sm text-green-800">
                    <p>
                      <strong>MCID:</strong> {existingLink.mcid}
                    </p>
                    <p>
                      <strong>UUID:</strong> {existingLink.uuid}
                    </p>
                    <p>
                      <strong>連携日時:</strong>{" "}
                      {new Date(existingLink.updatedAt).toLocaleString("ja-JP")}
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">
                      🎁 利用可能な機能
                    </h4>
                    <ul className="space-y-1 text-sm text-blue-800">
                      <li className="flex items-center">
                        <span className="text-green-500 mr-2">✓</span>
                        イメージマップの発行（1日5枚まで）
                      </li>
                      <li className="flex items-center">
                        <span className="text-green-500 mr-2">✓</span>
                        サーバーの起動リクエスト（Discordを通じて）
                      </li>
                      <li className="flex items-center">
                        <span className="text-yellow-500 mr-2">⏳</span>
                        プレイヤー統計の表示（準備中）
                      </li>
                      <li className="flex items-center">
                        <span className="text-yellow-500 mr-2">⏳</span>
                        サーバー状況の監視（準備中）
                      </li>
                    </ul>
                  </div>
                  <div className="flex space-x-3">
                    <Link
                      href="/dashboard"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      ダッシュボードへ
                    </Link>
                    <Link
                      href="/mc/auth"
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      MC認証ページ
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-start space-x-4 mb-6">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl">🔗</span>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Minecraftアカウントと連携しよう
                  </h3>
                  <p className="text-gray-600">
                    MC認証済みのプレイヤーとKishaxアカウントを連携することで、様々な便利機能をご利用いただけます。
                  </p>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <span className="text-yellow-600">⚠️</span>
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-yellow-800">
                      重要：事前にMC認証を完了してください
                    </h4>
                    <div className="text-sm text-yellow-700 mt-1">
                      <p>
                        この連携機能は、既にMC認証（Web認証）を完了しているプレイヤー向けです。
                      </p>
                      <p>
                        まだMC認証を完了していない場合は、
                        <Link
                          href="/mc/auth"
                          className="underline hover:no-underline"
                        >
                          こちら
                        </Link>
                        から認証を行ってください。
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <McAccountLinkForm
              onLinkSuccess={() => {
                // 成功時にページをリロード
                window.location.reload();
              }}
            />

            <div className="bg-white shadow rounded-lg p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">
                🎁 連携後に利用可能になる機能
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h5 className="font-medium text-green-900 mb-2">
                    ✅ 即座に利用可能
                  </h5>
                  <ul className="space-y-1 text-sm text-green-800">
                    <li>• イメージマップの発行（1日5枚まで）</li>
                    <li>• サーバーの起動リクエスト</li>
                    <li>• Discord経由での各種操作</li>
                  </ul>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h5 className="font-medium text-yellow-900 mb-2">
                    ⏳ 開発中
                  </h5>
                  <ul className="space-y-1 text-sm text-yellow-800">
                    <li>• プレイヤー統計の詳細表示</li>
                    <li>• リアルタイムサーバー監視</li>
                    <li>• 自動バックアップ管理</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
