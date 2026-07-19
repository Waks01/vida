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
  thumbnail_url: string | null;
  status: string;
  total_views: number;
  episodes: EpisodeSummary[];
}

/** Placeholder feed for Phase 0 (backend /content returns empty until seeded). */
export const MOCK_SERIES: SeriesSummary[] = [
  {
    id: "s1",
    title: "Midnight Heir",
    description: "A stolen inheritance, a forbidden love.",
    thumbnail_url: null,
    status: "published",
    total_views: 128400,
    episodes: [
      {
        id: "s1e1",
        episode_number: 1,
        title: "The Will",
        hls_url: null,
        thumbnail_url: null,
        duration_seconds: 60,
        is_premium: true,
        coin_cost: 25,
        source: "stream",
        status: "published",
      },
    ],
  },
  {
    id: "s2",
    title: "Coffee & Curves",
    description: "Baristas, secrets, and one espresso machine.",
    thumbnail_url: null,
    status: "published",
    total_views: 84210,
    episodes: [
      {
        id: "s2e1",
        episode_number: 1,
        title: "Opening Shift",
        hls_url: null,
        thumbnail_url: null,
        duration_seconds: 60,
        is_premium: false,
        coin_cost: 0,
        source: "stream",
        status: "published",
      },
    ],
  },
];
