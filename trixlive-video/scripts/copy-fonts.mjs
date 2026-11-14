// Copia as fontes (licença OFL, via @fontsource) para public/fonts.
import { copyFileSync, mkdirSync } from "node:fs";
const out = new URL("../public/fonts/", import.meta.url);
mkdirSync(out, { recursive: true });
const files = [
  ["space-grotesk", "space-grotesk-latin-500-normal.woff2"],
  ["space-grotesk", "space-grotesk-latin-700-normal.woff2"],
  ["inter", "inter-latin-400-normal.woff2"],
  ["inter", "inter-latin-500-normal.woff2"],
  ["inter", "inter-latin-600-normal.woff2"],
  ["inter", "inter-latin-800-normal.woff2"],
  ["jetbrains-mono", "jetbrains-mono-latin-500-normal.woff2"],
];
for (const [pkg, f] of files) {
  copyFileSync(new URL(`../node_modules/@fontsource/${pkg}/files/${f}`, import.meta.url), new URL(f, out));
}
console.log(`fontes copiadas: ${files.length}`);
