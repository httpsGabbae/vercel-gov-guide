import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';

export const GlitchText: React.FC<{
  text: string;
  fontSize?: number;
  color?: string;
  isGlitching?: boolean;
  fontWeight?: number;
  letterSpacing?: string;
}> = ({
  text,
  fontSize = 72,
  color = '#ffffff',
  isGlitching = false,
  fontWeight = 900,
  letterSpacing = '-0.02em',
}) => {
  const frame = useCurrentFrame();

  const jitterX = isGlitching ? Math.sin(frame * 2.8) * 8 : 0;
  const jitterY = isGlitching ? Math.cos(frame * 3.1) * 4 : 0;
  const rgbOffset = isGlitching
    ? interpolate(Math.sin(frame * 4), [-1, 1], [4, 12])
    : 0;

  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-block',
        fontSize: `${fontSize}px`,
        fontWeight,
        color,
        letterSpacing,
        lineHeight: 1.1,
        translate: `${jitterX}px ${jitterY}px`,
      }}
    >
      {/* Red Cyan Split Shadow */}
      {isGlitching && (
        <>
          <span
            style={{
              position: 'absolute',
              inset: 0,
              color: '#ef4444',
              translate: `${-rgbOffset}px ${rgbOffset * 0.5}px`,
              opacity: 0.85,
              mixBlendMode: 'screen',
              filter: 'blur(1px)',
              pointerEvents: 'none',
            }}
          >
            {text}
          </span>
          <span
            style={{
              position: 'absolute',
              inset: 0,
              color: '#06b6d4',
              translate: `${rgbOffset}px ${-rgbOffset * 0.5}px`,
              opacity: 0.85,
              mixBlendMode: 'screen',
              filter: 'blur(1px)',
              pointerEvents: 'none',
            }}
          >
            {text}
          </span>
        </>
      )}

      {/* Main Text */}
      <span style={{ position: 'relative', zIndex: 1 }}>{text}</span>
    </div>
  );
};
