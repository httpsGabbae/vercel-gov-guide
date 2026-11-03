import React from 'react';
import { Composition } from 'remotion';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { slide } from '@remotion/transitions/slide';
import { fade } from '@remotion/transitions/fade';
import { loadFont } from '@remotion/google-fonts/Inter';

import { Scene1Commute } from './scenes/Scene1Commute';
import { Scene2Queue } from './scenes/Scene2Queue';
import { Scene3Rejection } from './scenes/Scene3Rejection';
import { Scene4Resolution } from './scenes/Scene4Resolution';
import { CinematicOverlays } from './components/CinematicOverlays';

const { fontFamily } = loadFont('normal', {
  weights: ['400', '600', '700', '800', '900'],
  subsets: ['latin'],
});

export const GovGuideExplainerVideo: React.FC = () => {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        fontFamily,
        backgroundColor: '#050a18',
        overflow: 'hidden',
      }}
    >
      <TransitionSeries>
        {/* Scene 1: The Commute & Early Morning Sacrifice (5.0s = 250 frames) */}
        <TransitionSeries.Sequence name="Scene 1: The Commute" durationInFrames={280}>
          <Scene1Commute />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: 'from-right' })}
          timing={linearTiming({ durationInFrames: 25 })}
        />

        {/* Scene 2: The Agony of the Queue (5.5s = 275 frames) */}
        <TransitionSeries.Sequence
          name="Scene 2: The Queue"
          durationInFrames={245}
          trimBefore={30}
        >
          <Scene2Queue />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: 'from-bottom' })}
          timing={linearTiming({ durationInFrames: 25 })}
        />

        {/* Scene 3: The Heartbreak Rejection at the Window (5.5s = 275 frames) */}
        <TransitionSeries.Sequence name="Scene 3: Balik-Pila Rejection" durationInFrames={275}>
          <Scene3Rejection />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 25 })}
        />

        {/* Scene 4: The GovGuide PH Resolution (5.5s = 275 frames) */}
        <TransitionSeries.Sequence name="Scene 4: Never Again" durationInFrames={275}>
          <Scene4Resolution />
        </TransitionSeries.Sequence>
      </TransitionSeries>

      {/* Global Cinematic Overlays: Film Grain, Vignette, Anamorphic Light Leaks, HUD */}
      <CinematicOverlays
        enableLightLeak={true}
        lightLeakColor="#f59e0b"
        recStatus="REC ● PHILIPPINES CIVIC ARCHIVE"
      />
    </div>
  );
};

export const MainComposition: React.FC = () => {
  return (
    <Composition
      id="GovGuideExplainer"
      component={GovGuideExplainerVideo}
      durationInFrames={1000} // exactly 20.0 seconds at 50fps
      fps={50}
      width={1080}
      height={1920}
    />
  );
};
