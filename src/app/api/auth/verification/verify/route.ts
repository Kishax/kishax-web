import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const verifyEmailSchema = z.object({
  email: z.string().email("有効なメールアドレスを入力してください"),
  token: z.string().min(1, "トークンは必須です"),
  mcid: z.string().optional(),
  uuid: z.string().optional(),
  authToken: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, token, mcid, uuid, authToken } =
      verifyEmailSchema.parse(body);

    // Find and validate verification token
    const verificationToken = await prisma.verificationToken.findUnique({
      where: {
        identifier_token: {
          identifier: email,
          token: token,
        },
      },
    });

    if (!verificationToken) {
      return NextResponse.json(
        { error: "無効な認証トークンです。" },
        { status: 400 },
      );
    }

    // Check if token is expired
    if (new Date() > verificationToken.expires) {
      // Clean up expired token
      await prisma.verificationToken.delete({
        where: {
          identifier_token: {
            identifier: email,
            token: token,
          },
        },
      });

      return NextResponse.json(
        {
          error:
            "認証トークンの有効期限が切れています。新しい認証メールを要求してください。",
        },
        { status: 400 },
      );
    }

    // Find user and verify email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "ユーザーが見つかりません。" },
        { status: 404 },
      );
    }

    // Update user's email verification status
    await prisma.user.update({
      where: { email },
      data: { emailVerified: new Date() },
    });

    // Don't delete verification token yet - will be deleted after username setup
    // await prisma.verificationToken.delete({
    //   where: {
    //     identifier_token: {
    //       identifier: email,
    //       token: token
    //     }
    //   }
    // })

    return NextResponse.json({
      message: "メールアドレスの認証が完了しました。",
      user: {
        id: user.id,
        email: user.email,
        emailVerified: true,
        needsUsername: !user.name, // Indicate if username setup is needed
      },
    });
  } catch (error) {
    console.error("Verify email error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "内部サーバーエラーが発生しました。" },
      { status: 500 },
    );
  }
}

// Handle GET request for email verification link clicks
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    const token = searchParams.get("token");
    const mcid = searchParams.get("mcid");
    const uuid = searchParams.get("uuid");
    const authToken = searchParams.get("authToken");

    if (!email || !token) {
      return NextResponse.redirect(
        new URL("/signup?error=invalid_token", request.url),
      );
    }

    // Verify the token using the same logic as POST
    const verificationToken = await prisma.verificationToken.findUnique({
      where: {
        identifier_token: {
          identifier: email,
          token: token,
        },
      },
    });

    if (!verificationToken) {
      return NextResponse.redirect(
        new URL("/signup?error=invalid_token", request.url),
      );
    }

    if (new Date() > verificationToken.expires) {
      await prisma.verificationToken.delete({
        where: {
          identifier_token: {
            identifier: email,
            token: token,
          },
        },
      });
      return NextResponse.redirect(
        new URL("/signup?error=expired_token", request.url),
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.redirect(
        new URL("/signup?error=user_not_found", request.url),
      );
    }

    // Update user's email verification status and handle MC linking
    await prisma.user.update({
      where: { email },
      data: { emailVerified: new Date() },
    });

    // Handle MC authentication linking if provided
    let mcLinked = false;

    if (mcid && uuid && authToken) {
      try {
        // Find the MC player with matching auth token
        const mcPlayer = await prisma.minecraftPlayer.findFirst({
          where: {
            mcid,
            uuid,
            authToken,
            confirmed: true,
          },
        });

        if (mcPlayer && !mcPlayer.kishaxUserId) {
          // Check if token is still valid (within 10 minutes)
          if (
            mcPlayer.tokenExpires &&
            new Date() <= new Date(mcPlayer.tokenExpires)
          ) {
            // Link the accounts
            await prisma.minecraftPlayer.update({
              where: { id: mcPlayer.id },
              data: {
                kishaxUserId: user.id,
                updatedAt: new Date(),
              },
            });

            mcLinked = true;
            console.log(
              `✅ MC account linked during email verification: ${user.id} -> MC: ${mcid}`,
            );

            // Send notification to MC server for permission update
            try {
              const { mcApi } = await import("@/lib/mc-message-client");
              await mcApi.sendAccountLink(mcid, uuid, user.id);
              console.log("Account link notification sent to MC server");
            } catch (mcApiError) {
              console.warn(
                "Failed to send account link notification to MC:",
                mcApiError,
              );
            }
          } else {
            console.warn(
              `MC auth token expired for ${mcid}, expires: ${mcPlayer.tokenExpires}, now: ${new Date()}`,
            );
          }
        }
      } catch (error) {
        console.error(
          "Error linking MC account during email verification:",
          error,
        );
        // Don't fail the email verification if MC linking fails
      }
    }

    // Don't delete verification token yet - will be deleted after username setup
    // await prisma.verificationToken.delete({
    //   where: {
    //     identifier_token: {
    //       identifier: email,
    //       token: token
    //     }
    //   }
    // })

    // Redirect to username setup if needed, otherwise to signin
    let redirectUrl;
    if (user.name) {
      redirectUrl = mcLinked
        ? `/signin?message=email_verified&mc_linked=true`
        : `/signin?message=email_verified`;
    } else {
      // Pass MC info to username setup if linking was successful
      const usernameSetupParams = new URLSearchParams({
        email: email,
        token: token,
      });
      if (mcLinked) {
        usernameSetupParams.set("mc_linked", "true");
      }
      redirectUrl = `/auth/setup-username?${usernameSetupParams.toString()}`;
    }

    return NextResponse.redirect(new URL(redirectUrl, request.url));
  } catch (error) {
    console.error("GET verify email error:", error);
    return NextResponse.redirect(
      new URL("/signup?error=server_error", request.url),
    );
  }
}
