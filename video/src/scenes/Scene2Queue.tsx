import React from 'react';
import {
  Easing,
  interpolate,
  useCurrentFrame,
} from 'remotion';
import { Background } from '../components/Background';
import { Users, Hourglass, Ticket, ThermometerSun, AlertTriangle, Armchair } from 'lucide-react';

export const Scene2Queue: React.FC = () => {
  const frame = useCurrentFrame();

  // Cinematic camera push-in
  const cameraZoom = interpolate(frame, [0, 275], [1, 1.07], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Staggered Title
  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const titleTranslateY = interpolate(frame, [0, 25], [50, 0], {
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const hoursScale = interpolate(frame, [15, 35], [0.8, 1], {
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.back(1.8)),
  });

  // Ticket slide up
  const ticketTranslateY = interpolate(frame, [15, 45], [100, 0], {
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  // Animated queue counters
  const nowServing = Math.round(
    interpolate(frame, [25, 260], [89, 122], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
  );

  const yourNumber = 384;
  const aheadCount = yourNumber - nowServing;

  // Elapsed wait time: counts up to 3h 48m
  const waitMinutes = Math.round(
    interpolate(frame, [20, 260], [45, 228], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
  );
  const waitHours = Math.floor(waitMinutes / 60);
  const waitMinsRemaining = waitMinutes % 60;

  // Thermal paper subtle breathing tension
  const ticketPulse = interpolate(
    Math.sin((frame / 50) * 5),
    [-1, 1],
    [0.985, 1.015],
  );

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        scale: `${cameraZoom}`,
      }}
    >
      <Background tint="#0f111a" glowColor="#ea580c" secondaryColor="#b45309" intensity={0.35} />

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
        {/* Top Tag */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'rgba(234, 88, 12, 0.25)',
            border: '2px solid rgba(249, 115, 22, 0.45)',
            boxShadow: '0 0 25px rgba(234, 88, 12, 0.3)',
            padding: '14px 32px',
            borderRadius: '9999px',
            opacity: titleOpacity,
          }}
        >
          <Users size={24} color="#fb923c" />
          <span
            style={{
              fontSize: '24px',
              fontWeight: 800,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#fdba74',
            }}
          >
            Phase 02 • The Agony of the Queue
          </span>
        </div>

        {/* Narrative Headline */}
        <div
          style={{
            textAlign: 'center',
            width: '100%',
            opacity: titleOpacity,
            translate: `0px ${titleTranslateY}px`,
          }}
        >
          <div
            style={{
              fontSize: '52px',
              fontWeight: 800,
              color: '#94a3b8',
              letterSpacing: '-0.02em',
              textTransform: 'uppercase',
            }}
          >
            ...waited in line
          </div>

          <div
            style={{
              margin: '12px 0 16px 0',
              scale: `${hoursScale}`,
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
                background: 'linear-gradient(135deg, #f97316 0%, #fbbf24 60%, #ef4444 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 15px 35px rgba(234, 88, 12, 0.6))',
              }}
            >
              FOR HOURS
            </span>
          </div>

          <div
            style={{
              fontSize: '34px',
              fontWeight: 500,
              color: '#cbd5e1',
              maxWidth: '850px',
              margin: '0 auto',
            }}
          >
            Holding a thermal ticket, sore feet, watching the numbers barely budge.
          </div>
        </div>

        {/* Authentic Philippine Government Thermal Queue Ticket */}
        <div
          style={{
            width: '100%',
            maxWidth: '920px',
            background: '#ffffff',
            color: '#0f172a',
            borderRadius: '32px',
            padding: '44px 44px',
            boxShadow: '0 30px 100px rgba(0, 0, 0, 0.7), 0 0 50px rgba(249, 115, 22, 0.25)',
            borderTop: '16px solid #ea580c',
            scale: `${ticketPulse}`,
            translate: `0px ${ticketTranslateY}px`,
            position: 'relative',
          }}
        >
          {/* Header Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '3px dashed #cbd5e1',
              paddingBottom: '24px',
              marginBottom: '32px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '16px',
                  backgroundColor: '#ffedd5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ticket size={38} color="#ea580c" />
              </div>
              <div>
                <div
                  style={{
                    fontSize: '26px',
                    fontWeight: 900,
                    letterSpacing: '0.04em',
                    color: '#0f172a',
                  }}
                >
                  REGULATORY & CLEARANCE SERVICE
                </div>
                <div style={{ fontSize: '20px', color: '#64748b', fontWeight: 600 }}>
                  WINDOW 4: DOCUMENT EVALUATION & FILING
                </div>
              </div>
            </div>

            <div
              style={{
                background: '#fee2e2',
                border: '2px solid #ef4444',
                color: '#b91c1c',
                fontWeight: 900,
                fontSize: '20px',
                padding: '8px 20px',
                borderRadius: '10px',
              }}
            >
              PRIORITY: REGULAR
            </div>
          </div>

          {/* Big Split Numbers: Now Serving vs Your Number */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '28px',
              marginBottom: '32px',
            }}
          >
            {/* Now Serving */}
            <div
              style={{
                background: '#f8fafc',
                border: '3px solid #e2e8f0',
                borderRadius: '24px',
                padding: '24px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '22px',
                  fontWeight: 800,
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                Now Serving
              </div>
              <div
                style={{
                  fontSize: '84px',
                  fontWeight: 900,
                  color: '#0f172a',
                  margin: '4px 0',
                  letterSpacing: '-0.02em',
                  fontFamily: "'Courier New', Courier, monospace",
                }}
              >
                #{String(nowServing).padStart(4, '0')}
              </div>
              <div style={{ fontSize: '20px', color: '#16a34a', fontWeight: 800 }}>
                ● Moving at ~7 mins / person
              </div>
            </div>

            {/* Your Number */}
            <div
              style={{
                background: 'rgba(234, 88, 12, 0.1)',
                border: '3px solid #ea580c',
                borderRadius: '24px',
                padding: '24px',
                textAlign: 'center',
                boxShadow: '0 0 30px rgba(234, 88, 12, 0.25)',
              }}
            >
              <div
                style={{
                  fontSize: '22px',
                  fontWeight: 900,
                  color: '#c2410c',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                Your Number
              </div>
              <div
                style={{
                  fontSize: '84px',
                  fontWeight: 900,
                  color: '#ea580c',
                  margin: '4px 0',
                  letterSpacing: '-0.02em',
                  fontFamily: "'Courier New', Courier, monospace",
                }}
              >
                #{String(yourNumber).padStart(4, '0')}
              </div>
              <div style={{ fontSize: '20px', color: '#c2410c', fontWeight: 900 }}>
                {aheadCount} citizens still waiting ahead
              </div>
            </div>
          </div>

          {/* Queue Statistics Bar */}
          <div
            style={{
              background: '#0f172a',
              color: '#ffffff',
              borderRadius: '24px',
              padding: '24px 32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
              <Hourglass size={38} color="#f59e0b" />
              <div>
                <div style={{ fontSize: '18px', color: '#94a3b8' }}>
                  Wait Time Elapsed
                </div>
                <div
                  style={{
                    fontSize: '34px',
                    fontWeight: 900,
                    fontFamily: "'Courier New', Courier, monospace",
                  }}
                >
                  {waitHours} hrs {waitMinsRemaining} mins
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
              <ThermometerSun size={38} color="#f97316" />
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '18px', color: '#94a3b8' }}>Conditions</div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#fed7aa' }}>
                  34°C • Humid Hall
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
              <Armchair size={38} color="#94a3b8" />
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '18px', color: '#94a3b8' }}>Seating</div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#f87171' }}>
                  Standing Only
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            color: '#cbd5e1',
            fontSize: '26px',
            fontWeight: 600,
          }}
        >
          <AlertTriangle size={32} color="#ea580c" />
          <span>Number 0384 is called. You walk up to Window 4...</span>
        </div>
      </div>
    </div>
  );
};
