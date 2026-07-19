import { useState } from "react";
import { FlatList, Text, TextInput, View } from "react-native";

import { useFeed } from "../../../src/features/feed/hooks/useFeed";
import { feedApi } from "../../../src/features/feed/api/feedApi";
import { useTheme } from "../../../src/providers/ThemeProvider";

export default function SearchScreen() {
  const { tokens } = useTheme();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ReturnType<typeof useFeed>["series"]>([]);
  const [searching, setSearching] = useState(false);
  const { series, isLoading } = useFeed();

  const onSearch = async (q: string) => {
    setQuery(q);
    const term = q.trim();
    if (!term) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const found = await feedApi.searchSeries(term);
      setResults(found);
    } catch {
      // Fall back to client-side filter of loaded feed.
      setResults(
        series.filter(
          (s) =>
            s.title.toLowerCase().includes(term.toLowerCase()) ||
            (s.description ?? "").toLowerCase().includes(term.toLowerCase())
        )
      );
    } finally {
      setSearching(false);
    }
  };

  const list = query.trim() ? results : series;

  return (
    <View style={{ flex: 1, backgroundColor: tokens["--vida-bg"], padding: 16 }}>
      <Text style={{ color: tokens["--vida-text-primary"], fontSize: 24, fontWeight: "800", marginBottom: 12 }}>
        Search
      </Text>
      <TextInput
        value={query}
        onChangeText={onSearch}
        placeholder="Dramas, genres, creators…"
        placeholderTextColor={tokens["--vida-text-dim"]}
        style={{
          height: 44,
          borderRadius: 12,
          paddingHorizontal: 14,
          backgroundColor: tokens["--vida-surface"],
          color: tokens["--vida-text-primary"],
          marginBottom: 16,
        }}
      />
      {isLoading || searching ? (
        <Text style={{ color: tokens["--vida-text-muted"] }}>Loading…</Text>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View
              style={{
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: tokens["--vida-border"],
              }}
            >
              <Text style={{ color: tokens["--vida-text-primary"], fontWeight: "600" }}>{item.title}</Text>
              <Text style={{ color: tokens["--vida-text-muted"], fontSize: 12, marginTop: 2 }}>
                {item.episodes.length} eps · {item.description ?? ""}
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <Text style={{ color: tokens["--vida-text-muted"], textAlign: "center", marginTop: 24 }}>
              {query.trim() ? "No results found" : "Type to search dramas"}
            </Text>
          }
        />
      )}
    </View>
  );
}
