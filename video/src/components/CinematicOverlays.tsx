import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

export const CinematicOverlays: React.FC<{
  enableLightLeak?: boolean;
  lightLeakColor?: string;
  recStatus?: string;
}> = ({
  enableLightLeak = true,
  lightLeakColor = '#f59e0b',
  recStatus = 'REC ● MANILA CIVIC ARCHIVE',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Blinking REC indicator
  const recBlink = Math.floor((frame / (fps * 0.5))) % 2 === 0;

  // Sweeping anamorphic light streak
  const leakX = interpolate(frame, [0, 250], [-200, 1200], {
    extrapolateLeft: 'extend',
    extrapolateRight: 'extend',
  });

  const leakOpacity = interpolate(
    Math.sin((frame / fps) * 3),
    [-1, 1],
    [0.15, 0.45],
  );

  // Timecode calculation
  const totalSeconds = Math.floor(frame / fps);
  const framesMod = frame % fps;
  const timecode = `00:0${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}:${String(framesMod).padStart(2, '0')}`;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 999,
        overflow: 'hidden',
      }}
    >
      {/* 1. Procedural Film Grain SVG overlay */}
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          opacity: 0.08,
          mixBlendMode: 'overlay',
        }}
      >
        <filter id="filmGrain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.8"
            numOctaves="3"
            seed={frame % 60}
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#filmGrain)" />
      </svg>

      {/* 2. Cinematic Heavy Vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 50% 50%, transparent 45%, rgba(0, 0, 0, 0.75) 100%)',
        }}
      />

      {/* 3. Sweeping Anamorphic Lens Flare / Light Leak */}
      {enableLightLeak && (
        <div
          style={{
            position: 'absolute',
            top: '-20%',
            left: `${leakX}px`,
            width: '600px',
            height: '2400px',
            rotate: '35deg',
            background: `linear-gradient(90deg, transparent 0%, ${lightLeakColor} 50%, transparent 100%)`,
            opacity: leakOpacity,
            filter: 'blur(90px)',
            mixBlendMode: 'screen',
          }}
        />
      )}

      {/* 4. Top HUD Header: Documentary Found-Footage Aesthetic */}
      <div
        style={{
          position: 'absolute',
          top: '48px',
          left: '60px',
          right: '60px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '20px',
          fontWeight: 700,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: 'rgba(255, 255, 255, 0.7)',
          fontFamily: "'Courier New', Courier, monospace",
          textShadow: '0 2px 10px rgba(0,0,0,0.8)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span
            style={{
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              backgroundColor: '#ef4444',
              opacity: recBlink ? 1 : 0.2,
              display: 'inline-block',
              boxShadow: recBlink ? '0 0 14px #ef4444' : 'none',
            }}
          />
          <span>{recStatus}</span>
        </div>

        <div style={{ display: 'flex', gap: '24px' }}>
          <span>50 FPS</span>
          <span style={{ color: '#fbbf24' }}>{timecode}</span>
        </div>
      </div>

      {/* 5. Letterbox Crop Edge Guides */}
      <div
        style={{
          position: 'absolute',
          top: '28px',
          left: '30px',
          width: '40px',
          height: '40px',
          borderTop: '3px solid rgba(255, 255, 255, 0.4)',
          borderLeft: '3px solid rgba(255, 255, 255, 0.4)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '28px',
          right: '30px',
          width: '40px',
          height: '40px',
          borderTop: '3px solid rgba(255, 255, 255, 0.4)',
          borderRight: '3px solid rgba(255, 255, 255, 0.4)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '28px',
          left: '30px',
          width: '40px',
          height: '40px',
          borderBottom: '3px solid rgba(255, 255, 255, 0.4)',
          borderLeft: '3px solid rgba(255, 255, 255, 0.4)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '28px',
          right: '30px',
          width: '40px',
          height: '40px',
          borderBottom: '3px solid rgba(255, 255, 255, 0.4)',
          borderRight: '3px solid rgba(255, 255, 255, 0.4)',
        }}
      />
    </div>
  );
};
