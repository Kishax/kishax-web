"use client";

import { useState } from "react";

interface McAccountLinkFormProps {
  mcid?: string;
  uuid?: string;
  onLinkSuccess?: () => void;
}

interface LinkResult {
  success: boolean;
  message: string;
  user?: {
    kishaxUserId: string;
    mcid: string;
    uuid: string;
  };
}

export default function McAccountLinkForm({
  mcid = "",
  uuid = "",
  onLinkSuccess,
}: McAccountLinkFormProps) {
  const [mcidInput, setMcidInput] = useState(mcid);
  const [uuidInput, setUuidInput] = useState(uuid);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LinkResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!mcidInput.trim() || !uuidInput.trim()) {
      setResult({
        success: false,
        message: "MCIDとUUIDを入力してください。",
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/mc/link-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mcid: mcidInput.trim(),
          uuid: uuidInput.trim(),
        }),
      });

      const data = await response.json();

      setResult({
        success: response.ok && data.success,
        message:
          data.message ||
          (response.ok ? "連携が完了しました" : "連携に失敗しました"),
        user: data.user,
      });

      if (response.ok && data.success && onLinkSuccess) {
        // 成功時に2秒後にコールバック実行
        setTimeout(() => {
          onLinkSuccess();
        }, 2000);
      }
    } catch (error) {
      console.error("Account linking error:", error);
      setResult({
        success: false,
        message: "連携中にエラーが発生しました。",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setMcidInput(mcid);
    setUuidInput(uuid);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Kishaxアカウント連携
        </h3>
        <p className="text-sm text-gray-600">
          MC認証済みプレイヤーとKishaxアカウントを連携します
        </p>
      </div>

      {result && (
        <div
          className={`mb-6 p-4 rounded-lg border ${
            result.success
              ? "bg-green-50 border-green-200"
              : "bg-red-50 border-red-200"
          }`}
        >
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <span className="text-xl">{result.success ? "✅" : "❌"}</span>
            </div>
            <div className="ml-3 flex-1">
              <h4
                className={`font-medium ${
                  result.success ? "text-green-900" : "text-red-900"
                }`}
              >
                {result.success ? "連携成功" : "連携失敗"}
              </h4>
              <p
                className={`text-sm mt-1 ${
                  result.success ? "text-green-700" : "text-red-700"
                }`}
              >
                {result.message}
              </p>
              {result.success && result.user && (
                <div className="mt-3 text-sm text-green-700">
                  <p>
                    <strong>MCID:</strong> {result.user.mcid}
                  </p>
                  <p>
                    <strong>UUID:</strong> {result.user.uuid}
                  </p>
                  <p className="mt-2 text-green-600">
                    2秒後にページが更新されます...
                  </p>
                </div>
              )}
              {!result.success && (
                <button
                  onClick={handleReset}
                  className="mt-3 text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  再試行
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {!result?.success && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="mcid"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              MCID（マインクラフトプレイヤー名）
            </label>
            <input
              type="text"
              id="mcid"
              value={mcidInput}
              onChange={(e) => setMcidInput(e.target.value)}
              placeholder="例: Steve"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
              required
            />
          </div>

          <div>
            <label
              htmlFor="uuid"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              UUID（プレイヤーID）
            </label>
            <input
              type="text"
              id="uuid"
              value={uuidInput}
              onChange={(e) => setUuidInput(e.target.value)}
              placeholder="例: 550e8400-e29b-41d4-a716-446655440000"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              disabled={loading}
              required
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-blue-600">💡</span>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-blue-900">連携方法</h4>
                <div className="text-sm text-blue-700 mt-1">
                  <p>
                    1. マインクラフトで{" "}
                    <code className="bg-blue-100 px-1 rounded">
                      /kishax confirm
                    </code>{" "}
                    コマンドを実行
                  </p>
                  <p>2. 表示されたMCIDとUUIDをここに入力</p>
                  <p>3. 「連携する」ボタンをクリック</p>
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !mcidInput.trim() || !uuidInput.trim()}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                連携中...
              </div>
            ) : (
              "🔗 Kishaxアカウントと連携する"
            )}
          </button>
        </form>
      )}
    </div>
  );
}
