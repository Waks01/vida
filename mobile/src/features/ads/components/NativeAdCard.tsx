import { useEffect, useState } from "react";
import { Image, Text, View, type ViewStyle } from "react-native";
import {
  NativeAdView,
  NativeAsset,
  NativeAssetType,
  NativeMediaView,
  type NativeAd,
} from "react-native-google-mobile-ads";

import { useTheme } from "../../../providers/ThemeProvider";
import { nativeAdPool } from "../pool";

interface NativeAdCardProps {
  /** "grid" = compact card for the feed/series grid; "full" = full-screen player slot. */
  variant?: "grid" | "full";
  style?: ViewStyle;
}

/**
 * AdMob Native Ad surface. Clearly labelled "AD" per AdMob policy. Pulls a
 * pre-fetched ad from the background `nativeAdPool` (kept warm from app
 * launch) so it's ready before the card scrolls into view — no load flash.
 * Falls back to a placeholder if the pool is momentarily empty.
 */
export function NativeAdCard({ variant = "grid", style }: NativeAdCardProps) {
  const { tokens } = useTheme();
  const [nativeAd, setNativeAd] = useState<NativeAd | null>(null);
  const [waiting, setWaiting] = useState(true);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    const pull = () => {
      const ad = nativeAdPool.consume();
      if (ad && active) {
        setNativeAd(ad);
        setWaiting(false);
        if (timer) clearInterval(timer);
      }
    };

    pull();
    if (!nativeAd) {
      // Pool still warming: poll briefly until an ad is ready.
      timer = setInterval(pull, 500);
    }

    return () => {
      active = false;
      if (timer) clearInterval(timer);
    };
  }, []);

  const isFull = variant === "full";

  const baseStyle: ViewStyle = {
    backgroundColor: tokens["--vida-surface"],
    borderRadius: 14,
    borderWidth: 1,
    borderColor: tokens["--vida-border"],
    overflow: "hidden",
    ...(isFull ? { height: "100%" } : { aspectRatio: 2 / 3 }),
    ...style,
  };

  if (waiting || !nativeAd) {
    return (
      <View style={baseStyle}>
        <View
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            backgroundColor: tokens["--vida-text-dim"],
            borderRadius: 4,
            paddingHorizontal: 6,
            paddingVertical: 2,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>AD</Text>
        </View>
      </View>
    );
  }

  return (
    <NativeAdView nativeAd={nativeAd}>
      <View style={[baseStyle, { padding: isFull ? 16 : 10 }]}>
        <View
          style={{
            alignSelf: "flex-start",
            backgroundColor: tokens["--vida-text-dim"],
            borderRadius: 4,
            paddingHorizontal: 6,
            paddingVertical: 2,
            marginBottom: 8,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>AD</Text>
        </View>

        {isFull && nativeAd.mediaContent ? (
          <NativeAsset assetType={NativeAssetType.IMAGE}>
            <NativeMediaView
              style={{ width: "100%", height: 320, borderRadius: 10, backgroundColor: "#000" }}
            />
          </NativeAsset>
        ) : null}

        <NativeAsset assetType={NativeAssetType.HEADLINE}>
          <Text
            style={{
              color: tokens["--vida-text-primary"],
              fontSize: isFull ? 18 : 13,
              fontWeight: "700",
              marginBottom: 4,
            }}
            numberOfLines={isFull ? 2 : 1}
          >
            {nativeAd.headline}
          </Text>
        </NativeAsset>

        {nativeAd.body ? (
          <NativeAsset assetType={NativeAssetType.BODY}>
            <Text
              style={{ color: tokens["--vida-text-muted"], fontSize: isFull ? 14 : 11 }}
              numberOfLines={isFull ? 3 : 2}
            >
              {nativeAd.body}
            </Text>
          </NativeAsset>
        ) : null}

        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8, gap: 8 }}>
          {nativeAd.icon?.url ? (
            <NativeAsset assetType={NativeAssetType.ICON}>
              <Image
                source={{ uri: nativeAd.icon.url }}
                style={{ width: 28, height: 28, borderRadius: 14 }}
              />
            </NativeAsset>
          ) : null}
          {nativeAd.advertiser ? (
            <NativeAsset assetType={NativeAssetType.ADVERTISER}>
              <Text style={{ color: tokens["--vida-text-dim"], fontSize: 11 }} numberOfLines={1}>
                {nativeAd.advertiser}
              </Text>
            </NativeAsset>
          ) : null}
        </View>

        {nativeAd.callToAction ? (
          <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
            <View
              style={{
                marginTop: 10,
                alignSelf: "flex-start",
                backgroundColor: tokens["--vida-primary"],
                borderRadius: 10,
                paddingHorizontal: 16,
                paddingVertical: 8,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: isFull ? 15 : 12 }}>
                {nativeAd.callToAction}
              </Text>
            </View>
          </NativeAsset>
        ) : null}
      </View>
    </NativeAdView>
  );
}
