import { Svg, Path, Defs, LinearGradient, Stop } from "react-native-svg";

/** Brand logo — verbatim from assets/logo.svg (the Vida loop "V" mark). */
export function VidaLogo({ size = 92 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="vida" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#ff2d95" />
          <Stop offset="0.5" stopColor="#8b2dff" />
          <Stop offset="1" stopColor="#22d3ee" />
        </LinearGradient>
      </Defs>
      <Path
        d="M50 16 C30 40 14 58 14 70 C14 82 26 90 50 90 C74 90 86 82 86 70 C86 58 70 40 50 16 Z"
        fill="none"
        stroke="url(#vida)"
        strokeWidth={11}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M34 64 C40 74 60 74 66 64"
        fill="none"
        stroke="url(#vida)"
        strokeWidth={9}
        strokeLinecap="round"
      />
    </Svg>
  );
}
