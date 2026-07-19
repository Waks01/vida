import { httpClient } from "../../../core/api/httpClient";

export interface CoinPack {
  id: string;
  coins: number;
  priceUsd: number;
}

export interface CoinTransaction {
  id: string;
  amount: number;
  source: string;
  balance_after: number;
  created_at: string;
}

export interface PaymentMethod {
  id: string;
  provider: string;
  label: string;
}

/** Returns purchasable coin packs. Backed by backend /wallet in Phase 1. */
export const walletApi = {
  async getBalance(): Promise<number> {
    try {
      const { data } = await httpClient.get("/wallet/balance");
      return (data as { balance: number }).balance;
    } catch {
      return 0;
    }
  },

  async listPacks(): Promise<{ coinRate: number; minNgn: number; stepNgn: number }> {
    try {
      const { data } = await httpClient.get("/wallet/packs");
      return data as { coinRate: number; minNgn: number; stepNgn: number };
    } catch {
      return { coinRate: 10, minNgn: 100, stepNgn: 100 };
    }
  },

  async getTransactions(limit = 50): Promise<CoinTransaction[]> {
    try {
      const { data } = await httpClient.get("/wallet/transactions", { params: { limit } });
      return data as CoinTransaction[];
    } catch {
      return [];
    }
  },

  async dailyCheckIn(): Promise<{ awarded: number; balance: number }> {
    const { data } = await httpClient.post("/wallet/checkin/daily");
    return data as { awarded: number; balance: number };
  },

  async completeAd(adUnitId: string, deviceId: string, callbackToken: string) {
    try {
      const { data } = await httpClient.post("/wallet/ads/complete", {
        ad_unit_id: adUnitId,
        device_id: deviceId,
        callback_token: callbackToken,
      });
      return data as {
        awarded: number;
        balance: number;
        daily_remaining: number;
      };
    } catch (error) {
      const axiosError = error as { response?: { data?: { detail?: string } } };
      throw new Error(axiosError?.response?.data?.detail ?? "Failed to credit ad reward");
    }
  },

  async startPurchase(packId: string, provider: "paystack" | "stripe" | "googlepay", pin: string, amount?: number) {
    const { data } = await httpClient.post("/payments/initialize", {
      provider,
      product_id: packId,
      amount: amount ?? 0,
      pin,
    });
    return data as { provider: string; client_token: string; reference: string };
  },

  async getPaymentMethods(): Promise<PaymentMethod[]> {
    try {
      const { data } = await httpClient.get("/payments/methods");
      return data as PaymentMethod[];
    } catch {
      return [];
    }
  },

  async confirmPayment(reference: string) {
    const { data } = await httpClient.post("/payments/confirm", { reference });
    return data as { status: string; balance?: number };
  },

  async cancelSubscription(pin: string) {
    const { data } = await httpClient.post("/subscription/cancel", { pin });
    return data as { cancelled: boolean };
  },
};
