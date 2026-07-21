import { Image } from "react-native";

const logo = require("../../../assets/icon.png");

export function VidaLogo({ size = 28 }: { size?: number }) {
  return (
    <Image
      source={logo}
      style={{ width: size, height: size, resizeMode: "contain" }}
    />
  );
}
