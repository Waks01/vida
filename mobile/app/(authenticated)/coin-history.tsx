import { FlatList, Text, View } from "react-native";

import { VHeader } from "../../src/shared/components/VHeader";
import { VIcon } from "../../src/shared/components/VIcon";
import { useWallet } from "../../src/features/wallet/hooks/useWallet";
import { useTheme } from "../../src/providers/ThemeProvider";

function iconForSource(source: string): any {
  const s = source.toLowerCase();
  if (s.includes("ad")) return "tv";
  if (s.includes("unlock")) return "lock-closed";
  if (s.includes("check")) return "calendar";
  if (s.includes("bought") || s.includes("purchase") || s.includes("stripe") || s.includes("pay")) return "card";
  return "cash";
}

function formatWhen(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export default function CoinHistoryScreen() {
  const { tokens } = useTheme();
  const { transactions, isLoading } = useWallet();

  return (
    <View style={{ flex: 1, backgroundColor: tokens["--vida-bg"] }}>
      <VHeader title="Coin History" showBack />

      {isLoading ? (
        <View style={{ padding: 24, alignItems: "center" }}>
          <Text style={{ color: tokens["--vida-text-muted"] }}>Loading…</Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 1 }}
          renderItem={({ item }) => (
            <View
              style={{
                backgroundColor: tokens["--vida-surface"],
                borderWidth: 1,
                borderColor: tokens["--vida-border"],
                padding: 12,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              }}
            >
              <VIcon name={iconForSource(item.source)} size={18} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: tokens["--vida-text-primary"], fontSize: 13, fontWeight: "600" }}>
                  {item.source}
                </Text>
                <Text style={{ color: tokens["--vida-text-dim"], fontSize: 11, marginTop: 2 }}>
                  {formatWhen(item.created_at)}
                </Text>
              </View>
              <Text
                style={{
                  color: item.amount >= 0 ? tokens["--vida-accent"] : tokens["--vida-primary"],
                  fontWeight: "700",
                }}
              >
                {item.amount >= 0 ? "+" : ""}
                {item.amount}
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <Text style={{ color: tokens["--vida-text-muted"], textAlign: "center", marginTop: 24 }}>
              No transactions yet
            </Text>
          }
        />
      )}
    </View>
  );
}
