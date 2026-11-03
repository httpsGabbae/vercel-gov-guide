import React from 'react';
import {
  Easing,
  interpolate,
  useCurrentFrame,
} from 'remotion';
import { Background } from '../components/Background';
import { GlitchText } from '../components/GlitchText';
import {
  TrendingDown,
  RotateCcw,
  AlertOctagon,
  FileX2,
  DollarSign,
  Clock,
} from 'lucide-react';

export const Scene3Rejection: React.FC = () => {
  const frame = useCurrentFrame();

  // Dramatic camera push-in
  const cameraZoom = interpolate(frame, [0, 275], [1, 1.08], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Entrance
  const titleOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });

  // Stamp slam down animation at frame 30
  const stampProgress = interpolate(frame, [25, 42], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.175, 0.885, 0.32, 1.35),
  });

  const stampScale = interpolate(stampProgress, [0, 1], [3.0, 1]);
  const stampOpacity = interpolate(frame, [25, 32], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Violent camera impact shake on stamp slam (frames 36 - 65)
  const screenShake =
    frame >= 35 && frame <= 70
      ? Math.sin(frame * 2.8) *
        interpolate(frame, [35, 70], [18, 0], { extrapolateRight: 'clamp' })
      : 0;

  // Red flash on impact
  const impactFlash = interpolate(frame, [36, 42, 52], [0, 0.55, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Glitch active during initial rejection impact
  const isGlitching = frame >= 28 && frame <= 80;

  // Breakdown card slide in
  const breakdownTranslateY = interpolate(frame, [60, 90], [100, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const breakdownOpacity = interpolate(frame, [60, 85], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        scale: `${cameraZoom}`,
        translate: `${screenShake}px 0px`,
      }}
    >
      <Background tint="#130408" glowColor="#dc2626" secondaryColor="#991b1b" intensity={0.5} />

      {/* Red Alert Strobe Flash on Impact */}
      {impactFlash > 0 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: '#ef4444',
            opacity: impactFlash,
            pointerEvents: 'none',
            zIndex: 99,
          }}
        />
      )}

      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '110px 80px',
          color: '#f8fafc',
          zIndex: 1,
        }}
      >
        {/* Top Tag */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'rgba(220, 38, 38, 0.3)',
            border: '2px solid rgba(239, 68, 68, 0.6)',
            boxShadow: '0 0 35px rgba(220, 38, 38, 0.5)',
            padding: '14px 32px',
            borderRadius: '9999px',
            opacity: titleOpacity,
          }}
        >
          <RotateCcw size={24} color="#fca5a5" />
          <span
            style={{
              fontSize: '24px',
              fontWeight: 800,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#fecaca',
            }}
          >
            Phase 03 • The "Balik-Pila" Nightmare
          </span>
        </div>

        {/* Narrative Headline */}
        <div
          style={{
            textAlign: 'center',
            width: '100%',
            opacity: titleOpacity,
          }}
        >
          <div
            style={{
              fontSize: '34px',
              fontWeight: 800,
              color: '#fca5a5',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '16px',
            }}
          >
            ...and then the counter teller says:
          </div>

          {/* Glitching Dialog Box */}
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '3px solid rgba(239, 68, 68, 0.5)',
              borderRadius: '36px',
              padding: '36px 44px',
              maxWidth: '960px',
              margin: '0 auto',
              boxShadow: '0 0 60px rgba(239, 68, 68, 0.3)',
            }}
          >
            <div>
              <span
                style={{
                  fontSize: '48px',
                  fontWeight: 900,
                  color: '#ffffff',
                }}
              >
                “SORRY,{' '}
              </span>
              <GlitchText
                text="WRONG DOCUMENT."
                fontSize={56}
                color="#ef4444"
                isGlitching={isGlitching}
                fontWeight={900}
              />
            </div>

            <div style={{ marginTop: '14px' }}>
              <GlitchText
                text="COME BACK TOMORROW.”"
                fontSize={64}
                color="#fca5a5"
                isGlitching={isGlitching}
                fontWeight={900}
              />
            </div>
          </div>
        </div>

        {/* Giant Slammed Rejection Rubber Stamp */}
        <div
          style={{
            border: '12px double #ef4444',
            borderRadius: '28px',
            padding: '28px 70px',
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            boxShadow:
              '0 30px 100px rgba(239, 68, 68, 0.6), inset 0 0 40px rgba(239, 68, 68, 0.25)',
            rotate: '-7deg',
            scale: `${stampScale}`,
            opacity: stampOpacity,
            textAlign: 'center',
            zIndex: 10,
          }}
        >
          <div
            style={{
              fontSize: '52px',
              fontWeight: 900,
              letterSpacing: '0.12em',
              color: '#ef4444',
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
            }}
          >
            <AlertOctagon size={54} color="#ef4444" />
            <span>REJECTED • BALIK-PILA</span>
          </div>
          <div
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#fca5a5',
              marginTop: '10px',
              letterSpacing: '0.04em',
            }}
          >
            Reason: Missing PSA SecPA Security Copy • Expired Barangay Certificate
          </div>
        </div>

        {/* The Human Cost Breakdown Card */}
        <div
          style={{
            width: '100%',
            maxWidth: '920px',
            background: 'linear-gradient(180deg, rgba(25, 10, 15, 0.92) 0%, rgba(15, 5, 10, 0.95) 100%)',
            backdropFilter: 'blur(20px)',
            border: '2px solid rgba(239, 68, 68, 0.35)',
            boxShadow: '0 25px 80px rgba(0, 0, 0, 0.7)',
            borderRadius: '32px',
            padding: '36px 40px',
            opacity: breakdownOpacity,
            translate: `0px ${breakdownTranslateY}px`,
          }}
        >
          <div
            style={{
              fontSize: '24px',
              fontWeight: 900,
              color: '#f87171',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: '22px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <TrendingDown size={30} color="#ef4444" />
            The High Cost of One Missing Document
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '24px',
            }}
          >
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '24px',
                padding: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '18px',
              }}
            >
              <DollarSign size={44} color="#f87171" />
              <div>
                <div style={{ fontSize: '18px', color: '#94a3b8', fontWeight: 600 }}>
                  Wasted Wage
                </div>
                <div
                  style={{
                    fontSize: '34px',
                    fontWeight: 900,
                    color: '#ffffff',
                  }}
                >
                  ₱610 – ₱1,500
                </div>
                <div style={{ fontSize: '16px', color: '#fca5a5' }}>
                  1 entire day unpaid leave gone
                </div>
              </div>
            </div>

            <div
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '24px',
                padding: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '18px',
              }}
            >
              <Clock size={44} color="#f87171" />
              <div>
                <div style={{ fontSize: '18px', color: '#94a3b8', fontWeight: 600 }}>
                  Wasted Time
                </div>
                <div
                  style={{
                    fontSize: '34px',
                    fontWeight: 900,
                    color: '#ffffff',
                  }}
                >
                  6+ Hours Lost
                </div>
                <div style={{ fontSize: '16px', color: '#fca5a5' }}>
                  Repeat whole process tomorrow
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Subtext */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            color: '#f8fafc',
            fontSize: '26px',
            fontWeight: 700,
          }}
        >
          <FileX2 size={32} color="#ef4444" />
          <span>Why must simple public service feel like an obstacle course?</span>
        </div>
      </div>
    </div>
  );
};
