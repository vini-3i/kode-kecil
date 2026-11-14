#!/usr/bin/env node
/**
 * Captura automatizada da plataforma TrixLive (https://korabots.com.br) para o vídeo.
 *
 * Gera:
 *   public/captures/*.png            capturas 1920x1080 de cada etapa da jornada
 *   src/data/captures.json           identidade visual extraída + caixas (x,y,w,h) dos elementos
 *                                    usadas para zoom, cursor, destaques e mascaramento no vídeo
 *
 * Demonstração CONTROLADA: dois contextos de navegador próprios (anfitrião "Demo TrixLive" e
 * convidado "Convidado Demo"), sem usuários reais. A tela compartilhada é um conteúdo de
 * demonstração original (src/shared/demoGame.js) entregue via override de getDisplayMedia
 * SOMENTE no navegador de captura. O microfone é um áudio de demonstração (fake device).
 * Nenhuma ação administrativa é executada; o site não é modificado.
 * Links/códigos de sala são desfocados antes de cada captura e nunca gravados em disco.
 *
 * Uso:
 *   node scripts/capture.mjs                    # automático (headless)
 *   node scripts/capture.mjs --headed           # visível, para acompanhar
 *   node scripts/capture.mjs --manual           # você conduz; o script captura a cada Enter
 *   TRIX_URL=https://korabots.com.br node scripts/capture.mjs
 *
 * Seletores: se alguma heurística falhar, defina o seletor CSS em capture.config.json
 * (veja capture.config.example.json). O relatório no fim lista o que foi/ não foi encontrado.
 */
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TEST_DIR = process.env.TRIX_CAPTURE_DIR; // usado só pelo teste do script
const OUT = TEST_DIR ? path.join(TEST_DIR, "captures") : path.join(ROOT, "public/captures");
const JSON_OUT = TEST_DIR ? path.join(TEST_DIR, "captures.json") : path.join(ROOT, "src/data/captures.json");
const BASE = process.env.TRIX_URL || "https://korabots.com.br/";
const HEADED = process.argv.includes("--headed") || process.argv.includes("--manual");
const MANUAL = process.argv.includes("--manual");
const W = 1920, H = 1080;
const HOST_NICK = "Demo TrixLive";
const GUEST_NICK = "Convidado Demo";

const cfgPath = path.join(ROOT, "capture.config.json");
const CFG = existsSync(cfgPath) ? JSON.parse(readFileSync(cfgPath, "utf8")) : {};
const SEL = CFG.selectors || {};

mkdirSync(OUT, { recursive: true });
const report = [];
const log = (ok, what, extra = "") => {
  report.push({ ok, what, extra });
  console.log(`${ok ? "✔" : "✘"} ${what}${extra ? "  — " + extra : ""}`);
};

// ------------------------------------------------------------------ servidor local (áudio demo)
const micWav = path.join(ROOT, "public/audio/demo-mic.wav");
const browserArgs = [
  "--use-fake-ui-for-media-stream",
  "--use-fake-device-for-media-stream",
  ...(existsSync(micWav) ? [`--use-file-for-fake-audio-capture=${micWav}`] : []),
  "--autoplay-policy=no-user-gesture-required",
  "--lang=pt-BR",
];

// Override de getDisplayMedia: devolve o canvas do conteúdo de demonstração (somente neste navegador).
const demoSrc = readFileSync(path.join(ROOT, "src/shared/demoGame.js"), "utf8").replace(/^export\s+/m, "");
const initScript = `
(() => {
  ${demoSrc}
  const make = () => {
    const c = document.createElement('canvas'); c.width = 1280; c.height = 720;
    const ctx = c.getContext('2d'); const t0 = performance.now();
    const loop = () => { drawDemoGame(ctx, c.width, c.height, (performance.now() - t0) / 1000); requestAnimationFrame(loop); };
    loop(); return c.captureStream(30);
  };
  if (navigator.mediaDevices) {
    navigator.mediaDevices.getDisplayMedia = async () => {
      const s = make(); const tr = s.getVideoTracks()[0];
      try { Object.defineProperty(tr, 'label', { value: 'Órbita Neon (demonstração)' }); } catch (e) {}
      return s;
    };
  }
})();`;

