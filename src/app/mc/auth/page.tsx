import { auth } from "@/lib/auth"
import { Session } from "next-auth"
import { PrismaClient } from "@prisma/client"
import McAuthForm from "@/components/McAuthForm"
import { McAuthPageData } from "@/lib/schemas"
import jwt from "jsonwebtoken"
import Link from "next/link"

const prisma = new PrismaClient()

interface PageProps {
  searchParams: Promise<{ n?: string; t?: string }>
}

export default async function McAuthPage({ searchParams }: PageProps) {
  const session = await auth()
  const resolvedSearchParams = await searchParams
  const memberId = resolvedSearchParams.n ? parseInt(resolvedSearchParams.n) : undefined
  const authToken = resolvedSearchParams.t

  // Initialize page data
  let pageData: McAuthPageData = {
    isAuth: !!session,
    username: session?.user?.username || "[ユーザーID未設定]",
    mcAuth: false,
    successMessage: undefined,
    errorMessage: undefined,
    infoMessage: undefined
  }

  // If not authenticated, handle token-based auth or show token required message  
  if (!session) {
    if (authToken) {
      return await handleTokenAuthNoSession(authToken, pageData)
    }
    // Custom info message component will be handled in the component
    return <McAuthPageComponent pageData={pageData} />
  }

  // Get user from database
  const user = await prisma.user.findUnique({
    where: { id: session?.user?.id || '' }
  })

  if (!user) {
    pageData.errorMessage = ["ユーザー情報が見つかりません。"]
    return <McAuthPageComponent pageData={pageData} />
  }

  pageData.username = user.username || "[ユーザーID未設定]"

  // Handle token-based authentication
  if (authToken) {
    return await handleTokenAuth(authToken, session, pageData)
  }

  // If no member ID provided, show initial message
  if (!memberId) {
    pageData.infoMessage = ["サーバーに参加しよう！"]
    return <McAuthPageComponent pageData={pageData} />
  }

  // Get Minecraft member data
  const mcuser = await prisma.member.findUnique({
    where: { id: memberId }
  })

  if (!mcuser) {
    pageData.errorMessage = ["不正なアクセスです。"]
    return <McAuthPageComponent pageData={pageData} />
  }

  // Check if already confirmed
  if (mcuser.confirm) {
    pageData.infoMessage = ["認証済みユーザーです。"]
    return <McAuthPageComponent pageData={pageData} />
  }

  // Check if OTP is set
  if (!mcuser.secret2) {
    pageData.errorMessage = [
      "ワンタイムパスワードが設定されていません。",
      "サーバーで/retryコマンドよりワンタイムパスワードを生成してください。",
      "生成後、ページのリロードが必要です。"
    ]
    return <McAuthPageComponent pageData={pageData} />
  }

  // Check server status and online players
  const serverStatus = await prisma.status.findUnique({
    where: { name: "proxy" }
  })

  if (!serverStatus?.playerList) {
    pageData.errorMessage = ["プレイヤーがオンラインでないため、WEB認証ができません。"]
    return <McAuthPageComponent pageData={pageData} />
  }

  const onlinePlayers = serverStatus.playerList.split(",")
  if (!onlinePlayers.includes(mcuser.name)) {
    pageData.errorMessage = ["プレイヤーがオンラインでないため、WEB認証ができません。"]
    return <McAuthPageComponent pageData={pageData} />
  }

  // Generate JWT token for authentication
  try {
    const payload = {
      username: user.username || "[ユーザーID未設定]",
      mcid: mcuser.name,
      uuid: mcuser.uuid
    }
    
    const token = jwt.sign(payload, process.env.NEXTAUTH_SECRET!, { expiresIn: '1h' })

    pageData = {
      ...pageData,
      mcid: mcuser.name,
      uuid: mcuser.uuid,
      mcAuth: true,
      token,
      successMessage: ["プレイヤー情報が自動入力されました。"]
    }
  } catch {
    pageData.errorMessage = ["トークンの生成に失敗しました。"]
    return <McAuthPageComponent pageData={pageData} />
  }

  return <McAuthPageComponent pageData={pageData} />
}

