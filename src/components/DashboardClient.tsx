"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { OAuthRedirectHandler } from "./OAuthRedirectHandler";

export function DashboardClient() {
  const searchParams = useSearchParams();
  const [showMcLinkedMessage, setShowMcLinkedMessage] = useState(false);
  const [showAccountCompleteMessage, setShowAccountCompleteMessage] =
    useState(false);

  useEffect(() => {
    const mcLinked = searchParams.get("mc_linked");
    const accountComplete = searchParams.get("message");

    if (mcLinked === "true") {
      setShowMcLinkedMessage(true);
      // 5秒後にメッセージを非表示
      setTimeout(() => {
        setShowMcLinkedMessage(false);
      }, 5000);
    }

    if (accountComplete === "account_complete") {
      setShowAccountCompleteMessage(true);
      // 5秒後にメッセージを非表示
      setTimeout(() => {
        setShowAccountCompleteMessage(false);
      }, 5000);
    }
  }, [searchParams]);

  return (
    <>
      <OAuthRedirectHandler />
      {showMcLinkedMessage && (
        <div className="fixed top-4 right-4 z-50 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded shadow-lg">
          <div className="flex items-center">
            <span className="text-xl mr-2">🎮</span>
            <span className="font-medium">
              Minecraftアカウントとの連携が完了しました！
            </span>
          </div>
        </div>
      )}
      {showAccountCompleteMessage && (
        <div className="fixed top-4 right-4 z-50 bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded shadow-lg">
          <div className="flex items-center">
            <span className="text-xl mr-2">🎉</span>
            <span className="font-medium">
              アカウントの作成が完了しました！
            </span>
          </div>
        </div>
      )}
    </>
  );
}
