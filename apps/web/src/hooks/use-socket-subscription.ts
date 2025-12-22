
import { useEffect, useState } from "react";
import { getSocket } from "@/lib/socket";

export function useSocketSubscription(symbol: string) {
  const [data, setData] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!symbol) return;

    const socket = getSocket();

    if (!socket.connected) {
      socket.connect();
    }

    function onConnect() {
      setIsConnected(true);
      // Join room
      socket.emit("subscribeToSymbol", symbol);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    function onTrade(message: { symbol: string; data: any }) {
      if (message.symbol === symbol) {
        setData(message.data);
      }
    }

    // Attach listeners
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("trade", onTrade);

    // If already connected, trigger logic manually
    if (socket.connected) {
      onConnect();
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("trade", onTrade);
      socket.emit("unsubscribeFromSymbol", symbol);
    };
  }, [symbol]);

  return { data, isConnected };
}
