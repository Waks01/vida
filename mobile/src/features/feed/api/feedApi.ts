import { httpClient } from "../../../core/api/httpClient";

import type { SeriesSummary, StreamResolveResponse, WatchHistoryEntry } from "../types";

/** Wraps backend /content endpoints. */
export const feedApi = {
  async listSeries(category?: string): Promise<SeriesSummary[]> {
    try {
      const params = category ? { category } : undefined;
      const { data } = await httpClient.get("/content/series", { params });
      return data as SeriesSummary[];
    } catch {
      return [];
    }
  },

  async getSeries(id: string): Promise<SeriesSummary | null> {
    try {
      const { data } = await httpClient.get(`/content/series/${id}`);
      return data as SeriesSummary;
    } catch {
      return null;
    }
  },

  async getStreamUrl(episodeId: string): Promise<StreamResolveResponse | null> {
    try {
      const { data } = await httpClient.get(`/content/episodes/${episodeId}/stream`);
      return data as StreamResolveResponse;
    } catch {
      return null;
    }
  },

  /** Server-side search by title (falls back to the loaded feed on error). */
  async searchSeries(query: string): Promise<SeriesSummary[]> {
    try {
      const { data } = await httpClient.get("/content/search", { params: { q: query } });
      return data as SeriesSummary[];
    } catch {
      return [];
    }
  },

  /** Watch heartbeat — backend records view + upserts watch-history (accepts payload). */
  async recordWatch(episodeId: string, progress = 0): Promise<void> {
    try {
      await httpClient.post(`/content/episodes/${episodeId}/watch`, null, {
        params: { progress },
      });
    } catch {
      // Record watch best-effort; ignore network errors.
    }
  },

  /**
   * Resume rail: returns the user's most-recently-watched series, in
   * last-watched order. Empty array when the user hasn't watched
   * anything yet (the home hides the Resume shelf in that case).
   */
  async getWatchHistory(limit = 4): Promise<WatchHistoryEntry[]> {
    try {
      const { data } = await httpClient.get("/users/me/watch-history", {
        params: { limit },
      });
      return ((data as { items?: WatchHistoryEntry[] }).items ?? []) as WatchHistoryEntry[];
    } catch {
      return [];
    }
  },

  /** Read the current user's like state for an episode. */
  async getEpisodeLike(episodeId: string): Promise<{ liked: boolean; total_likes: number }> {
    try {
      const { data } = await httpClient.get(`/content/episodes/${episodeId}/like`);
      return data as { liked: boolean; total_likes: number };
    } catch {
      return { liked: false, total_likes: 0 };
    }
  },

  /** Idempotent — re-liking is a no-op. */
  async likeEpisode(episodeId: string): Promise<{ liked: boolean; total_likes: number }> {
    const { data } = await httpClient.post(`/content/episodes/${episodeId}/like`);
    return data as { liked: boolean; total_likes: number };
  },

  /** 404 when the user hadn't liked the episode. */
  async unlikeEpisode(episodeId: string): Promise<{ liked: boolean; total_likes: number }> {
    const { data } = await httpClient.delete(`/content/episodes/${episodeId}/like`);
    return data as { liked: boolean; total_likes: number };
  },
};