async function handleTokenAuth(authToken: string, session: Session, pageData: McAuthPageData) {
  try {
    // Get Minecraft player data by auth_token
    const mcuser = await prisma.minecraftPlayer.findFirst({
      where: { authToken: authToken }
    })

    if (!mcuser) {
      pageData.errorMessage = ["不正なトークンです。"]
      return <McAuthPageComponent pageData={pageData} />
    }

    // Check if token is expired
    if (!mcuser.tokenExpires || new Date() > new Date(mcuser.tokenExpires)) {
      pageData.errorMessage = ["トークンが期限切れです。サーバーで再度認証を開始してください。"]
      return <McAuthPageComponent pageData={pageData} />
    }

    // Check if already confirmed
    if (mcuser.confirmed) {
      pageData.infoMessage = ["認証済みユーザーです。"]
      return <McAuthPageComponent pageData={pageData} />
    }

    // Note: OTP check is now handled by MC side before sending auth token
    // Web side assumes token is valid and player is ready for authentication

    // Check server status and online players
    const serverStatus = await prisma.status.findUnique({
      where: { name: "proxy" }
    })

    if (!serverStatus?.playerList) {
      pageData.errorMessage = ["プレイヤーがオンラインでないため、WEB認証ができません。"]
      return <McAuthPageComponent pageData={pageData} />
    }

    const onlinePlayers = serverStatus.playerList.split(",")
    if (!onlinePlayers.includes(mcuser.mcid)) {
      pageData.errorMessage = ["プレイヤーがオンラインでないため、WEB認証ができません。"]
      return <McAuthPageComponent pageData={pageData} />
    }

    // Generate JWT token for authentication
    try {
      const user = await prisma.user.findUnique({
        where: { id: session?.user?.id || '' }
      })

      const payload = {
        username: user?.username || "[ユーザーID未設定]",
        mcid: mcuser.mcid,
        uuid: mcuser.uuid
      }
      
      const token = jwt.sign(payload, process.env.NEXTAUTH_SECRET!, { expiresIn: '1h' })

      pageData = {
        ...pageData,
        mcid: mcuser.mcid,
        uuid: mcuser.uuid,
        mcAuth: true,
        token,
        successMessage: ["トークンによる認証を開始しました。プレイヤー情報が自動入力されました。"]
      }
    } catch {
      pageData.errorMessage = ["トークンの生成に失敗しました。"]
      return <McAuthPageComponent pageData={pageData} />
    }

    return <McAuthPageComponent pageData={pageData} />
  } catch (error) {
    console.error("Token auth error:", error)
    pageData.errorMessage = ["認証処理中にエラーが発生しました。"]
    return <McAuthPageComponent pageData={pageData} />
  }
}

