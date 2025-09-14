"use client";

import { useState } from "react";
import { z } from "zod";

const OtpAccountCreateSchema = z
  .object({
    email: z.string().email("有効なメールアドレスを入力してください"),
    password: z.string().min(8, "パスワードは8文字以上である必要があります"),
    confirmPassword: z.string().min(1, "パスワードの確認を入力してください"),
    username: z.string().min(3, "ユーザー名は3文字以上である必要があります"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "パスワードが一致しません",
    path: ["confirmPassword"],
  });

interface McOtpAccountFormProps {
  mcid: string;
  uuid: string;
  authToken: string;
  onSuccess?: () => void;
}

type FormStep =
  | "input"
  | "creating"
  | "awaiting_otp"
  | "verifying_otp"
  | "success"
  | "error";

export default function McOtpAccountForm({
  mcid,
  uuid,
  authToken,
  onSuccess,
}: McOtpAccountFormProps) {
  const [step, setStep] = useState<FormStep>("input");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    username: "",
  });
  const [otp, setOtp] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState("");

  const validateForm = () => {
    try {
      OtpAccountCreateSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.issues.forEach((issue) => {
          if (issue.path[0]) {
            newErrors[issue.path[0].toString()] = issue.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleCreateAccount = async () => {
    if (!validateForm()) {
      return;
    }

    setStep("creating");
    setErrors({});

    try {
      const response = await fetch("/api/mc/create-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mcid,
          uuid,
          authToken,
          ...formData,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setUserId(data.userId);
        setMessage(data.message);
        setStep("awaiting_otp");
      } else {
        setMessage(data.message || "アカウント作成に失敗しました。");
        setStep("error");
      }
    } catch (error) {
      console.error("Account creation error:", error);
      setMessage("ネットワークエラーが発生しました。");
      setStep("error");
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      setErrors({ otp: "6桁のOTPを入力してください" });
      return;
    }

    setStep("verifying_otp");
    setErrors({});

    try {
      const response = await fetch("/api/mc/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mcid,
          uuid,
          otp,
          scenario: "mc_to_account",
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage("アカウント作成とMC認証が完了しました！");
        setStep("success");
        setTimeout(() => {
          onSuccess?.();
        }, 2000);
      } else {
        setMessage(data.message || "OTP検証に失敗しました。");
        setStep("awaiting_otp");
      }
    } catch (error) {
      console.error("OTP verification error:", error);
      setMessage("ネットワークエラーが発生しました。");
      setStep("awaiting_otp");
    }
  };

  const resetForm = () => {
    setStep("input");
    setFormData({
      email: "",
      password: "",
      confirmPassword: "",
      username: "",
    });
    setOtp("");
    setErrors({});
    setMessage("");
    setUserId("");
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="flex items-center space-x-2 mb-6">
        <span className="text-2xl">🚀</span>
        <h3 className="text-lg font-semibold text-gray-900">
          OTPアカウント作成
        </h3>
      </div>

      {/* プレイヤー情報 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h4 className="text-sm font-medium text-blue-900 mb-2">
          連携するMinecraftプレイヤー
        </h4>
        <div className="text-sm text-blue-700 space-y-1">
          <div>
            <strong>MCID:</strong> {mcid}
          </div>
          <div>
            <strong>UUID:</strong> {uuid.substring(0, 8)}...
            {uuid.substring(uuid.length - 8)}
          </div>
        </div>
      </div>

      {/* 入力フォーム */}
      {step === "input" && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              メールアドレス
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.email ? "border-red-300" : "border-gray-300"
              }`}
              placeholder="your@email.com"
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ユーザー名（公開ID）
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => handleInputChange("username", e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.username ? "border-red-300" : "border-gray-300"
              }`}
              placeholder="username123"
            />
            {errors.username && (
              <p className="text-red-500 text-sm mt-1">{errors.username}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              パスワード
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => handleInputChange("password", e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.password ? "border-red-300" : "border-gray-300"
              }`}
              placeholder="8文字以上"
            />
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              パスワード（確認）
            </label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) =>
                handleInputChange("confirmPassword", e.target.value)
              }
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.confirmPassword ? "border-red-300" : "border-gray-300"
              }`}
              placeholder="上記と同じパスワード"
            />
            {errors.confirmPassword && (
              <p className="text-red-500 text-sm mt-1">
                {errors.confirmPassword}
              </p>
            )}
          </div>

          <button
            onClick={handleCreateAccount}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            アカウント作成開始
          </button>
        </div>
      )}

      {/* 作成中 */}
      {step === "creating" && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">アカウントを作成中...</p>
        </div>
      )}

      {/* OTP待機中 */}
      {step === "awaiting_otp" && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-green-600">✓</span>
              <span className="text-sm font-medium text-green-800">
                アカウント作成完了！
              </span>
            </div>
            <p className="text-sm text-green-700">{message}</p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-blue-600">🎮</span>
              <span className="text-sm font-medium text-blue-800">
                次のステップ
              </span>
            </div>
            <p className="text-sm text-blue-700 mb-3">
              Minecraftに送信された6桁のOTPを入力してください。
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              OTP（6桁の数字）
            </label>
            <input
              type="text"
              value={otp}
              onChange={(e) =>
                setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              className={`w-full px-3 py-2 border rounded-md text-center text-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.otp ? "border-red-300" : "border-gray-300"
              }`}
              placeholder="123456"
              maxLength={6}
            />
            {errors.otp && (
              <p className="text-red-500 text-sm mt-1">{errors.otp}</p>
            )}
          </div>

          <button
            onClick={handleVerifyOtp}
            disabled={otp.length !== 6}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            OTP確認
          </button>
        </div>
      )}

      {/* OTP検証中 */}
      {step === "verifying_otp" && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">OTPを確認中...</p>
        </div>
      )}

      {/* 成功 */}
      {step === "success" && (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 13l4 4L19 7"
              ></path>
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">完了！</h3>
          <p className="text-gray-600">{message}</p>
        </div>
      )}

      {/* エラー */}
      {step === "error" && (
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-red-600">✕</span>
              <span className="text-sm font-medium text-red-800">
                エラーが発生しました
              </span>
            </div>
            <p className="text-sm text-red-700">{message}</p>
          </div>

          <button
            onClick={resetForm}
            className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            最初からやり直す
          </button>
        </div>
      )}
    </div>
  );
}
