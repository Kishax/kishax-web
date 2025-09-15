import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { email, password, mcAuthData } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "メールアドレスとパスワードは必須です" },
        { status: 400 },
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "このメールアドレスはすでに登録されています。" },
        { status: 400 },
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user (without name, will be set after email verification)
    const user = await prisma.user.create({
      data: {
        email: email,
        password: hashedPassword,
        emailVerified: null, // Email not verified yet
      },
    });

    // MC認証データがある場合、MinecraftPlayerテーブルを更新
    if (mcAuthData && mcAuthData.mcid && mcAuthData.uuid) {
      try {
        await prisma.minecraftPlayer.updateMany({
          where: {
            mcid: mcAuthData.mcid,
            uuid: mcAuthData.uuid,
          },
          data: {
            kishaxUserId: user.id,
          },
        });
        console.log(
          `MinecraftPlayer updated: ${mcAuthData.mcid} -> User ID: ${user.id}`,
        );
      } catch (mcError) {
        console.error("Failed to link MinecraftPlayer:", mcError);
        // MC連携エラーでもアカウント作成は成功とする
      }
    }

    return NextResponse.json(
      {
        message: "アカウントが作成されました。メール認証を完了してください。",
        userId: user.id,
        email: user.email,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Sign up error:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 },
    );
  }
}