async function handleTokenAuthNoSession(authToken: string, pageData: McAuthPageData) {
  try {
    // Get Minecraft player data by auth_token
    const mcuser = await prisma.minecraftPlayer.findFirst({
      where: { authToken: authToken }
    })

    if (!mcuser) {
      pageData.errorMessage = ["不正なトークンです。"]
      return <McAuthPageComponent pageData={pageData} />
    }

    // Check if token is expired
    if (!mcuser.tokenExpires || new Date() > new Date(mcuser.tokenExpires)) {
      pageData.errorMessage = ["トークンが期限切れです。サーバーで再度認証を開始してください。"]
      return <McAuthPageComponent pageData={pageData} />
    }

    // Check if already confirmed
    if (mcuser.confirmed) {
      pageData.infoMessage = ["認証済みユーザーです。"]
      
      // If user is connected to a Kishax account, show connection info
      if (mcuser.kishaxUserId) {
        const connectedUser = await prisma.user.findUnique({
          where: { id: mcuser.kishaxUserId },
          select: { username: true, name: true }
        })
        
        if (connectedUser) {
          pageData.successMessage = [
            `Kishaxアカウント「${connectedUser.username || connectedUser.name}」と連携済みです。`
          ]
        }
      } else {
        // Show account linking invitation for authenticated users
        pageData.infoMessage = [
          "MC認証完了済みです！",
          "Kishaxアカウントと連携すると、さらに多くの機能をご利用いただけます。"
        ]
      }
      
      return <McAuthPageComponent pageData={pageData} showAccountLinking={!mcuser.kishaxUserId} />
    }

    // Note: OTP check is now handled by MC side before sending auth token
    // Web side assumes token is valid and player is ready for authentication

    // Check server status and online players
    const serverStatus = await prisma.status.findUnique({
      where: { name: "proxy" }
    })

    if (!serverStatus?.playerList) {
      pageData.errorMessage = ["プレイヤーがオンラインでないため、WEB認証ができません。"]
      return <McAuthPageComponent pageData={pageData} />
    }

    const onlinePlayers = serverStatus.playerList.split(",")
    if (!onlinePlayers.includes(mcuser.mcid)) {
      pageData.errorMessage = ["プレイヤーがオンラインでないため、WEB認証ができません。"]
      return <McAuthPageComponent pageData={pageData} />
    }

    // Generate JWT token for authentication (without user session)
    try {
      const payload = {
        username: "[ゲスト]", // No user session
        mcid: mcuser.mcid,
        uuid: mcuser.uuid
      }
      
      const token = jwt.sign(payload, process.env.NEXTAUTH_SECRET!, { expiresIn: '1h' })

      pageData = {
        ...pageData,
        mcid: mcuser.mcid,
        uuid: mcuser.uuid,
        mcAuth: true,
        token,
        successMessage: ["トークンによる認証を開始しました。プレイヤー情報が自動入力されました。"],
        infoMessage: ["ログインなしでMC認証を行っています。"]
      }
    } catch {
      pageData.errorMessage = ["トークンの生成に失敗しました。"]
      return <McAuthPageComponent pageData={pageData} />
    }

    return <McAuthPageComponent pageData={pageData} />
  } catch (error) {
    console.error("Token auth no session error:", error)
    pageData.errorMessage = ["認証処理中にエラーが発生しました。"]
    return <McAuthPageComponent pageData={pageData} />
  }
}

function McAuthPageComponent({ pageData, showAccountLinking }: { pageData: McAuthPageData; showAccountLinking?: boolean }) {
  const showServerJoinMessage = !pageData.isAuth && !pageData.mcAuth
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">Minecraft Authentication</h1>
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
                  <Link href="/signup" className="text-blue-600 hover:text-blue-800 text-sm underline">
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
                            <span className="flex items-center justify-center w-6 h-6 bg-green-500 text-white text-sm font-bold rounded-full">1</span>
                            <span className="font-medium text-gray-800">サーバーに参加</span>
                          </div>
                          <p className="text-sm text-gray-600 ml-9">
                            マイクラを起動してサーバーアドレス <code className="px-2 py-1 bg-gray-100 rounded text-green-600 font-mono text-xs border">mc.kishax.net</code> に参加してください
                          </p>
                        </div>

                        <div className="bg-white rounded-lg p-4 border border-green-200 shadow-sm">
                          <div className="flex items-center space-x-3 mb-2">
                            <span className="flex items-center justify-center w-6 h-6 bg-blue-500 text-white text-sm font-bold rounded-full">2</span>
                            <span className="font-medium text-gray-800">認証コマンド実行</span>
                          </div>
                          <p className="text-sm text-gray-600 ml-9">
                            チャットで <code className="px-2 py-1 bg-gray-100 rounded text-blue-600 font-mono text-xs border">/kishax confirm</code> コマンドを実行してください
                          </p>
                        </div>

                        <div className="bg-white rounded-lg p-4 border border-green-200 shadow-sm">
                          <div className="flex items-center space-x-3 mb-2">
                            <span className="flex items-center justify-center w-6 h-6 bg-purple-500 text-white text-sm font-bold rounded-full">3</span>
                            <span className="font-medium text-gray-800">認証URLでアクセス</span>
                          </div>
                          <p className="text-sm text-gray-600 ml-9">
                            表示された認証URLをクリックまたはQRコードをスキャンして、このページに戻ってきてください
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <span className="text-yellow-600">💡</span>
                          <span className="text-sm font-medium text-yellow-800">ヒント</span>
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

            {/* Kishax Account Linking Invitation */}
            {showAccountLinking && (
              <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
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
                      <h4 className="font-semibold text-gray-900 mb-2">🎁 連携特典</h4>
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
                      <Link
                        href="/signup"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        アカウント作成で連携
                      </Link>
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
          </div>
        </div>
      </main>
    </div>
  )
}