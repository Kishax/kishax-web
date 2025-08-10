"use client"

import { signIn, getSession } from "next-auth/react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import OTPInput from "@/components/OTPInput"

export default function SignInPage() {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    email: ""
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showOTP, setShowOTP] = useState(false)
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpError, setOtpError] = useState("")
  const [countdown, setCountdown] = useState(0)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const result = await signIn("credentials", {
        username: formData.username,
        password: formData.password,
        redirect: false,
      })

      if (result?.error) {
        setError("Invalid username or password")
      } else {
        router.push("/")
      }
    } catch (error) {
      setError("An error occurred during sign in")
    } finally {
      setLoading(false)
    }
  }

  const handleOAuthSignIn = (provider: string) => {
    signIn(provider, { callbackUrl: "/" })
  }

  const handleSendOTP = async () => {
    if (!formData.email) {
      setError("メールアドレスを入力してください")
      return
    }

    setOtpLoading(true)
    setOtpError("")

    try {
      const response = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: formData.email }),
      })

      const data = await response.json()

      if (response.ok) {
        setShowOTP(true)
        setCountdown(600) // 10 minutes
        
        // Start countdown timer
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer)
              setShowOTP(false)
              return 0
            }
            return prev - 1
          })
        }, 1000)
      } else {
        setOtpError(data.error)
      }
    } catch (error) {
      setOtpError('ネットワークエラーが発生しました')
    } finally {
      setOtpLoading(false)
    }
  }

  const handleOTPComplete = async (otp: string) => {
    setOtpLoading(true)
    setOtpError("")

    try {
      const response = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: formData.email, 
          otp 
        }),
      })

      const data = await response.json()

      if (response.ok) {
        // OTP verification successful, sign in the user
        const result = await signIn("credentials", {
          username: formData.email,
          password: "otp-verified", // Special flag for OTP login
          redirect: false,
        })

        if (result?.error) {
          setOtpError("ログインに失敗しました")
        } else {
          router.push("/")
        }
      } else {
        setOtpError(data.error)
      }
    } catch (error) {
      setOtpError('ネットワークエラーが発生しました')
    } finally {
      setOtpLoading(false)
    }
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            アカウントにサインイン
          </h2>
        </div>

        {!showOTP ? (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}
            
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="ユーザー名またはメールアドレス"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                />
              </div>
              <div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="パスワード"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? "サインイン中..." : "サインイン"}
              </button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-50 text-gray-500">または</span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="メールアドレス"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <button
                type="button"
                onClick={handleSendOTP}
                disabled={otpLoading || !formData.email}
                className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {otpLoading ? "送信中..." : "ワンタイムパスワードでログイン"}
              </button>
              {otpError && (
                <p className="text-red-500 text-sm text-center">{otpError}</p>
              )}
            </div>
          </form>
        ) : (
          <div className="mt-8 space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                ワンタイムパスワードを入力
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {formData.email} に送信されたコードを入力してください
              </p>
              <p className="text-sm text-blue-600 mb-6">
                残り時間: {formatTime(countdown)}
              </p>
            </div>

            <OTPInput
              onComplete={handleOTPComplete}
              disabled={otpLoading}
              error={otpError}
            />

            {otpLoading && (
              <div className="text-center">
                <div className="text-sm text-gray-600">認証中...</div>
              </div>
            )}

            <div className="text-center space-y-2">
              <button
                type="button"
                onClick={() => setShowOTP(false)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                戻る
              </button>
            </div>
          </div>
        )}

        {!showOTP && (
          <>
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-gray-50 text-gray-500">または他のサービスで続ける</span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3">
                <button
                  onClick={() => handleOAuthSignIn("google")}
                  className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                >
                  Google
                </button>
                <button
                  onClick={() => handleOAuthSignIn("discord")}
                  className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                >
                  Discord
                </button>
                <button
                  onClick={() => handleOAuthSignIn("twitter")}
                  className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                >
                  Twitter
                </button>
              </div>
            </div>

            <div className="text-center">
              <Link href="/signup" className="text-indigo-600 hover:text-indigo-500">
                アカウントをお持ちでない方はこちら
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}