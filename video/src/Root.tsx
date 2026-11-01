import React from "react";
import { Composition } from "remotion";
import { Esf1, esf1Length } from "./videos/Esf1";
import { Esf2, esf2Length } from "./videos/Esf2";
import { Vat, vatLength } from "./videos/Vat";

const size = { fps: 30, width: 1080, height: 1920 };

export const Root: React.FC = () => (
  <>
    <Composition id="Esf1-WhoMust" component={Esf1} durationInFrames={esf1Length} {...size} />
    <Composition id="Esf2-HowTo" component={Esf2} durationInFrames={esf2Length} {...size} />
    <Composition id="Vat-Formulas" component={Vat} durationInFrames={vatLength} {...size} />
  </>
);
