export interface EpisodeSummary {
  id: string;
  episode_number: number;
  title: string;
  hls_url: string | null;
  thumbnail_url: string | null;
  duration_seconds: number;
  is_premium: boolean;
  coin_cost: number;
  source: string;
  status: string;
}

export interface SeriesSummary {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string;
  status: string;
  category?: string | null;
  total_views: number;
  episodes: EpisodeSummary[];
}

/**
 * One row from GET /users/me/watch-history. The home Resume rail
 * renders one wide card per entry. progress is 0..1 within the
 * current episode.
 */
export interface WatchHistoryEntry {
  id: string;
  series_id: string;
  series_title: string;
  series_thumbnail_url: string | null;
  episode_id: string | null;
  episode_number: number | null;
  episode_duration_seconds: number | null;
  progress: number;
  last_watched_at: string;
}

/** All category keys the backend knows about — mirror of backend SeriesCategory enum. */
export type SeriesCategory =
  // Editorial
  | "hot" | "new" | "trending" | "ranking" | "recommended" | "coming_soon"
  // Format / origin
  | "movies" | "tv_series" | "novel" | "originals"
  | "anime" | "asian" | "nigerian" | "latino"
  // Tropes
  | "heartbreak" | "love_hate" | "first_love" | "secret_baby"
  | "werewolf" | "vampire" | "zombie" | "reborn" | "time_travel"
  | "revenge" | "mafia" | "ceo" | "royalty" | "doctor";

/** Static chip definitions used by the home category rows. */
export const FORM_CATEGORIES: { key: SeriesCategory; label: string }[] = [
  { key: "hot", label: "Hot" },
  { key: "new", label: "New" },
  { key: "trending", label: "Trending" },
  { key: "ranking", label: "Ranking" },
  { key: "recommended", label: "Recommended" },
  { key: "coming_soon", label: "Coming soon" },
  { key: "movies", label: "Movies" },
  { key: "tv_series", label: "TV series" },
  { key: "novel", label: "Novel" },
  { key: "originals", label: "Originals" },
  { key: "anime", label: "Anime" },
  { key: "asian", label: "Asian" },
  { key: "nigerian", label: "Nigerian" },
  { key: "latino", label: "Latino" },
];

export const TROPE_CATEGORIES: { key: SeriesCategory; label: string }[] = [
  { key: "heartbreak", label: "Heartbreak" },
  { key: "love_hate", label: "Love-Hate" },
  { key: "first_love", label: "First love" },
  { key: "secret_baby", label: "Secret baby" },
  { key: "werewolf", label: "Werewolf" },
  { key: "vampire", label: "Vampire" },
  { key: "zombie", label: "Zombie" },
  { key: "reborn", label: "Reborn" },
  { key: "time_travel", label: "Time travel" },
  { key: "revenge", label: "Revenge" },
  { key: "mafia", label: "Mafia" },
  { key: "ceo", label: "CEO" },
  { key: "royalty", label: "Royalty" },
  { key: "doctor", label: "Doctor" },
];
