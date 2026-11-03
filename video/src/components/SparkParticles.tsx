import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';

export const SparkParticles: React.FC<{
  count?: number;
}> = ({ count = 30 }) => {
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
        const angle = (i * (360 / count) * Math.PI) / 180;
        const speed = 180 + ((i * 47) % 250);
        const distance = interpolate(frame % 90, [0, 90], [0, speed]);
        const size = 3 + (i % 5);
        const opacity = interpolate(frame % 90, [0, 30, 90], [0, 0.8, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });

        const cx = 540 + Math.cos(angle) * distance;
        const cy = 960 + Math.sin(angle) * distance;
        const isGold = i % 2 === 0;

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${cx}px`,
              top: `${cy}px`,
              width: `${size}px`,
              height: `${size}px`,
              borderRadius: '50%',
              backgroundColor: isGold ? '#fbbf24' : '#34d399',
              boxShadow: `0 0 14px ${isGold ? '#f59e0b' : '#10b981'}`,
              opacity,
            }}
          />
        );
      })}
    </div>
  );
};
