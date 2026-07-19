import { httpClient } from "../../../core/api/httpClient";

import type { SeriesSummary } from "../types";

/** Wraps backend /content endpoints. Falls back to MOCK_SERIES only when the
 * backend is unreachable (offline), so the UI stays exercisable. */
export const feedApi = {
  async listSeries(): Promise<SeriesSummary[]> {
    try {
      const { data } = await httpClient.get("/content/series");
      return data as SeriesSummary[];
    } catch {
      // Backend unreachable → return mock so the UI is still exercisable.
      const { MOCK_SERIES } = await import("../types");
      return MOCK_SERIES;
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

  /** Returns a playable HLS URL for an episode. For Cloudflare Stream content
   * the backend signs a short-lived URL; for external/third-party content it
   * returns the stored public URL as-is. */
  async getStreamUrl(episodeId: string): Promise<string | null> {
    try {
      const { data } = await httpClient.get(`/content/episodes/${episodeId}/stream`);
      return (data as { hls_url?: string | null }).hls_url ?? null;
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

  /** Watch heartbeat — backend records view / detects fraud (accepts payload). */
  async recordWatch(episodeId: string): Promise<void> {
    try {
      await httpClient.post(`/content/episodes/${episodeId}/watch`);
    } catch {
      // Record watch best-effort; ignore network errors.
    }
  },
};
