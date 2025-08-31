"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { McAuthPageData } from "@/lib/schemas"

interface McAuthFormProps {
  pageData: McAuthPageData
}

export default function McAuthForm({ pageData }: McAuthFormProps) {
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [otpSent, setOtpSent] = useState(false)
  const [sendingOtp, setSendingOtp] = useState(false)
  const [mcResponse, setMcResponse] = useState<{ success: boolean; message: string } | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!pageData.isAuth || !pageData.mcAuth) {
      setError("認証が必要です。")
      return
    }

    if (!password || !/^\d{6}$/.test(password)) {
      setError("6桁の数字を入力してください。")
      return
    }

    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/mc/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: pageData.token,
          mcid: pageData.mcid,
          uuid: pageData.uuid,
          pass: password,
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        // Redirect to success page or refresh
        router.push("/mc/auth?success=true")
      } else {
        setError(result.message || "認証に失敗しました。")
      }
    } catch {
      setError("認証中にエラーが発生しました。")
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
    setPassword(value)
  }

  const handleSendOtp = async () => {
    if (!pageData.token) {
      setError("認証トークンが見つかりません。")
      return
    }

    setSendingOtp(true)
    setError("")

    try {
      const response = await fetch("/api/mc/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          authToken: pageData.token,
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setOtpSent(true)
        setMcResponse(result.mcResponse)
      } else {
        setError(result.message || "OTP送信に失敗しました。")
      }
    } catch {
      setError("OTP送信中にエラーが発生しました。")
    } finally {
      setSendingOtp(false)
    }
  }

  

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="mcid" className="block text-sm font-medium text-gray-700">
          MCID
        </label>
        <input
          type="text"
          id="mcid"
          name="mcid"
          value={pageData.mcid || "自動入力"}
          readOnly
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      <div>
        <label htmlFor="uuid" className="block text-sm font-medium text-gray-700">
          UUID
        </label>
        <input
          type="text"
          id="uuid"
          name="uuid"
          value={pageData.uuid || "自動入力"}
          readOnly
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      {/* OTP送信ステップ */}
      {pageData.isAuth && pageData.mcAuth && !otpSent && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">
            ステップ1: ワンタイムパスワードを取得
          </h4>
          <p className="text-sm text-blue-700 mb-3">
            まず、マイクラサーバーにワンタイムパスワードを送信します。<br />
            サーバーのチャットで6桁の数字が表示されるのを確認してください。
          </p>
          <button
            type="button"
            onClick={handleSendOtp}
            disabled={sendingOtp}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sendingOtp ? "送信中..." : "🚀 ワンタイムパスワードをマイクラサーバに送信する"}
          </button>
        </div>
      )}

      {/* MCレスポンス表示 */}
      {mcResponse && (
        <div className={`mb-4 p-4 rounded-lg border ${
          mcResponse.success 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <h4 className={`font-semibold mb-2 ${
            mcResponse.success ? 'text-green-900' : 'text-red-900'
          }`}>
            {mcResponse.success ? '✅' : '❌'} マインクラフトサーバーからの応答
          </h4>
          <p className={`text-sm ${
            mcResponse.success ? 'text-green-700' : 'text-red-700'
          }`}>
            {mcResponse.message}
          </p>
          {!mcResponse.success && (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => {
                  setOtpSent(false)
                  setMcResponse(null)
                  setError("")
                }}
                className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                🔄 もう一度送信する
              </button>
            </div>
          )}
        </div>
      )}

      {/* OTP入力ステップ */}
      {otpSent && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="font-semibold text-green-900 mb-2">
            ✅ ステップ2: ワンタイムパスワードを入力
          </h4>
          <p className="text-sm text-green-700">
            {mcResponse?.success 
              ? "マイクラサーバーのチャットに表示された6桁の数字を入力してください。"
              : "OTP送信に問題があったようです。上記のメッセージを確認してください。"
            }
          </p>
        </div>
      )}

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          ワンタイムパスワード
        </label>
        <input
          type="text"
          id="password"
          name="password"
          value={password}
          onChange={handlePasswordChange}
          placeholder={
            otpSent 
              ? (mcResponse?.success 
                  ? "マイクラに表示された6桁の数字" 
                  : "OTP送信に失敗しました"
                )
              : "まずOTPを送信してください"
          }
          maxLength={6}
          readOnly={!otpSent || !mcResponse?.success}
          className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
            (!otpSent || !mcResponse?.success) ? 'bg-gray-100' : 'bg-white'
          }`}
        />
      </div>

      <div>
        {pageData.isAuth && pageData.mcAuth ? (
          <button
            type="submit"
            disabled={loading || !otpSent || !mcResponse?.success || !password || !/^\d{6}$/.test(password)}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "認証中..." : "🎯 認証完了"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => alert("ログインまたはサーバーへの参加が必要です。")}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-400 cursor-not-allowed"
          >
            🔒 認証
          </button>
        )}
      </div>
    </form>
  )
}