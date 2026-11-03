import React from 'react';
import {
  Easing,
  interpolate,
  staticFile,
  useCurrentFrame,
} from 'remotion';
import { Background } from '../components/Background';
import { SparkParticles } from '../components/SparkParticles';
import {
  CheckCircle2,
  ShieldCheck,
  FileCheck,
  Sparkles,
  ArrowRight,
  Zap,
} from 'lucide-react';

export const Scene4Resolution: React.FC = () => {
  const frame = useCurrentFrame();

  // Dramatic camera push-in
  const cameraZoom = interpolate(frame, [0, 275], [1, 1.07], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Logo entrance
  const logoScale = interpolate(frame, [0, 30], [0.65, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const logoOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Staggered checkmarks popping with spring physics
  const check1 = interpolate(frame, [30, 48], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.back(1.8)),
  });

  const check2 = interpolate(frame, [48, 66], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.back(1.8)),
  });

  const check3 = interpolate(frame, [66, 84], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.back(1.8)),
  });

  // CTA button pop
  const ctaScale = interpolate(frame, [80, 105], [0.85, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.back(1.4)),
  });

  const ctaOpacity = interpolate(frame, [80, 100], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Rotating golden aureole
  const auraRotation = interpolate(frame, [0, 275], [0, 180]);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        scale: `${cameraZoom}`,
      }}
    >
      <Background tint="#03101c" glowColor="#059669" secondaryColor="#f59e0b" intensity={0.45} />
      <SparkParticles count={36} />

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
            background: 'rgba(16, 185, 129, 0.25)',
            border: '2px solid rgba(16, 185, 129, 0.55)',
            boxShadow: '0 0 35px rgba(16, 185, 129, 0.4)',
            padding: '14px 32px',
            borderRadius: '9999px',
            opacity: logoOpacity,
          }}
        >
          <Sparkles size={24} color="#34d399" />
          <span
            style={{
              fontSize: '24px',
              fontWeight: 800,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#6ee7b7',
            }}
          >
            The Solution • GovGuide PH
          </span>
        </div>

        {/* Hero Branding & Headline */}
        <div
          style={{
            textAlign: 'center',
            width: '100%',
            opacity: logoOpacity,
            scale: `${logoScale}`,
          }}
        >
          {/* Logo with Glowing Aura */}
          <div
            style={{
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px',
            }}
          >
            <div
              style={{
                position: 'absolute',
                width: '180px',
                height: '180px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(245, 158, 11, 0.5) 0%, transparent 70%)',
                filter: 'blur(30px)',
                rotate: `${auraRotation}deg`,
              }}
            />
            <img
              src={staticFile('GovGuidePH_Logo.png')}
              alt="GovGuide PH"
              style={{
                position: 'relative',
                width: '120px',
                height: '120px',
                objectFit: 'contain',
                filter: 'drop-shadow(0 15px 35px rgba(245, 158, 11, 0.6))',
              }}
            />
          </div>

          <h1
            style={{
              fontSize: '84px',
              fontWeight: 900,
              lineHeight: 1.05,
              color: '#ffffff',
              margin: '0 0 16px 0',
              letterSpacing: '-0.04em',
            }}
          >
            Never Hear{' '}
            <span
              style={{
                color: '#f87171',
                textDecoration: 'line-through',
                opacity: 0.85,
              }}
            >
              "Come Back Tomorrow"
            </span>{' '}
            Again.
          </h1>

          <div
            style={{
              fontSize: '34px',
              fontWeight: 600,
              color: '#93c5fd',
              maxWidth: '900px',
              margin: '0 auto',
            }}
          >
            Pre-inspect your documents and verify Citizen's Charter rules before you step out of your home.
          </div>
        </div>

        {/* Holographic Verification Feature Cards */}
        <div
          style={{
            width: '100%',
            maxWidth: '920px',
            background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.9) 0%, rgba(10, 20, 35, 0.95) 100%)',
            backdropFilter: 'blur(24px)',
            border: '2px solid rgba(16, 185, 129, 0.35)',
            borderRadius: '36px',
            padding: '38px 40px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            boxShadow: '0 30px 100px rgba(0, 0, 0, 0.7), 0 0 45px rgba(16, 185, 129, 0.25)',
          }}
        >
          {/* Item 1 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '24px',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '2px solid rgba(16, 185, 129, 0.35)',
              borderRadius: '24px',
              padding: '22px 28px',
              scale: `${check1}`,
              opacity: check1,
            }}
          >
            <CheckCircle2 size={46} color="#34d399" />
            <div>
              <div
                style={{
                  fontSize: '28px',
                  fontWeight: 900,
                  color: '#ffffff',
                }}
              >
                AI Document Pre-Inspection
              </div>
              <div style={{ fontSize: '20px', color: '#cbd5e1', fontWeight: 500 }}>
                Instant check for dry seals, validity dates & complete requirements
              </div>
            </div>
          </div>

          {/* Item 2 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '24px',
              background: 'rgba(59, 130, 246, 0.12)',
              border: '2px solid rgba(59, 130, 246, 0.35)',
              borderRadius: '24px',
              padding: '22px 28px',
              scale: `${check2}`,
              opacity: check2,
            }}
          >
            <ShieldCheck size={46} color="#60a5fa" />
            <div>
              <div
                style={{
                  fontSize: '28px',
                  fontWeight: 900,
                  color: '#ffffff',
                }}
              >
                Citizen's Charter Grounded
              </div>
              <div style={{ fontSize: '20px', color: '#cbd5e1', fontWeight: 500 }}>
                Official government agency checklists, exact fees & zero guesswork
              </div>
            </div>
          </div>

          {/* Item 3 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '24px',
              background: 'rgba(245, 158, 11, 0.12)',
              border: '2px solid rgba(245, 158, 11, 0.35)',
              borderRadius: '24px',
              padding: '22px 28px',
              scale: `${check3}`,
              opacity: check3,
            }}
          >
            <FileCheck size={46} color="#fbbf24" />
            <div>
              <div
                style={{
                  fontSize: '28px',
                  fontWeight: 900,
                  color: '#ffffff',
                }}
              >
                100% Prepared on Window 1
              </div>
              <div style={{ fontSize: '20px', color: '#cbd5e1', fontWeight: 500 }}>
                Save your paid leave, avoid repeat commutes, eliminate "balik-pila"
              </div>
            </div>
          </div>
        </div>

        {/* High Octane CTA Banner */}
        <div
          style={{
            width: '100%',
            maxWidth: '920px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 60%, #047857 100%)',
            borderRadius: '28px',
            padding: '28px 44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 25px 80px rgba(16, 185, 129, 0.5), 0 0 35px rgba(52, 211, 153, 0.4)',
            scale: `${ctaScale}`,
            opacity: ctaOpacity,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Zap size={38} color="#ffffff" />
            </div>
            <div>
              <div
                style={{
                  fontSize: '36px',
                  fontWeight: 900,
                  color: '#ffffff',
                  letterSpacing: '-0.02em',
                }}
              >
                Eliminate Balik-Pila Today.
              </div>
              <div
                style={{
                  fontSize: '22px',
                  color: '#d1fae5',
                  fontWeight: 700,
                }}
              >
                GovGuide PH • Empowering Filipino Citizens
              </div>
            </div>
          </div>

          <div
            style={{
              width: '68px',
              height: '68px',
              borderRadius: '50%',
              backgroundColor: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            }}
          >
            <ArrowRight size={38} color="#059669" />
          </div>
        </div>
      </div>
    </div>
  );
};
