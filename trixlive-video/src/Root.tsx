import React from "react";
import { Composition, continueRender, delayRender } from "remotion";
import { Main } from "./Main";
import { TL, HAS_REAL } from "./lib/data";
import { loadFonts } from "./components/Fonts";

const handle = delayRender("fontes");
loadFonts().then(() => continueRender(handle)).catch((e) => { console.error(e); continueRender(handle); });

export const Root: React.FC = () => (
  <>
    <Composition id="TrixLivePromo" component={Main} durationInFrames={TL.durationInFrames} fps={TL.fps} width={1920} height={1080}
      defaultProps={{ draftMark: !HAS_REAL }} />
  </>
);
