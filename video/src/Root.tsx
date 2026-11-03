import React from "react";
import { MainComposition } from "./Composition";
import { Composition } from "remotion";
import { GovGuidePitch } from "./Pitch";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <MainComposition />
      <Composition
        id="GovGuidePitch5Min"
        component={GovGuidePitch}
        width={1920}
        height={1080}
        fps={60}
        durationInFrames={18000}
      />
    </>
  );
};
