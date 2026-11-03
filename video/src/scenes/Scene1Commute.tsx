import React from 'react';
import {
  Easing,
  interpolate,
  useCurrentFrame,
} from 'remotion';
import { Background } from '../components/Background';
import { SpeedLines } from '../components/SpeedLines';
import { Clock, Navigation, DollarSign, BellRing, Flame } from 'lucide-react';

export const Scene1Commute: React.FC = () => {
  const frame = useCurrentFrame();

  // Cinematic slow camera zoom-in
  const cameraZoom = interpolate(frame, [0, 250], [1, 1.06], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Staggered Kinetic Typography
  const word1Opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  const word1TranslateY = interpolate(frame, [0, 18], [40, 0], {
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const word2Scale = interpolate(frame, [15, 32], [0.7, 1], {
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.back(2)),
  });

  const word3Opacity = interpolate(frame, [25, 42], [0, 1], { extrapolateRight: 'clamp' });
  const word3TranslateY = interpolate(frame, [25, 42], [30, 0], {
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  // Violent Alarm Shake at early morning
  const alarmShake =
    frame < 100
      ? Math.sin(frame * 2.2) *
        interpolate(frame, [0, 100], [8, 0], { extrapolateRight: 'clamp' })
      : 0;

  // Live Metrics
  const distanceKm = interpolate(frame, [30, 200], [0, 24.6], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  }).toFixed(1);

  const farePhp = Math.round(
    interpolate(frame, [30, 200], [0, 215], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.cubic),
    }),
  );

  const routeProgress = interpolate(frame, [40, 220], [0, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Card slide-in with elastic overshoot
  const cardTranslateY = interpolate(frame, [20, 50], [120, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        scale: `${cameraZoom}`,
      }}
    >
      <Background tint="#050a18" glowColor="#1e40af" secondaryColor="#ea580c" intensity={0.4} />
      <SpeedLines count={24} color="rgba(96, 165, 250, 0.25)" />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '120px 80px',
          color: '#f8fafc',
          zIndex: 1,
        }}
      >
        {/* Top Eyebrow Tag */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            background: 'rgba(30, 58, 138, 0.35)',
            border: '2px solid rgba(96, 165, 250, 0.4)',
            boxShadow: '0 0 25px rgba(59, 130, 246, 0.3)',
            padding: '14px 32px',
            borderRadius: '9999px',
            opacity: word1Opacity,
          }}
        >
          <Flame size={24} color="#f59e0b" />
          <span
            style={{
              fontSize: '24px',
              fontWeight: 800,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#93c5fd',
            }}
          >
            The Philippine Citizen Reality
          </span>
        </div>

        {/* Kinetic Hero Question Hook */}
        <div style={{ textAlign: 'center', width: '100%', maxWidth: '980px' }}>
          <div
            style={{
              fontSize: '52px',
              fontWeight: 800,
              color: '#94a3b8',
              opacity: word1Opacity,
              translate: `0px ${word1TranslateY}px`,
              letterSpacing: '-0.02em',
              textTransform: 'uppercase',
            }}
          >
            Have you ever
          </div>

          <div
            style={{
              margin: '12px 0 20px 0',
              scale: `${word2Scale}`,
              display: 'inline-block',
            }}
          >
            <span
              style={{
                fontSize: '110px',
                fontWeight: 900,
                letterSpacing: '-0.04em',
                lineHeight: 1.0,
                textTransform: 'uppercase',
                background: 'linear-gradient(135deg, #38bdf8 0%, #3b82f6 50%, #f59e0b 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 15px 35px rgba(59, 130, 246, 0.5))',
              }}
            >
              TRAVELED
            </span>
          </div>

          <div
            style={{
              fontSize: '44px',
              fontWeight: 800,
              color: '#ffffff',
              opacity: word3Opacity,
              translate: `0px ${word3TranslateY}px`,
              lineHeight: 1.25,
            }}
          >
            to a government office...
          </div>
        </div>

        {/* Middle Interactive Journey Card */}
        <div
          style={{
            width: '100%',
            maxWidth: '920px',
            background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.9) 0%, rgba(10, 15, 30, 0.95) 100%)',
            backdropFilter: 'blur(24px)',
            border: '2px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '36px',
            padding: '44px 44px',
            boxShadow: '0 30px 100px rgba(0, 0, 0, 0.7), 0 0 40px rgba(37, 99, 235, 0.2)',
            translate: `0px ${cardTranslateY}px`,
          }}
        >
          {/* Authentic Jeepney Route Placard */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#0f172a',
              border: '2px solid #334155',
              borderRadius: '20px',
              padding: '16px 24px',
              marginBottom: '32px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span
                style={{
                  background: '#f59e0b',
                  color: '#000000',
                  fontWeight: 900,
                  fontSize: '18px',
                  padding: '4px 12px',
                  borderRadius: '6px',
                  letterSpacing: '0.08em',
                }}
              >
                ROUTE
              </span>
              <span
                style={{
                  fontFamily: "'Courier New', Courier, monospace",
                  fontSize: '22px',
                  fontWeight: 800,
                  color: '#f8fafc',
                  letterSpacing: '0.06em',
                }}
              >
                QUIAPO • CUBAO • COMMONWEALTH • QC CIRCLE
              </span>
            </div>
            <div
              style={{
                fontSize: '18px',
                color: '#ef4444',
                fontWeight: 800,
                letterSpacing: '0.05em',
              }}
            >
              RUSH HOUR
            </div>
          </div>

          {/* Alarm Clock Banner with Neon Glow */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '2px solid rgba(239, 68, 68, 0.4)',
              boxShadow: '0 0 30px rgba(239, 68, 68, 0.25)',
              borderRadius: '24px',
              padding: '24px 32px',
              marginBottom: '32px',
              translate: `${alarmShake}px 0px`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '22px' }}>
              <div
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '20px',
                  backgroundColor: 'rgba(239, 68, 68, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 20px rgba(239, 68, 68, 0.4)',
                }}
              >
                <BellRing size={40} color="#f87171" />
              </div>
              <div>
                <div style={{ fontSize: '20px', color: '#fca5a5', fontWeight: 700 }}>
                  EARLY MORNING ALARM
                </div>
                <div
                  style={{
                    fontSize: '56px',
                    fontWeight: 900,
                    color: '#ffffff',
                    letterSpacing: '0.05em',
                    textShadow: '0 0 25px rgba(239, 68, 68, 0.8)',
                    fontFamily: "'Courier New', Courier, monospace",
                  }}
                >
                  04:30 AM
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div
                style={{
                  background: '#ef4444',
                  color: '#ffffff',
                  fontSize: '20px',
                  fontWeight: 900,
                  padding: '8px 20px',
                  borderRadius: '9999px',
                  display: 'inline-block',
                  boxShadow: '0 0 20px rgba(239, 68, 68, 0.6)',
                }}
              >
                QUOTA CUTOFF
              </div>
              <div style={{ fontSize: '20px', color: '#fecaca', marginTop: '10px', fontWeight: 600 }}>
                First 250 Walk-ins Only
              </div>
            </div>
          </div>

          {/* Animated Route Progress Bar */}
          <div style={{ marginBottom: '32px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '22px',
                fontWeight: 700,
                color: '#94a3b8',
                marginBottom: '14px',
              }}
            >
              <span>🏡 Home (Bulacan)</span>
              <span>🚌 EDSA Carousel</span>
              <span>🏛️ Agency Gate</span>
            </div>

            <div
              style={{
                width: '100%',
                height: '18px',
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                borderRadius: '9999px',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <div
                style={{
                  width: `${routeProgress}%`,
                  height: '100%',
                  background:
                    'linear-gradient(90deg, #3b82f6 0%, #06b6d4 50%, #f59e0b 100%)',
                  borderRadius: '9999px',
                  boxShadow: '0 0 20px #38bdf8',
                }}
              />
            </div>
          </div>

          {/* Dynamic Counters Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '24px',
            }}
          >
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '24px',
                padding: '24px 28px',
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
              }}
            >
              <Navigation size={48} color="#38bdf8" />
              <div>
                <div style={{ fontSize: '20px', color: '#94a3b8', fontWeight: 600 }}>
                  Distance Traveled
                </div>
                <div
                  style={{
                    fontSize: '46px',
                    fontWeight: 900,
                    color: '#ffffff',
                    fontFamily: "'Courier New', Courier, monospace",
                  }}
                >
                  {distanceKm} km
                </div>
              </div>
            </div>

            <div
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '24px',
                padding: '24px 28px',
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
              }}
            >
              <DollarSign size={48} color="#f59e0b" />
              <div>
                <div style={{ fontSize: '20px', color: '#94a3b8', fontWeight: 600 }}>
                  Fare & Gas Spent
                </div>
                <div
                  style={{
                    fontSize: '46px',
                    fontWeight: 900,
                    color: '#ffffff',
                    fontFamily: "'Courier New', Courier, monospace",
                  }}
                >
                  ₱{farePhp}
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
            color: '#e2e8f0',
            fontSize: '26px',
            fontWeight: 600,
          }}
        >
          <Clock size={32} color="#f59e0b" />
          <span>Filing unpaid leave, sacrificing sleep, risking the cutoff...</span>
        </div>
      </div>
    </div>
  );
};
