import { useState, useEffect } from "react";
import { FlatList, Text, View, TouchableOpacity, Alert } from "react-native";
import { httpClient } from "../../../core/api/httpClient";
import { useTheme } from "../../../providers/ThemeProvider";

interface PendingItem {
  id: string;
  title: string;
  creator_id: string;
  status: string;
  episode_count: number;
}

export default function AdminPendingScreen() {
  const { tokens } = useTheme();
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPending();
  }, []);

  const loadPending = async () => {
    try {
      const { data } = await httpClient.get("/admin/content/pending");
      setPending(data as PendingItem[]);
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to load pending content");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (seriesId: string) => {
    try {
      await httpClient.post(`/admin/content/${seriesId}/approve`);
      Alert.alert("Approved", "Series published successfully");
      loadPending();
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Approval failed");
    }
  };

  const renderItem = ({ item }: { item: PendingItem }) => (
    <View
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
        {item.episode_count} episodes · Creator: {item.creator_id.slice(0, 8)}
      </Text>
      <TouchableOpacity
        onPress={() => handleApprove(item.id)}
        style={{
          marginTop: 12,
          backgroundColor: tokens["--vida-primary"],
          padding: 10,
          borderRadius: 8,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "600" }}>Approve & Publish</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: tokens["--vida-bg"], padding: 16 }}>
      <Text style={{ color: tokens["--vida-text-primary"], fontSize: 24, fontWeight: "800", marginBottom: 16 }}>
        Pending Approval
      </Text>

      {loading ? (
        <Text style={{ color: tokens["--vida-text-muted"], textAlign: "center", marginTop: 20 }}>
          Loading…
        </Text>
      ) : (
        <FlatList
          data={pending}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={
            <Text style={{ color: tokens["--vida-text-muted"], textAlign: "center", marginTop: 20 }}>
              No pending series
            </Text>
          }
        />
      )}
    </View>
  );
}
