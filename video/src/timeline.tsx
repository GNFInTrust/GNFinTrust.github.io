import React from "react";
import { Sequence } from "remotion";

// One scene: how long it lasts and what it shows (gets its own duration back)
export type Step = [number, (dur: number) => React.ReactNode];

export const total = (steps: Step[]) => steps.reduce((sum, [d]) => sum + d, 0);

// Plays the scenes back to back
export const Timeline: React.FC<{ steps: Step[] }> = ({ steps }) => {
  let from = 0;
  return (
    <>
      {steps.map(([dur, render], i) => {
        const at = from;
        from += dur;
        return (
          <Sequence key={i} from={at} durationInFrames={dur}>
            {render(dur)}
          </Sequence>
        );
      })}
    </>
  );
};
