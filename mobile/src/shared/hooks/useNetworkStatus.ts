import { useEffect, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import NetInfo from "@react-native-community/netinfo";

/** Returns online/offline status reactively (for offline-first feed). */
export function useNetworkStatus(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setOnline(Boolean(state.isConnected));
    });
    return unsub;
  }, []);

  return online;
}

/** Fires a callback when the app returns to the foreground. */
export function useAppForeground(cb: () => void): void {
  useEffect(() => {
    const onChange = (next: AppStateStatus) => {
      if (next === "active") cb();
    };
    const sub = AppState.addEventListener("change", onChange);
    return () => sub.remove();
  }, [cb]);
}
