import { useState, useEffect } from "react";
import { FlatList, Text, View, TouchableOpacity, Alert } from "react-native";
import { router } from "expo-router";
import { creatorsApi } from "../../feed/api/creatorsApi";
import { useTheme } from "../../../providers/ThemeProvider";

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSeries();
  }, []);

  const loadSeries = async () => {
    try {
      const data = await creatorsApi.getSeriesList();
      setSeries(data.map((s) => ({
        id: s.id,
        title: s.title,
        status: s.status,
        total_views: s.total_views,
        episode_count: s.episodes?.length ?? 0,
      })));
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to load series");
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: SeriesItem }) => (
    <TouchableOpacity
      onPress={() => router.push({ pathname: "/(authenticated)/series/[id]", params: { id: item.id } })}
      style={{
        padding: 16,
        backgroundColor: tokens["--vida-surface"],
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: tokens["--vida-border"],
      }}
    >
      <Text style={{ color: tokens["--vida-text-primary"], fontSize: 16, fontWeight: "700" }}>
        {item.title}
      </Text>
      <Text style={{ color: tokens["--vida-text-muted"], fontSize: 13, marginTop: 4 }}>
        {item.episode_count} episodes · {item.total_views} views
      </Text>
      <Text style={{ color: tokens["--vida-accent"], fontSize: 12, marginTop: 4, textTransform: "capitalize" }}>
        {item.status}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: tokens["--vida-bg"], padding: 16 }}>
      <Text style={{ color: tokens["--vida-text-primary"], fontSize: 24, fontWeight: "800", marginBottom: 16 }}>
        Creator Dashboard
      </Text>

      <TouchableOpacity
        onPress={() => Alert.alert("Coming soon", "Series creation form will open here.")}
        style={{
          backgroundColor: tokens["--vida-primary"],
          padding: 14,
          borderRadius: 12,
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "700" }}>+ New Series</Text>
      </TouchableOpacity>

      {loading ? (
        <Text style={{ color: tokens["--vida-text-muted"], textAlign: "center", marginTop: 20 }}>
          Loading…
        </Text>
      ) : (
        <FlatList
          data={series}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={
            <Text style={{ color: tokens["--vida-text-muted"], textAlign: "center", marginTop: 20 }}>
              No series yet. Create your first series above.
            </Text>
          }
        />
      )}
    </View>
  );
}
