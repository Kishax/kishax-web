import { auth } from "@/lib/auth";
import { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import { McAuthPageData } from "@/lib/schemas";
import jwt from "jsonwebtoken";
import McAuthPageClient from "@/components/McAuthPageClient";

interface PageProps {
  searchParams: Promise<{ n?: string; t?: string; success?: string }>;
}

export default async function McAuthPage({ searchParams }: PageProps) {
  const session = await auth();
  const resolvedSearchParams = await searchParams;
  const memberId = resolvedSearchParams.n
    ? parseInt(resolvedSearchParams.n)
    : undefined;
  const authToken = resolvedSearchParams.t;
  const success = resolvedSearchParams.success === "true";

  // Handle success parameter first
  if (success) {
    let pageData: McAuthPageData = {
      isAuth: !!session,
      username: session?.user?.username || "[ユーザーID未設定]",
      mcAuth: false,
      successMessage: ["MC認証完了済みです！"],
      errorMessage: undefined,
      infoMessage: [
        "Kishaxアカウントと連携すると、さらに多くの機能をご利用いただけます。",
      ],
    };

    // If auth token is provided with success, get MC auth data
    if (authToken) {
      try {
        const mcuser = await prisma.minecraftPlayer.findFirst({
          where: { authToken: authToken, confirmed: true },
        });

        if (
          mcuser &&
          mcuser.tokenExpires &&
          new Date() <= new Date(mcuser.tokenExpires)
        ) {
          pageData = {
            ...pageData,
            mcid: mcuser.mcid,
            uuid: mcuser.uuid,
            authToken: authToken,
            mcAuth: true,
          };
        }
      } catch (error) {
        console.error("Error fetching MC auth data on success:", error);
      }
    }

    return <McAuthPageClient pageData={pageData} showAccountLinking={true} />;
  }

  // Initialize page data
  let pageData: McAuthPageData = {
    isAuth: !!session,
    username: session?.user?.username || "[ユーザーID未設定]",
    mcAuth: false,
    successMessage: undefined,
    errorMessage: undefined,
    infoMessage: undefined,
  };

  // If not authenticated, handle token-based auth or show token required message
  if (!session) {
    if (authToken) {
      return await handleTokenAuthNoSession(authToken, pageData);
    }
    // Custom info message component will be handled in the component
    return <McAuthPageClient pageData={pageData} />;
  }

  // Get user from database
  const user = await prisma.user.findUnique({
    where: { id: session?.user?.id || "" },
  });

  if (!user) {
    pageData.errorMessage = ["ユーザー情報が見つかりません。"];
    return <McAuthPageClient pageData={pageData} />;
  }

  pageData.username = user.username || "[ユーザーID未設定]";

  // Handle token-based authentication
  if (authToken) {
    return await handleTokenAuth(authToken, session, pageData);
  }

  // If no member ID provided, check for existing MC account link
  if (!memberId) {
    // Check if user has linked Minecraft accounts
    const linkedMcAccounts = await prisma.minecraftPlayer.findMany({
      where: { kishaxUserId: user.id },
    });

    if (linkedMcAccounts.length > 0) {
      // Show linked accounts info
      const mcAccountNames = linkedMcAccounts.map((acc) => acc.mcid).join(", ");
      pageData.successMessage = [
        `連携済みMinecraftアカウント: ${mcAccountNames}`,
      ];
      pageData.infoMessage = [
        "MinecraftアカウントとKishaxアカウントの連携が完了しています。",
      ];
    } else {
      pageData.infoMessage = ["サーバーに参加しよう！"];
    }
    return <McAuthPageClient pageData={pageData} />;
  }

  // Get Minecraft member data
  const mcuser = await prisma.member.findUnique({
    where: { id: memberId },
  });

  if (!mcuser) {
    pageData.errorMessage = ["不正なアクセスです。"];
    return <McAuthPageClient pageData={pageData} />;
  }

  // Check if already confirmed
  if (mcuser.confirm) {
    pageData.infoMessage = ["認証済みユーザーです。"];
    return <McAuthPageClient pageData={pageData} />;
  }

  // Check if OTP is set
  if (!mcuser.secret2) {
    pageData.errorMessage = [
      "ワンタイムパスワードが設定されていません。",
      "サーバーで/retryコマンドよりワンタイムパスワードを生成してください。",
      "生成後、ページのリロードが必要です。",
    ];
    return <McAuthPageClient pageData={pageData} />;
  }

  // Check server status and online players
  const serverStatus = await prisma.status.findUnique({
    where: { name: "proxy" },
  });

  if (!serverStatus?.playerList) {
    pageData.errorMessage = [
      "プレイヤーがオンラインでないため、WEB認証ができません。",
    ];
    return <McAuthPageClient pageData={pageData} />;
  }

  const onlinePlayers = serverStatus.playerList.split(",");
  if (!onlinePlayers.includes(mcuser.name)) {
    pageData.errorMessage = [
      "プレイヤーがオンラインでないため、WEB認証ができません。",
    ];
    return <McAuthPageClient pageData={pageData} />;
  }

  // Generate JWT token for authentication
  try {
    const payload = {
      username: user.username || "[ユーザーID未設定]",
      mcid: mcuser.name,
      uuid: mcuser.uuid,
    };

    const token = jwt.sign(payload, process.env.NEXTAUTH_SECRET!, {
      expiresIn: "1h",
    });

    pageData = {
      ...pageData,
      mcid: mcuser.name,
      uuid: mcuser.uuid,
      mcAuth: true,
      token,
      successMessage: ["プレイヤー情報が自動入力されました。"],
    };
  } catch {
    pageData.errorMessage = ["トークンの生成に失敗しました。"];
    return <McAuthPageClient pageData={pageData} />;
  }

  return <McAuthPageClient pageData={pageData} />;
}

async function handleTokenAuth(
  authToken: string,
  session: Session,
  pageData: McAuthPageData,
) {
  try {
    // Get Minecraft player data by auth_token
    const mcuser = await prisma.minecraftPlayer.findFirst({
      where: { authToken: authToken },
    });

    if (!mcuser) {
      pageData.errorMessage = ["不正なトークンです。"];
      return <McAuthPageClient pageData={pageData} />;
    }

    // Check if token is expired
    if (!mcuser.tokenExpires || new Date() > new Date(mcuser.tokenExpires)) {
      pageData.errorMessage = [
        "トークンが期限切れです。サーバーで再度認証を開始してください。",
      ];
      return <McAuthPageClient pageData={pageData} />;
    }

    // Check if already confirmed
    if (mcuser.confirmed) {
      pageData.infoMessage = ["認証済みユーザーです。"];
      return <McAuthPageClient pageData={pageData} />;
    }

    // Note: OTP check is now handled by MC side before sending auth token
    // Web side assumes token is valid and player is ready for authentication

    // Note: Online player check moved to OTP sending phase

    // Generate JWT token for authentication
    try {
      const user = await prisma.user.findUnique({
        where: { id: session?.user?.id || "" },
      });

      const payload = {
        username: user?.username || "[ユーザーID未設定]",
        mcid: mcuser.mcid,
        uuid: mcuser.uuid,
      };

      const token = jwt.sign(payload, process.env.NEXTAUTH_SECRET!, {
        expiresIn: "1h",
      });

      pageData = {
        ...pageData,
        mcid: mcuser.mcid,
        uuid: mcuser.uuid,
        mcAuth: true,
        token,
        authToken: authToken, // 実際の認証トークンも保存
        successMessage: [
          "トークンによる認証を開始しました。プレイヤー情報が自動入力されました。",
        ],
      };
    } catch {
      pageData.errorMessage = ["トークンの生成に失敗しました。"];
      return <McAuthPageClient pageData={pageData} />;
    }

    return <McAuthPageClient pageData={pageData} />;
  } catch (error) {
    console.error("Token auth error:", error);
    pageData.errorMessage = ["認証処理中にエラーが発生しました。"];
    return <McAuthPageClient pageData={pageData} />;
  }
}

async function handleTokenAuthNoSession(
  authToken: string,
  pageData: McAuthPageData,
) {
  try {
    // Get Minecraft player data by auth_token
    const mcuser = await prisma.minecraftPlayer.findFirst({
      where: { authToken: authToken },
    });

    if (!mcuser) {
      pageData.errorMessage = ["不正なトークンです。"];
      return <McAuthPageClient pageData={pageData} />;
    }

    // Check if token is expired
    if (!mcuser.tokenExpires || new Date() > new Date(mcuser.tokenExpires)) {
      pageData.errorMessage = [
        "トークンが期限切れです。サーバーで再度認証を開始してください。",
      ];
      return <McAuthPageClient pageData={pageData} />;
    }

    // Check if already confirmed
    if (mcuser.confirmed) {
      pageData.infoMessage = ["認証済みユーザーです。"];

      // If user is connected to a Kishax account, show connection info
      if (mcuser.kishaxUserId) {
        const connectedUser = await prisma.user.findUnique({
          where: { id: mcuser.kishaxUserId },
          select: { username: true, name: true },
        });

        if (connectedUser) {
          pageData.successMessage = [
            `Kishaxアカウント「${connectedUser.username || connectedUser.name}」と連携済みです。`,
          ];
        }
      } else {
        // Show account linking invitation for authenticated users
        pageData.infoMessage = [
          "MC認証完了済みです！",
          "Kishaxアカウントと連携すると、さらに多くの機能をご利用いただけます。",
        ];
      }

      return (
        <McAuthPageClient
          pageData={pageData}
          showAccountLinking={!mcuser.kishaxUserId}
        />
      );
    }

    // Note: OTP check is now handled by MC side before sending auth token
    // Web side assumes token is valid and player is ready for authentication

    // Note: Online player check moved to OTP sending phase

    // Generate JWT token for authentication (without user session)
    try {
      const payload = {
        username: "[ゲスト]", // No user session
        mcid: mcuser.mcid,
        uuid: mcuser.uuid,
      };

      const token = jwt.sign(payload, process.env.NEXTAUTH_SECRET!, {
        expiresIn: "1h",
      });

      pageData = {
        ...pageData,
        mcid: mcuser.mcid,
        uuid: mcuser.uuid,
        mcAuth: true,
        token,
        authToken: authToken, // 実際の認証トークンも保存
        successMessage: [
          "トークンによる認証を開始しました。プレイヤー情報が自動入力されました。",
        ],
        infoMessage: ["ログインなしでMC認証を行っています。"],
      };
    } catch {
      pageData.errorMessage = ["トークンの生成に失敗しました。"];
      return <McAuthPageClient pageData={pageData} />;
    }

    return <McAuthPageClient pageData={pageData} />;
  } catch (error) {
    console.error("Token auth no session error:", error);
    pageData.errorMessage = ["認証処理中にエラーが発生しました。"];
    return <McAuthPageClient pageData={pageData} />;
  }
}
