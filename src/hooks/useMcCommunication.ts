"use client";

import { useCallback, useEffect, useState } from "react";
import { getApiClient } from "@/lib/api-client";
import { useSqsMessages } from "@/components/SqsMessageProvider";

interface McAuthResponse {
  playerName: string;
  playerUuid: string;
  success: boolean;
  message: string;
}

interface McPlayerStatus {
  playerName: string;
  playerUuid: string;
  status: "online" | "offline" | "move";
  serverName: string;
}

interface McServerInfo {
  serverName: string;
  status: string;
  playerCount: number;
  additionalData: Record<string, unknown>;
}

export function useMcCommunication() {
  const { registerHandler } = useSqsMessages();
  const [authResponses, setAuthResponses] = useState<McAuthResponse[]>([]);
  const [playerStatuses, setPlayerStatuses] = useState<McPlayerStatus[]>([]);
  const [serverInfos, setServerInfos] = useState<McServerInfo[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // API クライアント取得
  const apiClient = getApiClient();

  // SQSメッセージハンドラー登録
  useEffect(() => {
    // MC認証レスポンス処理
    registerHandler("mc_web_auth_response", async (message) => {
      const messageData = message as { data: McAuthResponse };
      const authResponse: McAuthResponse = messageData.data;
      setAuthResponses((prev) => [...prev, authResponse]);
    });

    // プレイヤーステータス処理
    registerHandler("mc_web_player_status", async (message) => {
      const messageData = message as { data: McPlayerStatus };
      const playerStatus: McPlayerStatus = messageData.data;
      setPlayerStatuses((prev) => {
        const filtered = prev.filter(
          (p) => p.playerUuid !== playerStatus.playerUuid,
        );
        return [...filtered, playerStatus];
      });
    });

    // サーバー情報処理
    registerHandler("mc_web_server_info", async (message) => {
      const messageData = message as { data: McServerInfo };
      const serverInfo: McServerInfo = messageData.data;
      setServerInfos((prev) => {
        const filtered = prev.filter(
          (s) => s.serverName !== serverInfo.serverName,
        );
        return [...filtered, serverInfo];
      });
    });

    setIsConnected(true);

    return () => {
      setIsConnected(false);
    };
  }, [registerHandler]);

  // カスタムイベントリスナー（フォールバック）
  useEffect(() => {
    const handleAuthResponse = (event: CustomEvent) => {
      const authResponse: McAuthResponse = event.detail;
      setAuthResponses((prev) => [...prev, authResponse]);
    };

    const handlePlayerStatus = (event: CustomEvent) => {
      const playerStatus: McPlayerStatus = event.detail;
      setPlayerStatuses((prev) => {
        const filtered = prev.filter(
          (p) => p.playerUuid !== playerStatus.playerUuid,
        );
        return [...filtered, playerStatus];
      });
    };

    const handleServerInfo = (event: CustomEvent) => {
      const serverInfo: McServerInfo = event.detail;
      setServerInfos((prev) => {
        const filtered = prev.filter(
          (s) => s.serverName !== serverInfo.serverName,
        );
        return [...filtered, serverInfo];
      });
    };

    window.addEventListener(
      "mcAuthResponse",
      handleAuthResponse as EventListener,
    );
    window.addEventListener(
      "mcPlayerStatus",
      handlePlayerStatus as EventListener,
    );
    window.addEventListener("mcServerInfo", handleServerInfo as EventListener);

    return () => {
      window.removeEventListener(
        "mcAuthResponse",
        handleAuthResponse as EventListener,
      );
      window.removeEventListener(
        "mcPlayerStatus",
        handlePlayerStatus as EventListener,
      );
      window.removeEventListener(
        "mcServerInfo",
        handleServerInfo as EventListener,
      );
    };
  }, []);

  // MC認証確認送信
  const sendAuthConfirm = useCallback(
    async (playerName: string, playerUuid: string) => {
      try {
        const result = await apiClient.sendAuthConfirm(playerName, playerUuid);
        return result;
      } catch (error) {
        console.error("Failed to send auth confirmation:", error);
        throw error;
      }
    },
    [apiClient],
  );

  // テレポートコマンド送信
  const sendTeleportCommand = useCallback(
    async (playerName: string, location: string) => {
      try {
        const result = await apiClient.sendTeleportCommand(
          playerName,
          location,
        );
        return result;
      } catch (error) {
        console.error("Failed to send teleport command:", error);
        throw error;
      }
    },
    [apiClient],
  );

  // サーバー切り替えコマンド送信
  const sendServerSwitchCommand = useCallback(
    async (playerName: string, serverName: string) => {
      try {
        const result = await apiClient.sendServerSwitchCommand(
          playerName,
          serverName,
        );
        return result;
      } catch (error) {
        console.error("Failed to send server switch command:", error);
        throw error;
      }
    },
    [apiClient],
  );

  // メッセージ送信
  const sendMessage = useCallback(
    async (playerName: string, message: string) => {
      try {
        const result = await apiClient.sendMessageCommand(playerName, message);
        return result;
      } catch (error) {
        console.error("Failed to send message:", error);
        throw error;
      }
    },
    [apiClient],
  );

  // サーバーステータスリクエスト
  const requestServerStatus = useCallback(
    async (playerName: string, serverName?: string) => {
      try {
        const result = await apiClient.requestServerStatus(
          playerName,
          serverName,
        );
        return result;
      } catch (error) {
        console.error("Failed to request server status:", error);
        throw error;
      }
    },
    [apiClient],
  );

  // プレイヤーリストリクエスト
  const requestPlayerList = useCallback(
    async (playerName: string, serverName?: string) => {
      try {
        const result = await apiClient.requestPlayerList(
          playerName,
          serverName,
        );
        return result;
      } catch (error) {
        console.error("Failed to request player list:", error);
        throw error;
      }
    },
    [apiClient],
  );

  // 特定プレイヤーの最新認証レスポンス取得
  const getLatestAuthResponse = useCallback(
    (playerUuid: string) => {
      return authResponses
        .filter((response) => response.playerUuid === playerUuid)
        .sort(
          (a, b) =>
            new Date(b.message).getTime() - new Date(a.message).getTime(),
        )[0];
    },
    [authResponses],
  );

  // 特定プレイヤーのステータス取得
  const getPlayerStatus = useCallback(
    (playerUuid: string) => {
      return playerStatuses.find((status) => status.playerUuid === playerUuid);
    },
    [playerStatuses],
  );

  // 特定サーバーの情報取得
  const getServerInfo = useCallback(
    (serverName: string) => {
      return serverInfos.find((info) => info.serverName === serverName);
    },
    [serverInfos],
  );

  return {
    // 状態
    isConnected,
    authResponses,
    playerStatuses,
    serverInfos,

    // アクション
    sendAuthConfirm,
    sendTeleportCommand,
    sendServerSwitchCommand,
    sendMessage,
    requestServerStatus,
    requestPlayerList,

    // ゲッター
    getLatestAuthResponse,
    getPlayerStatus,
    getServerInfo,
  };
}
