import { httpClient } from "../../../core/api/httpClient";

export interface CreatorApplyPayload {
  display_name: string;
  payout_method: string;
  payout_details: string;
}

export interface CreatorEarnings {
  total_earnings: number;
  pending_payout: number;
  series_count: number;
}

export interface SeriesSummary {
  id: string;
  title: string;
  description: string | null;
  genre_id: number | null;
  thumbnail_url: string | null;
  status: string;
  total_views: number;
  episodes: EpisodeSummary[];
}

export interface EpisodeSummary {
  id: string;
  episode_number: number;
  title: string;
  hls_url: string | null;
  thumbnail_url: string | null;
  duration_seconds: number;
  is_premium: boolean;
  coin_cost: number;
  status: string;
  video_key: string | null;
  video_site: string | null;
}

export interface CreateSeriesPayload {
  title: string;
  description?: string | null;
  genre_id?: number | null;
  thumbnail_url?: string | null;
}

export interface EpisodeUploadUrl {
  series_id: string;
  episode_id: string;
  stream_uid: string | null;
  upload_url: string;
  expires_in: number;
  method: string;
}

export interface PayoutPublic {
  id: string;
  provider: string;
  amount: number;
  currency: string;
  status: string;
  provider_ref: string | null;
  failure_reason: string | null;
  created_at: string;
  processed_at: string | null;
}

export const creatorsApi = {
  async apply(payload: CreatorApplyPayload): Promise<CreatorEarnings> {
    const { data } = await httpClient.post("/creators/apply", payload);
    return data as CreatorEarnings;
  },

  async getEarnings(): Promise<CreatorEarnings> {
    const { data } = await httpClient.get("/creators/earnings");
    return data as CreatorEarnings;
  },

  async getPayouts(limit = 50, offset = 0): Promise<PayoutPublic[]> {
    const { data } = await httpClient.get("/creators/payouts", { params: { limit, offset } });
    return data as PayoutPublic[];
  },

  async createSeries(payload: CreateSeriesPayload): Promise<SeriesSummary> {
    const { data } = await httpClient.post("/creators/series", payload);
    return data as SeriesSummary;
  },

  async getSeriesList(): Promise<SeriesSummary[]> {
    const { data } = await httpClient.get("/creators/series");
    return data as SeriesSummary[];
  },

  async requestPayout(pin: string): Promise<CreatorEarnings> {
    const { data } = await httpClient.post("/creators/payout/request", { pin });
    return data as CreatorEarnings;
  },

  async getEpisodeUploadUrl(
    seriesId: string,
    opts: {
      filename: string;
      content_type?: string;
      episode_title?: string;
      episode_number?: number;
      coin_cost?: number;
    }
  ): Promise<EpisodeUploadUrl> {
    const { data } = await httpClient.post(
      `/creators/episodes/upload-url?series_id=${seriesId}`,
      {
        filename: opts.filename,
        content_type: opts.content_type ?? "video/mp4",
        episode_title: opts.episode_title ?? "Untitled Episode",
        episode_number: opts.episode_number ?? 1,
        coin_cost: opts.coin_cost ?? 25,
      }
    );
    return data as EpisodeUploadUrl;
  },
};
