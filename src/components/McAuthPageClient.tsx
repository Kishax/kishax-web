"use client";

import Link from "next/link";
import { McAuthPageData } from "@/lib/schemas";
import McAuthForm from "@/components/McAuthForm";

interface McAuthPageClientProps {
  pageData: McAuthPageData;
  showAccountLinking?: boolean;
}

export default function McAuthPageClient({
  pageData,
  showAccountLinking,
}: McAuthPageClientProps) {
  const showServerJoinMessage = !pageData.isAuth && !pageData.mcAuth;

  const handleCreateAccountClick = () => {
    // MC認証データをパラメータとして既存のサインアップページに遷移
    if (
      pageData.mcAuth &&
      pageData.mcid &&
      pageData.uuid &&
      pageData.authToken
    ) {
      const params = new URLSearchParams({
        mcid: pageData.mcid,
        uuid: pageData.uuid,
        authToken: pageData.authToken,
      });
      window.location.href = `/signup?${params.toString()}`;
    } else {
      // 通常のサインアップページに遷移
      window.location.href = "/signup";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">
              Minecraft Authentication
            </h1>
            <nav className="flex space-x-4">
              <Link href="/" className="text-blue-600 hover:text-blue-800">
                Home
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="mb-6">
              {pageData.isAuth ? (
                <p className="text-sm text-gray-600">
                  {pageData.username}さん、ようこそ
                </p>
              ) : (
                <div className="flex items-center space-x-2">
                  <p className="text-sm text-gray-600">
                    {pageData.username}さん、ようこそ &gt;&gt;
                  </p>
                  <Link
                    href="/signup"
                    className="text-blue-600 hover:text-blue-800 text-sm underline"
                  >
                    サインアップはこちら
                  </Link>
                </div>
              )}
            </div>

            {/* Messages */}
            {pageData.successMessage && (
              <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
                {pageData.successMessage.map((msg, index) => (
                  <p key={index}>{msg}</p>
                ))}
              </div>
            )}

            {pageData.errorMessage && (
              <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                {pageData.errorMessage.map((msg, index) => (
                  <p key={index}>{msg}</p>
                ))}
              </div>
            )}

            {pageData.infoMessage && (
              <div className="mb-4 p-4 bg-blue-100 border border-blue-400 text-blue-700 rounded">
                {pageData.infoMessage.map((msg, index) => (
                  <p key={index}>{msg}</p>
                ))}
              </div>
            )}

            {/* Kishax Account Linking Invitation */}
            {showAccountLinking && (
              <div className="mb-8 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <span className="text-2xl">🚀</span>
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-lg font-medium text-blue-900 mb-2">
                      Kishaxアカウントと連携しませんか？
                    </h3>
                    <p className="text-blue-700 mb-4">
                      MC認証が完了しました！Kishaxアカウントと連携すると、さらに多くの機能をご利用いただけます。
                    </p>
                    <div className="bg-white rounded-lg p-4 mb-4">
                      <h4 className="font-semibold text-gray-900 mb-2">
                        🎁 連携特典
                      </h4>
                      <ul className="space-y-1 text-sm text-gray-700">
                        <li className="flex items-center">
                          <span className="text-green-500 mr-2">✓</span>
                          イメージマップの発行（1日5枚まで）
                        </li>
                        <li className="flex items-center">
                          <span className="text-green-500 mr-2">✓</span>
                          サーバの起動リクエスト（Discordを通じて）
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

                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={handleCreateAccountClick}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        {pageData.mcAuth
                          ? "🔗 アカウント作成で連携"
                          : "アカウント作成で連携"}
                      </button>
                      <Link
                        href="/signin"
                        className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        既存アカウントでログイン
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Server Join Message for non-authenticated users */}
            {showServerJoinMessage && (
              <div className="mb-6">
                <div className="bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-200 rounded-xl p-6 shadow-lg">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-2xl">🎮</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-green-800 mb-3">
                        🚀 Minecraftサーバーに参加して認証を始めよう！
                      </h3>
                      <div className="space-y-4">
                        <div className="bg-white rounded-lg p-4 border border-green-200 shadow-sm">
                          <div className="flex items-center space-x-3 mb-2">
                            <span className="flex items-center justify-center w-6 h-6 bg-green-500 text-white text-sm font-bold rounded-full">
                              1
                            </span>
                            <span className="font-medium text-gray-800">
                              サーバーに参加
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 ml-9">
                            マイクラを起動してサーバーアドレス{" "}
                            <code className="px-2 py-1 bg-gray-100 rounded text-green-600 font-mono text-xs border">
                              mc.kishax.net
                            </code>{" "}
                            に参加してください
                          </p>
                        </div>

                        <div className="bg-white rounded-lg p-4 border border-green-200 shadow-sm">
                          <div className="flex items-center space-x-3 mb-2">
                            <span className="flex items-center justify-center w-6 h-6 bg-blue-500 text-white text-sm font-bold rounded-full">
                              2
                            </span>
                            <span className="font-medium text-gray-800">
                              認証コマンド実行
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 ml-9">
                            チャットで{" "}
                            <code className="px-2 py-1 bg-gray-100 rounded text-blue-600 font-mono text-xs border">
                              /kishax confirm
                            </code>{" "}
                            コマンドを実行してください
                          </p>
                        </div>

                        <div className="bg-white rounded-lg p-4 border border-green-200 shadow-sm">
                          <div className="flex items-center space-x-3 mb-2">
                            <span className="flex items-center justify-center w-6 h-6 bg-purple-500 text-white text-sm font-bold rounded-full">
                              3
                            </span>
                            <span className="font-medium text-gray-800">
                              認証URLでアクセス
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 ml-9">
                            表示された認証URLをクリックまたはQRコードをスキャンして、このページに戻ってきてください
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <span className="text-yellow-600">💡</span>
                          <span className="text-sm font-medium text-yellow-800">
                            ヒント
                          </span>
                        </div>
                        <p className="text-xs text-yellow-700 mt-1">
                          統合版（スマホ・タブレット）の方は、QRコードを右クリックして認証URLを取得できます
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mb-6">
              <p className="text-gray-700">
                サーバーに参加し、認証コードを入力してWEB認証を完了してください。
              </p>
            </div>

            <McAuthForm pageData={pageData} />
          </div>
        </div>
      </main>
    </div>
  );
}
