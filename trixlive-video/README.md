# TrixLive — vídeo promocional e demonstrativo

Vídeo de ~2min54s (1920×1080, 30 fps, H.264 + AAC) sobre a plataforma **TrixLive** ([korabots.com.br](https://korabots.com.br/)),
produzido com **Remotion + React + TypeScript**. Tem locução neural em pt-BR, legendas sincronizadas, trilha original e efeitos sonoros.

> **Situação atual: prévia com espaços reservados.** Na sessão em que este projeto foi criado, a política de rede
> do ambiente bloqueava `korabots.com.br`, tanto no navegador quanto no fetch. Não havia como ver a interface real, as cores
> ou os textos do site. Para não inventar a interface, cada tela do produto aparece como um **espaço reservado
> rotulado** ("ESPAÇO RESERVADO · CAPTURA REAL DA TRIXLIVE"), e uma marca d'água "PRÉVIA" aparece no canto.
> Basta rodar `npm run capture` numa máquina com acesso ao site e depois `npm run render`. As capturas reais, as caixas
> dos elementos (para zoom, cursor e destaques) e as cores da marca entram automaticamente, e a marca d'água sai.

## Pipeline

```
src/data/narration.json ──► npm run voice ──► public/audio/vo/*.wav + src/data/timeline.json + out/legendas.srt
                                                   │ (a timeline define as durações das cenas e os blocos de legenda)
                                                   ▼
            npm run music  ──► public/audio/music/soundtrack.wav  (seções e ducking seguem a timeline)
            npm run sfx    ──► public/audio/sfx/*.wav
            npm run capture──► public/captures/*.png + src/data/captures.json   (requer acesso a korabots.com.br)
                                                   ▼
            npm run render ──► out/render-raw.mp4 ──► scripts/finalize.sh (−14 LUFS, faststart) ──► out/trixlive-promo-1080p.mp4
            npm run verify ──► out/qa/qa-report.txt, sync-report.json, contact-sheet.jpg
```

### Pré-requisitos
- Node 18+ e `npm install`, depois `npm run setup:fonts` (copia Inter, Space Grotesk e JetBrains Mono, licença OFL, para `public/fonts`).
- Python 3.10+ com `pip install sherpa-onnx==1.12.40 numpy scipy soundfile`.
  Os modelos (Kokoro TTS e Whisper small) são baixados sozinhos dos releases públicos do sherpa-onnx no GitHub, para `.cache/models`.
- ffmpeg.
- Chromium: o Remotion baixa o dele. Se preferir usar um já instalado, `export REMOTION_BROWSER=/caminho/chrome-headless-shell`.

### Gerar o vídeo final com as telas reais
```bash
npm install && npm run setup:fonts
npm run capture            # abre korabots.com.br, percorre a jornada e salva as capturas (veja abaixo)
npm run render             # renderiza e finaliza para YouTube
npm run verify             # checagens de qualidade
```

## Captura da plataforma real (`scripts/capture.mjs`)
- A demonstração é **controlada**. O script abre dois contextos de navegador próprios: o anfitrião "Demo TrixLive" e o
  convidado "Convidado Demo". Nenhum usuário real participa e nenhuma ação administrativa é executada.
- A tela compartilhada é o minijogo original "Órbita Neon" (`src/shared/demoGame.js`). Ele é entregue por um
  override de `getDisplayMedia` que vale **só no navegador de captura**. O site não é alterado.
- O microfone é um dispositivo falso que toca `public/audio/demo-mic.wav`, uma fala de demonstração sintetizada.
- **Privacidade:** URLs e códigos de sala e o QR Code do convite são desfocados antes de cada captura. O endereço da
  sala nunca é gravado em disco.
- Os elementos são encontrados por texto, placeholder e rótulo em português (apelido, perfil, testar microfone, criar sala,
  convite, compartilhar tela, entrar, configurações…). Se a detecção falhar em algum, copie
  `capture.config.example.json` para `capture.config.json` e informe o seletor CSS. O relatório no fim mostra ✔ ou ✘ para cada item.
- `--headed` mostra o navegador. `--manual` deixa você conduzir a jornada, e o script captura a cada Enter.
- `npm run capture:test` valida o script contra um app fixture local (`scripts/test/fixture-app.html`). O fixture **não** é a TrixLive.

## Estrutura
| Caminho | Conteúdo |
|---|---|
| `src/data/narration.json` | Roteiro: texto da legenda, grafia falada e pausas. É a fonte única. |
| `src/data/timeline.json` | Gerado: frames de cada cena, fala e bloco de legenda |
| `src/data/captures.json` | Gerado pela captura: cores da marca, caixas dos elementos, perfis encontrados |
| `src/scenes/S01…S11` | 11 cenas: abertura, apresentação, página inicial, apelido/perfil/microfone, sala, convite, compartilhamento, voz, usos, navegador, encerramento |
| `src/components/` | Reutilizáveis: `BrowserFrame`, `Viewport` (câmera), `Highlight`, `Cursor`, `Callout`, `StepHud`, `Kinetic`, `Wordmark`, `Morph` (morphing SVG), `Network3D`, `QR`, `PermissionDialog`, transições por máscara, `Subtitles`, `Sfx` |
| `scripts/` | `tts.py`, `music.py`, `sfx.py`, `capture.mjs`, `finalize.sh`, `verify.py`, `asr_check.py`, `stills.mjs` |

Para editar o roteiro, mude `narration.json` e rode `npm run voice && npm run music`. Durações de cena, legendas,
ducking da trilha e efeitos sincronizados se reajustam sozinhos.

## Áudio
- **Locução:** Kokoro v1.0, voz masculina pt-BR `pm_alex`, offline via sherpa-onnx. Tem pós-processamento: filtro passa-altas,
  realce de presença e compressão. O Whisper transcreve cada fala para checar a pronúncia (`npm run asr`).
- **Trilha:** original, 100 BPM, Lá menor, sintetizada do zero em `scripts/music.py`. O tempo forte cai na revelação da marca.
  A trilha baixa 8,5 dB sob cada fala.
- **Efeitos:** originais e procedurais em `scripts/sfx.py`.
- **Master:** −14 LUFS integrado, true peak ≤ −1 dBTP, AAC 320 kb/s, 48 kHz.

## Afirmações a confirmar antes de publicar
O roteiro usa só os recursos citados no briefing. Como o site não pôde ser acessado, confirme cada um na plataforma real:
- [ ] Apelido, perfis de sessão, teste de microfone, sala privada, convite por link **e** QR Code
- [ ] Participantes acompanham a tela e conversam por voz na sala
- [ ] Controles para ativar ou silenciar o microfone e acessar as configurações da sessão
- [ ] **Sem cadastro e sem instalação** (cena "Direto no navegador")
- [ ] Abrir o QR Code pelo celular leva ao convite
Se algo não se confirmar, ajuste `narration.json`, as cenas correspondentes e regenere.

A janela "Escolha o que compartilhar" é uma **ilustração genérica** do seletor nativo do navegador, e vem rotulada assim no vídeo.
A conversa com o link e o celular lendo o QR também são ilustrações. O QR do celular e o do encerramento apontam para
`https://korabots.com.br`, nunca para uma sala.

## Licenças
Fontes OFL (via @fontsource). Kokoro e Whisper: Apache-2.0 / MIT. Trilha e efeitos: originais deste projeto.
O Remotion é gratuito para pessoas físicas e empresas com até 3 funcionários. Acima disso, exige
[licença de empresa](https://www.remotion.dev/license).