// ------------------------------------------------------------------ utilidades
async function firstVisible(page, candidates) {
  for (const c of candidates) {
    if (!c) continue;
    try {
      const loc = typeof c === "string" ? page.locator(c) : c;
      const n = await loc.count();
      for (let i = 0; i < Math.min(n, 8); i++) {
        const el = loc.nth(i);
        if (await el.isVisible()) return el;
      }
    } catch {}
  }
  return null;
}
const btn = (page, re) => [
  page.getByRole("button", { name: re }),
  page.getByRole("link", { name: re }),
  page.locator("button, [role=button], a, input[type=submit], input[type=button]").filter({ hasText: re }),
];
async function box(el) {
  if (!el) return null;
  const b = await el.boundingBox().catch(() => null);
  if (!b || b.width < 2 || b.height < 2) return null;
  return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
}

/** Desfoca no próprio navegador (somente local, para a captura) textos que contenham segredos. */
async function redact(page, secrets) {
  const list = secrets.filter((s) => s && s.length >= 4);
  return page.evaluate((list) => {
    const out = [];
    const all = document.querySelectorAll("body *");
    for (const el of all) {
      const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(" ");
      const val = el.value || el.getAttribute?.("href") || "";
      const hit = list.some((s) => own.includes(s) || (typeof val === "string" && val.includes(s)));
      const isQr = /qr/i.test(el.className?.baseVal ?? el.className ?? "") || /qr/i.test(el.getAttribute?.("alt") || "") || /qr/i.test(el.id || "");
      if (hit || isQr) {
        el.style.filter = "blur(7px)";
        const r = el.getBoundingClientRect();
        if (r.width > 2) out.push({ x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), kind: isQr ? "qr" : "secret" });
      }
    }
    return out;
  }, list);
}

async function shot(page, name, secrets = []) {
  await page.waitForTimeout(500);
  const redacted = await redact(page, secrets);
  const file = `captures/${name}.png`;
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  log(true, `captura ${name}`, redacted.length ? `${redacted.length} área(s) mascarada(s)` : "");
  return { image: file, redacted };
}

async function extractBrand(page) {
  return page.evaluate(() => {
    const cs = (el) => (el ? getComputedStyle(el) : null);
    const body = cs(document.body);
    const isTransparent = (c) => !c || c === "transparent" || /rgba\(.*,\s*0\)$/.test(c);
    let bg = body.backgroundColor;
    if (isTransparent(bg)) bg = cs(document.documentElement).backgroundColor;
    const buttons = [...document.querySelectorAll("button, a[class*=btn], [role=button]")].filter((b) => b.offsetWidth > 40);
    const colors = {};
    for (const b of buttons) {
      const c = cs(b).backgroundColor;
      if (!isTransparent(c)) colors[c] = (colors[c] || 0) + b.offsetWidth * b.offsetHeight;
      const bi = cs(b).backgroundImage;
      if (bi && bi.includes("gradient")) colors[bi] = (colors[bi] || 0) + b.offsetWidth * b.offsetHeight;
    }
    const sorted = Object.entries(colors).sort((a, b) => b[1] - a[1]).map((e) => e[0]);
    const h1 = document.querySelector("h1, h2");
    const logo = [...document.querySelectorAll("img, svg")].find((i) => /logo|brand|trix/i.test((i.getAttribute("alt") || "") + (i.getAttribute("class") || "") + (i.getAttribute("src") || "")));
    const icon = document.querySelector("link[rel~=icon]");
    return {
      title: document.title,
      headline: h1 ? h1.innerText.trim().slice(0, 140) : null,
      background: bg,
      text: body.color,
      primary: sorted[0] || null,
      secondary: sorted[1] || null,
      fontFamily: body.fontFamily,
      headingFont: h1 ? cs(h1).fontFamily : null,
      themeColor: document.querySelector("meta[name=theme-color]")?.content || null,
      logoSrc: logo?.tagName === "IMG" ? logo.src : null,
      iconHref: icon ? icon.href : null,
    };
  });
}

