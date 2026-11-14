// Teste do script de captura contra o app fixture local (NÃO é a TrixLive). Saída em out/capture-test/.
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
const html = readFileSync(new URL("./fixture-app.html", import.meta.url));
const srv = createServer((_, res) => { res.setHeader("content-type", "text/html; charset=utf-8"); res.end(html); }).listen(8777);
const p = spawn("node", ["scripts/capture.mjs"], { stdio: "inherit", env: { ...process.env, TRIX_URL: "http://localhost:8777/", TRIX_CAPTURE_DIR: "out/capture-test" } });
p.on("exit", (c) => { srv.close(); process.exit(c ?? 1); });
