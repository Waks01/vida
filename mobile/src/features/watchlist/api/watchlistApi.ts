import { httpClient } from "../../../core/api/httpClient";

/** One row from the user's watchlist. */
export interface WatchlistEntry {
  id: string;
  series_id: string;
  series_title: string;
  series_thumbnail_url: string | null;
  added_at: string;
}

/** Wraps backend /users/me/watchlist endpoints. */
export const watchlistApi = {
  async list(limit = 50, offset = 0): Promise<WatchlistEntry[]> {
    try {
      const { data } = await httpClient.get("/users/me/watchlist", {
        params: { limit, offset },
      });
      return ((data as { items?: WatchlistEntry[] }).items ?? []) as WatchlistEntry[];
    } catch {
      return [];
    }
  },

  /**
   * Idempotent — re-adding an already-saved series returns the
   * existing row. We only need the `series_id` to know which series
   * to save; the response is the full entry (with the row id and
   * `added_at`) which the caller can use to update local state.
   */
  async add(seriesId: string): Promise<WatchlistEntry> {
    const { data } = await httpClient.post("/users/me/watchlist", {
      series_id: seriesId,
    });
    return data as WatchlistEntry;
  },

  /** 204 on success; 404 if the series wasn't in the list. */
  async remove(seriesId: string): Promise<void> {
    await httpClient.delete(`/users/me/watchlist/${seriesId}`);
  },
};