async function optionsOf(el) {
  if (!el) return [];
  return el.evaluate((n) => {
    if (n.tagName === "SELECT") return [...n.options].map((o) => o.textContent.trim()).filter(Boolean);
    const scope = n.closest("fieldset, form, section, div") || n;
    return [...scope.querySelectorAll("label, button, [role=radio], [role=option], option")]
      .map((x) => x.innerText?.trim()).filter((t) => t && t.length < 40).slice(0, 8);
  }).catch(() => []);
}

// ------------------------------------------------------------------ fluxo
async function main() {
  const browser = await chromium.launch({
    headless: !HEADED,
    args: browserArgs,
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  });
  const ctxOpts = { viewport: { width: W, height: H }, deviceScaleFactor: 1, locale: "pt-BR", permissions: ["microphone", "camera"] };
  const host = await browser.newContext(ctxOpts);
  await host.addInitScript(initScript);
  const page = await host.newPage();
  const data = { source: new URL(BASE).hostname, capturedAt: new Date().toISOString(), viewport: { w: W, h: H }, brand: {}, shots: {}, options: {} };
  const secrets = [];

  if (MANUAL) return manual(browser, page, data);

  await page.goto(BASE, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1500);
  data.brand = await extractBrand(page);
  log(true, "identidade visual", `${data.brand.title} · fundo ${data.brand.background} · primária ${data.brand.primary}`);
  if (data.brand.logoSrc) {
    try {
      const r = await page.request.get(data.brand.logoSrc);
      const ext = (data.brand.logoSrc.split("?")[0].match(/\.(png|svg|webp|jpg|jpeg)$/i) || [, "png"])[1];
      writeFileSync(path.join(OUT, `logo.${ext}`), await r.body());
      data.brand.logo = `captures/logo.${ext}`;
    } catch {}
  }

  // elementos da página inicial
  const nick = await firstVisible(page, [SEL.nickname, page.getByPlaceholder(/apelido|nick|nome/i), page.getByLabel(/apelido|nick|nome/i), "input[type=text]:visible"]);
  const profile = await firstVisible(page, [SEL.profile, page.getByLabel(/perfil/i), page.locator("select"), page.locator("[class*=perfil], [class*=profile], [data-profile]"), page.getByText(/perfil/i)]);
  const mic = await firstVisible(page, [SEL.micTest, ...btn(page, /testar|teste.*micro|microfone|mic/i)]);
  const create = await firstVisible(page, [SEL.createRoom, ...btn(page, /criar\s*sala|nova\s*sala|criar|create/i)]);
  data.shots.home = { ...(await shot(page, "home")), boxes: { nickname: await box(nick), profile: await box(profile), mic: await box(mic), create: await box(create) } };
  await page.screenshot({ path: path.join(OUT, "home-full.png"), fullPage: true });
  data.shots.home.fullPage = "captures/home-full.png";
  data.shots.home.fullHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  for (const [k, v] of Object.entries(data.shots.home.boxes)) log(!!v, `elemento ${k}`);
  data.options.profiles = await optionsOf(profile);
  if (data.options.profiles.length) log(true, "perfis encontrados", data.options.profiles.join(" | "));

  // 1) apelido
  if (nick) {
    await nick.click();
    await nick.fill("");
    await nick.pressSequentially(HOST_NICK, { delay: 60 });
    data.shots.nickname = { ...(await shot(page, "nickname")), boxes: { nickname: await box(nick) } };
  }
  // 2) perfil
  if (profile) {
    const tag = await profile.evaluate((n) => n.tagName).catch(() => "");
    if (tag === "SELECT") {
      const opts = await profile.locator("option").all();
      if (opts.length > 1) await profile.selectOption({ index: 1 }).catch(() => {});
    } else {
      await profile.click().catch(() => {});
    }
    data.shots.profile = { ...(await shot(page, "profile")), boxes: { profile: await box(profile) } };
  }
  // 3) teste de microfone
  if (mic) {
    await mic.click().catch(() => {});
    await page.waitForTimeout(2200);
    data.shots.mic = { ...(await shot(page, "mic")), boxes: { mic: await box(mic) } };
  }
  // 4) criar sala
  if (!create) {
    log(false, "botão de criar sala não encontrado — defina selectors.createRoom em capture.config.json");
  } else {
    const before = page.url();
    await create.click();
    await page.waitForTimeout(3500);
    const roomUrl = page.url();
    if (roomUrl !== before) {
      secrets.push(roomUrl, new URL(roomUrl).pathname.replace(/^\/+/, ""), new URL(roomUrl).search.slice(1), new URL(roomUrl).hash.slice(1));
    }
    // códigos visíveis (ex.: "ABC-123") também são tratados como segredo
    const codes = await page.evaluate(() => (document.body.innerText.match(/\b[A-Z0-9]{4,}(?:-[A-Z0-9]{3,})*\b/g) || []).filter((c) => /\d/.test(c)));
    secrets.push(...codes);
    const inviteBtn = await firstVisible(page, [SEL.invite, ...btn(page, /convid|convite|copiar|link|compartilhar\s*sala/i)]);
    const share = await firstVisible(page, [SEL.shareScreen, ...btn(page, /compartilhar\s*tela|transmitir|iniciar\s*compart|share/i)]);
    data.shots.room = { ...(await shot(page, "room", secrets)), boxes: { invite: await box(inviteBtn), share: await box(share) } };

    // 5) convite / QR
    if (inviteBtn) {
      await inviteBtn.click().catch(() => {});
      await page.waitForTimeout(1500);
    }
    const qr = await firstVisible(page, [SEL.qr, "[class*=qr] canvas, [class*=qr] img, [class*=qr] svg, img[alt*=QR i], canvas[id*=qr i], #qrcode, .qrcode, [class*=qr i]"]);
    const link = await firstVisible(page, [SEL.inviteLink, page.locator("input[readonly], input[value*='http']"), page.getByText(/korabots\.com\.br\//i)]);
    const inviteUrl = link ? await link.evaluate((n) => n.value || n.innerText).catch(() => null) : null;
    if (inviteUrl) secrets.push(inviteUrl.trim());
    data.shots.invite = { ...(await shot(page, "invite", secrets)), boxes: { qr: await box(qr), link: await box(link), invite: await box(inviteBtn) } };
    log(!!qr, "QR Code do convite");
    await page.keyboard.press("Escape").catch(() => {});

    // 6) compartilhar tela
    const share2 = await firstVisible(page, [SEL.shareScreen, ...btn(page, /compartilhar\s*tela|transmitir|iniciar\s*compart|share/i)]);
    if (share2) {
      await share2.click().catch(() => {});
      await page.waitForTimeout(3500);
      const video = await firstVisible(page, ["video"]);
      const controls = await firstVisible(page, [SEL.controls, "[class*=control], [class*=toolbar], footer"]);
      const stop = await firstVisible(page, [SEL.stopShare, ...btn(page, /parar|encerrar|stop/i)]);
      data.shots.sharing = { ...(await shot(page, "sharing", secrets)), boxes: { video: await box(video), controls: await box(controls), stop: await box(stop), share: await box(share2) } };
    } else log(false, "botão de compartilhar tela não encontrado — selectors.shareScreen");

    // 7) convidado (contexto separado, controlado)
    const joinUrl = inviteUrl && /^https?:/.test(inviteUrl.trim()) ? inviteUrl.trim() : roomUrl;
    if (joinUrl && joinUrl !== before) {
      const guestCtx = await browser.newContext(ctxOpts);
      const guest = await guestCtx.newPage();
      await guest.goto(joinUrl, { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
      const gNick = await firstVisible(guest, [SEL.nickname, guest.getByPlaceholder(/apelido|nick|nome/i), "input[type=text]:visible"]);
      if (gNick) await gNick.fill(GUEST_NICK);
      const join = await firstVisible(guest, [SEL.join, ...btn(guest, /entrar|participar|juntar|join/i)]);
      if (join) await join.click().catch(() => {});
      await guest.waitForTimeout(5000);
      const gVideo = await firstVisible(guest, ["video"]);
      const gMic = await firstVisible(guest, [SEL.mute, ...btn(guest, /micro|mudo|silenciar|mute|unmute/i), "[aria-label*=micro i]"]);
      const gSettings = await firstVisible(guest, [SEL.settings, ...btn(guest, /config|ajuste|settings/i), "[aria-label*=config i]"]);
      const people = await firstVisible(guest, [guest.getByText(new RegExp(HOST_NICK, "i"))]);
      data.shots.viewer = { ...(await shot(guest, "viewer", secrets)), boxes: { video: await box(gVideo), mic: await box(gMic), settings: await box(gSettings), participants: await box(people) } };
      if (gSettings) {
        await gSettings.click().catch(() => {});
        await guest.waitForTimeout(1200);
        data.shots.settings = { ...(await shot(guest, "settings", secrets)), boxes: { settings: await box(gSettings) } };
        await guest.keyboard.press("Escape").catch(() => {});
      }
      // anfitrião vendo o convidado conectado
      await page.waitForTimeout(1500);
      data.shots.hostLive = { ...(await shot(page, "host-live", secrets)), boxes: {} };
      await guestCtx.close();
    } else log(false, "não foi possível obter o link da sala para o convidado");

    const stop = await firstVisible(page, [SEL.stopShare, ...btn(page, /parar|encerrar|stop/i)]);
    if (stop) await stop.click().catch(() => {});
  }

  // 8) página inicial novamente (encerramento)
  const fin = await host.newPage();
  await fin.goto(BASE, { waitUntil: "networkidle" });
  await fin.waitForTimeout(1200);
  data.shots.final = { ...(await shot(fin, "final")), boxes: {} };

  await browser.close();
  finish(data);
}

async function manual(browser, page, data) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  await page.goto(BASE, { waitUntil: "networkidle" });
  data.brand = await extractBrand(page);
  const steps = [
    ["home", "página inicial, sem nada preenchido"],
    ["nickname", "apelido preenchido (use um apelido fictício)"],
    ["profile", "perfil de sessão selecionado"],
    ["mic", "teste de microfone em andamento"],
    ["room", "sala criada"],
    ["invite", "convite/QR Code visível"],
    ["sharing", "tela sendo compartilhada (anfitrião)"],
    ["viewer", "visão do convidado (abra outra janela anônima)"],
    ["settings", "configurações/controles abertos"],
    ["final", "página inicial para o encerramento"],
  ];
  for (const [name, desc] of steps) {
    const ans = await rl.question(`\n▶ Deixe a janela em: ${desc}\n  Enter = capturar, "p" = pular: `);
    if (ans.trim() === "p") continue;
    const pages = browser.contexts().flatMap((c) => c.pages());
    const active = pages[pages.length - 1];
    data.shots[name] = { ...(await shot(active, name)), boxes: {} };
  }
  rl.close();
  await browser.close();
  console.log("\nObs.: no modo manual as caixas dos elementos ficam vazias; ajuste-as em src/data/captures.json se quiser zoom/destaques precisos.");
  finish(data);
}

function finish(data) {
  writeFileSync(JSON_OUT, JSON.stringify(data, null, 1));
  const miss = report.filter((r) => !r.ok);
  console.log(`\n${Object.keys(data.shots).length} capturas salvas em public/captures — dados em src/data/captures.json`);
  if (miss.length) console.log(`${miss.length} item(ns) não encontrado(s). Ajuste capture.config.json e rode de novo.`);
}

main().catch((e) => {
  console.error("\nFalha na captura:", e.message);
  if (/ERR_|net::|ENOTFOUND|403/.test(e.message)) console.error("Verifique se o endereço está acessível a partir desta máquina/rede.");
  process.exit(1);
});
