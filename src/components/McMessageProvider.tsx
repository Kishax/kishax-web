"use client";

import React, { createContext, useContext, useEffect, useRef } from "react";
import { getMcMessageClient, McMessageClient } from "@/lib/mc-message-client";

interface McMessageContextType {
  client: McMessageClient | null;
  registerHandler: (
    messageType: string,
    handler: (message: unknown) => void,
  ) => void;
}

const McMessageContext = createContext<McMessageContextType>({
  client: null,
  registerHandler: () => {},
});

export function useMcMessages() {
  return useContext(McMessageContext);
}

interface McMessageProviderProps {
  children: React.ReactNode;
  autoStart?: boolean;
}

export function McMessageProvider({
  children,
  autoStart = true,
}: McMessageProviderProps) {
  const clientRef = useRef<McMessageClient | null>(null);

  useEffect(() => {
    // MC message client を初期化
    try {
      if (autoStart) {
        clientRef.current = getMcMessageClient();
        console.log("MC message client initialized");
      }
    } catch (error) {
      console.error("Failed to initialize MC message client:", error);
    }

    // クリーンアップ
    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect();
        clientRef.current = null;
      }
    };
  }, [autoStart]);

  const registerHandler = (
    messageType: string,
    handler: (message: unknown) => void,
  ) => {
    if (clientRef.current) {
      clientRef.current.onMessage(messageType, handler);
    }
  };

  const contextValue: McMessageContextType = {
    client: clientRef.current,
    registerHandler,
  };

  return (
    <McMessageContext.Provider value={contextValue}>
      {children}
    </McMessageContext.Provider>
  );
}
