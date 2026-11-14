// Renderiza quadros específicos (inspeção visual / folha de contato). Uso: node scripts/stills.mjs out/stills 100 200 ...
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
import { mkdirSync } from "node:fs";

const [outDir, ...frames] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const browserExecutable = process.env.REMOTION_BROWSER || null;
const composition = await selectComposition({ serveUrl, id: "TrixLivePromo", browserExecutable });
for (const fr of frames.map(Number)) {
  const output = path.join(outDir, `f${String(fr).padStart(5, "0")}.jpg`);
  await renderStill({ composition, serveUrl, frame: fr, output, imageFormat: "jpeg", jpegQuality: 85, browserExecutable, chromiumOptions: { gl: "swangle" } });
  console.log("ok", output);
}
