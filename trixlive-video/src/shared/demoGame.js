// Conteúdo de demonstração ORIGINAL ("Órbita Neon"): minijogo fictício desenhado em canvas.
// Usado (1) pelo script de captura como fonte da "tela compartilhada" e (2) nas ilustrações do vídeo.
// Determinístico: depende apenas de t (segundos).
// Mantenha este arquivo sem imports para que possa ser injetado no navegador como texto.

export function drawDemoGame(ctx, w, h, t) {
  const rnd = (i) => {
    const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
  // céu
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#0b0630");
  g.addColorStop(0.55, "#2a0b4f");
  g.addColorStop(1, "#ff4f8b");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // estrelas com parallax
  for (let i = 0; i < 140; i++) {
    const layer = 1 + (i % 3);
    const x = ((rnd(i) * w - t * 40 * layer) % w + w) % w;
    const y = rnd(i + 999) * h * 0.6;
    ctx.globalAlpha = 0.35 + 0.2 * layer;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x, y, layer, layer);
  }
  ctx.globalAlpha = 1;
  // sol retrô
  const sx = w * 0.5, sy = h * 0.58, sr = h * 0.22;
  const sg = ctx.createLinearGradient(0, sy - sr, 0, sy + sr);
  sg.addColorStop(0, "#ffe66d");
  sg.addColorStop(1, "#ff3d7f");
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.arc(sx, sy, sr, Math.PI, 0);
  ctx.fill();
  for (let k = 0; k < 6; k++) {
    ctx.fillStyle = "#2a0b4f";
    const yy = sy - sr * 0.1 - k * sr * 0.14;
    ctx.fillRect(sx - sr, yy, sr * 2, 3 + k);
  }
  // grade em perspectiva
  const hy = h * 0.6;
  ctx.fillStyle = "#14062e";
  ctx.fillRect(0, hy, w, h - hy);
  ctx.strokeStyle = "rgba(0,240,255,0.65)";
  ctx.lineWidth = 2;
  for (let i = -20; i <= 20; i++) {
    ctx.beginPath();
    ctx.moveTo(w / 2 + i * w * 0.02, hy);
    ctx.lineTo(w / 2 + i * w * 0.16, h);
    ctx.stroke();
  }
  const off = (t * 0.9) % 1;
  for (let j = 0; j < 12; j++) {
    const p = (j + off) / 12;
    const y = hy + (h - hy) * p * p;
    ctx.globalAlpha = Math.min(1, p * 2);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // nave do jogador
  const px = w * 0.5 + Math.sin(t * 1.6) * w * 0.18;
  const py = h * 0.8 + Math.sin(t * 3.1) * h * 0.01;
  const s = h * 0.05;
  ctx.fillStyle = "#00f0ff";
  ctx.shadowColor = "#00f0ff";
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.moveTo(px, py - s);
  ctx.lineTo(px + s * 1.2, py + s * 0.6);
  ctx.lineTo(px, py + s * 0.25);
  ctx.lineTo(px - s * 1.2, py + s * 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  // cristais coletáveis vindo em direção à câmera
  for (let i = 0; i < 7; i++) {
    const cyc = (t * 0.45 + i / 7) % 1;
    const lane = (rnd(i + 50 + Math.floor(t * 0.45 + i / 7)) - 0.5) * 1.6;
    const y = hy + (h - hy) * cyc * cyc;
    const x = w / 2 + lane * w * 0.35 * cyc;
    const r = 4 + 26 * cyc;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t * 2 + i);
    ctx.fillStyle = i % 2 ? "#ffe66d" : "#b388ff";
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 16;
    ctx.fillRect(-r / 2, -r / 2, r, r);
    ctx.restore();
  }
  // HUD
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(w * 0.03, h * 0.04, w * 0.25, h * 0.09);
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 ${Math.round(h * 0.045)}px sans-serif`;
  ctx.textBaseline = "middle";
  ctx.fillText(`PONTOS ${String(1200 + Math.floor(t * 137)).padStart(6, "0")}`, w * 0.045, h * 0.085);
  ctx.textAlign = "right";
  ctx.fillText("ÓRBITA NEON", w * 0.97, h * 0.085);
  ctx.textAlign = "left";
}
