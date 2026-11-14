import { Config } from "@remotion/cli/config";

// Navegador: usa o Chromium do sistema se definido (ex.: ambientes sem download do headless-shell).
if (process.env.REMOTION_BROWSER) {
  Config.setBrowserExecutable(process.env.REMOTION_BROWSER);
}
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
Config.setCodec("h264");
Config.setCrf(16);
Config.setPixelFormat("yuv420p");
Config.setAudioCodec("aac");
Config.setAudioBitrate("320k");
Config.setColorSpace("bt709");
Config.setConcurrency(Number(process.env.REMOTION_CONCURRENCY || 4));
Config.setChromiumOpenGlRenderer("swangle");
Config.setOverwriteOutput(true);
