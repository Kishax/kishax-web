"use client";

import { useCallback, useEffect, useState } from "react";
import { mcApi } from "@/lib/mc-message-client";
import { useMcMessages } from "@/components/McMessageProvider";

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
  const { registerHandler } = useMcMessages();
  const [authResponses, setAuthResponses] = useState<McAuthResponse[]>([]);
  const [playerStatuses, setPlayerStatuses] = useState<McPlayerStatus[]>([]);
  const [serverInfos, setServerInfos] = useState<McServerInfo[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // SQSメッセージハンドラー登録
  useEffect(() => {
    // MC認証レスポンス処理
    registerHandler("mc_web_auth_response", (message) => {
      const messageData = message as { data: McAuthResponse };
      const authResponse: McAuthResponse = messageData.data;
      setAuthResponses((prev) => [...prev, authResponse]);
    });

    // プレイヤーステータス処理
    registerHandler("mc_web_player_status", (message) => {
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
    registerHandler("mc_web_server_info", (message) => {
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
        const result = await mcApi.sendAuthConfirm(playerName, playerUuid);
        return result;
      } catch (error) {
        console.error("Failed to send auth confirmation:", error);
        throw error;
      }
    },
    [],
  );

  // テレポートコマンド送信
  const sendTeleportCommand = useCallback(
    async (playerName: string, location: string) => {
      try {
        const result = await mcApi.sendTeleport(playerName, location);
        return result;
      } catch (error) {
        console.error("Failed to send teleport command:", error);
        throw error;
      }
    },
    [],
  );

  // サーバー切り替えコマンド送信
  const sendServerSwitchCommand = useCallback(
    async (playerName: string, serverName: string) => {
      try {
        const result = await mcApi.sendServerSwitch(playerName, serverName);
        return result;
      } catch (error) {
        console.error("Failed to send server switch command:", error);
        throw error;
      }
    },
    [],
  );

  // メッセージ送信
  const sendMessage = useCallback(
    async (playerName: string, message: string) => {
      try {
        const result = await mcApi.sendMessage(playerName, message);
        return result;
      } catch (error) {
        console.error("Failed to send message:", error);
        throw error;
      }
    },
    [],
  );

  // サーバーステータスリクエスト
  const requestServerStatus = useCallback(
    async (playerName: string, serverName?: string) => {
      try {
        const result = await mcApi.requestServerStatus(playerName, serverName);
        return result;
      } catch (error) {
        console.error("Failed to request server status:", error);
        throw error;
      }
    },
    [],
  );

  // プレイヤーリストリクエスト
  const requestPlayerList = useCallback(
    async (playerName: string, serverName?: string) => {
      try {
        const result = await mcApi.requestPlayerList(playerName, serverName);
        return result;
      } catch (error) {
        console.error("Failed to request player list:", error);
        throw error;
      }
    },
    [],
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
