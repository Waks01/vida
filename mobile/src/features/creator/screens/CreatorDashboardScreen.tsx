import { useState, useEffect } from "react";
import { FlatList, Text, View, Pressable, Alert } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

import { VButton } from "../../../shared/components/VButton";
import { VIcon } from "../../../shared/components/VIcon";
import { useTheme } from "../../../providers/ThemeProvider";
import { creatorsApi } from "../../feed/api/creatorsApi";

interface SeriesItem {
  id: string;
  title: string;
  status: string;
  total_views: number;
  episode_count: number;
}

export default function CreatorDashboardScreen() {
  const { tokens } = useTheme();
  const [series, setSeries] = useState<SeriesItem[]>([]);
  const [earnings, setEarnings] = useState<{ total_earnings: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSeries();
    loadEarnings();
  }, []);

  const loadSeries = async () => {
    try {
      const data = await creatorsApi.getSeriesList();
      setSeries(
        data.map((s) => ({
          id: s.id,
          title: s.title,
          status: s.status,
          total_views: s.total_views,
          episode_count: s.episodes?.length ?? 0,
        }))
      );
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to load series");
    } finally {
      setLoading(false);
    }
  };

  const loadEarnings = async () => {
    try {
      const data = await creatorsApi.getEarnings();
      setEarnings(data);
    } catch {
      // ignore
    }
  };

  const renderItem = ({ item }: { item: SeriesItem }) => (
    <Pressable
      onPress={() => router.push({ pathname: "/(authenticated)/series/[id]", params: { id: item.id } })}
      style={{
        flexDirection: "row",
        gap: 12,
        backgroundColor: tokens["--vida-surface"],
        borderWidth: 1,
        borderColor: tokens["--vida-border"],
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
      }}
    >
      <View
        style={{
          width: 56,
          height: 80,
          borderRadius: 8,
          backgroundColor: tokens["--vida-primary"],
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <VIcon name="film" size={24} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: tokens["--vida-text-primary"], fontSize: 13, fontWeight: "700" }}>{item.title}</Text>
        <Text style={{ color: tokens["--vida-text-muted"], fontSize: 11, marginTop: 2 }}>
          {item.episode_count} eps · {item.total_views.toLocaleString()} views
        </Text>
        <Text style={{ color: tokens["--vida-success"], fontSize: 11, fontWeight: "600", marginTop: 6, textTransform: "capitalize" }}>
          {item.status}
        </Text>
      </View>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: tokens["--vida-bg"] }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: tokens["--vida-border"],
        }}
      >
        <Text style={{ color: tokens["--vida-text-primary"], fontSize: 17, fontWeight: "700", flex: 1 }}>Creator Studio</Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: "rgba(124, 58, 237, 0.2)",
            borderRadius: 999,
            paddingVertical: 4,
            paddingHorizontal: 10,
          }}
        >
          <VIcon name="trophy" size={14} color={tokens["--vida-primary-light"]} />
          <Text style={{ color: tokens["--vida-primary-light"], fontSize: 12, fontWeight: "700" }}>Creator</Text>
        </View>
      </View>

      <FlatList
        data={series}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={
          <LinearGradient
            colors={["#065f46", "#10b981"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 20, padding: 18, marginBottom: 16 }}
          >
            <Text style={{ fontSize: 11, color: "#6ee7b7", letterSpacing: 1, fontWeight: "600" }}>TOTAL EARNINGS</Text>
            <Text style={{ fontSize: 32, fontWeight: "900", color: "#fff", marginTop: 4 }}>
              ${earnings ? earnings.total_earnings.toFixed(2) : "0.00"}
            </Text>
            <Text style={{ fontSize: 12, color: "#6ee7b7", marginTop: 4 }}>65% of ad revenue + unlocks</Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
              <View style={{ flex: 1 }}>
                <VButton
                  title="Request Payout"
                  onPress={() => router.push("/(authenticated)/creator/earnings")}
                />
              </View>
              <Pressable
                onPress={() => router.push("/(authenticated)/creator/earnings")}
                style={{ backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 999, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" }}
              >
                <VIcon name="stats-chart" size={20} color="#fff" />
              </Pressable>
            </View>
          </LinearGradient>
        }
        renderItem={renderItem}
        ListEmptyComponent={
          loading ? (
            <Text style={{ color: tokens["--vida-text-muted"], textAlign: "center", marginTop: 20 }}>Loading…</Text>
          ) : (
            <Text style={{ color: tokens["--vida-text-muted"], textAlign: "center", marginTop: 20 }}>
              No series yet. Create your first series below.
            </Text>
          )
        }
        ListFooterComponent={
          <View style={{ paddingTop: 8 }}>
            <VButton title="＋ Upload New Series" fullWidth onPress={() => router.push("/(authenticated)/creator/upload")} />
          </View>
        }
      />
    </View>
  );
}
