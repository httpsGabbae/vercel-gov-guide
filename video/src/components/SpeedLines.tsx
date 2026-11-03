import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';

export const SpeedLines: React.FC<{
  speed?: number;
  count?: number;
  color?: string;
}> = ({ count = 18, color = 'rgba(255, 255, 255, 0.15)' }) => {
  const frame = useCurrentFrame();

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 0,
      }}
    >
      {Array.from({ length: count }).map((_, i) => {
        const seed = (i * 73) % 100;
        const left = `${(i * 100) / count}%`;
        const length = 120 + ((i * 37) % 200);
        const yPos = interpolate(
          (frame * (12 + (seed % 10)) + seed * 40) % 2200,
          [0, 2200],
          [-300, 2000],
        );
        const opacity = interpolate(yPos, [-100, 960, 1900], [0, 0.4, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left,
              top: `${yPos}px`,
              width: '2px',
              height: `${length}px`,
              background: `linear-gradient(180deg, transparent 0%, ${color} 50%, transparent 100%)`,
              opacity,
              filter: 'blur(1px)',
            }}
          />
        );
      })}
    </div>
  );
};
