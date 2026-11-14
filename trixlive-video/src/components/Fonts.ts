import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

let loaded: Promise<unknown> | null = null;
export const loadFonts = () => {
  if (loaded) return loaded;
  const f = (family: string, file: string, weight: string) =>
    loadFont({ family, url: staticFile(`fonts/${file}`), weight, format: "woff2" });
  loaded = Promise.all([
    f("SpaceGrotesk", "space-grotesk-latin-500-normal.woff2", "500"),
    f("SpaceGrotesk", "space-grotesk-latin-700-normal.woff2", "700"),
    f("Inter", "inter-latin-400-normal.woff2", "400"),
    f("Inter", "inter-latin-500-normal.woff2", "500"),
    f("Inter", "inter-latin-600-normal.woff2", "600"),
    f("Inter", "inter-latin-800-normal.woff2", "800"),
    f("JetBrainsMono", "jetbrains-mono-latin-500-normal.woff2", "500"),
  ]);
  return loaded;
};
