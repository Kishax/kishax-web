-- CreateTable
CREATE TABLE "public"."minecraft_players" (
    "id" TEXT NOT NULL,
    "mcid" TEXT NOT NULL,
    "uuid" TEXT NOT NULL,
    "auth_token" TEXT,
    "token_expires" TIMESTAMP(3),
    "otp" TEXT,
    "otp_expires" TIMESTAMP(3),
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "kishax_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "minecraft_players_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "minecraft_players_mcid_key" ON "public"."minecraft_players"("mcid");

-- CreateIndex
CREATE UNIQUE INDEX "minecraft_players_uuid_key" ON "public"."minecraft_players"("uuid");

-- AddForeignKey
ALTER TABLE "public"."minecraft_players" ADD CONSTRAINT "minecraft_players_kishax_user_id_fkey" FOREIGN KEY ("kishax_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
