import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

export const Background: React.FC<{
  tint?: string;
  glowColor?: string;
  secondaryColor?: string;
  intensity?: number;
}> = ({
  tint = '#080d1a',
  glowColor = '#2563eb',
  secondaryColor = '#f59e0b',
  intensity = 0.35,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Subtle breathing ambient glow
  const glowPulse = interpolate(
    Math.sin((frame / fps) * 2.5),
    [-1, 1],
    [intensity * 0.85, intensity * 1.3],
  );

  // Rotating light drift
  const rotateDeg = interpolate(frame, [0, 500], [0, 360]);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: tint,
        overflow: 'hidden',
        zIndex: 0,
      }}
    >
      {/* Dynamic Animated Mesh Orb 1 */}
      <div
        style={{
          position: 'absolute',
          top: '-10%',
          left: '30%',
          width: '1400px',
          height: '1400px',
          translate: '-50% 0px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${glowColor} 0%, rgba(30, 58, 138, 0.2) 45%, transparent 70%)`,
          opacity: glowPulse,
          filter: 'blur(120px)',
          rotate: `${rotateDeg * 0.5}deg`,
          pointerEvents: 'none',
        }}
      />

      {/* Dynamic Animated Mesh Orb 2 */}
      <div
        style={{
          position: 'absolute',
          bottom: '-15%',
          right: '10%',
          width: '1200px',
          height: '1200px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${secondaryColor} 0%, rgba(217, 119, 6, 0.2) 40%, transparent 70%)`,
          opacity: glowPulse * 0.6,
          filter: 'blur(130px)',
          rotate: `-${rotateDeg * 0.3}deg`,
          pointerEvents: 'none',
        }}
      />

      {/* Glowing horizontal laser scan line */}
      <div
        style={{
          position: 'absolute',
          top: `${interpolate(frame % 200, [0, 200], [-10, 1930])}px`,
          left: 0,
          right: 0,
          height: '2px',
          background: `linear-gradient(90deg, transparent 0%, ${glowColor} 50%, transparent 100%)`,
          opacity: 0.3,
          boxShadow: `0 0 20px ${glowColor}`,
        }}
      />

      {/* Subtle high-tech architectural civic grid pattern */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px)
          `,
          backgroundSize: '90px 90px',
          opacity: 0.7,
        }}
      />
    </div>
  );
};
