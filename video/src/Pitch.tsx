import {
  Product,
  Opening,
  Journey,
  Fragmentation,
  PlatformReveal,
  Grounded,
  DraftTransform,
  VoiceFlow,
  ExtensionFocus,
  ConnectedStatus,
  ServiceSwitch,
  ValueVisual,
  TrustDemo,
} from "./ProductPitch";
import React from "react";
import {
  AbsoluteFill,
  Sequence,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from "remotion";
import { Audio } from "@remotion/media";
import {
  ArrowRight,
  Check,
  FileText,
  Mic,
  ShieldCheck,
  UserRound,
  Building2,
  Search,
  LockKeyhole,
  AlertTriangle,
  GraduationCap,
} from "lucide-react";

const C = {
  navy: "#0f172a",
  white: "#f8fafc",
  blue: "#2563eb",
  gold: "#f59e0b",
  green: "#059669",
  muted: "#64748b",
  line: "#cbd5e1",
};
const ease = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
  easing: Easing.bezier(0.16, 1, 0.3, 1),
};
const text: React.CSSProperties = {
  fontFamily: "Arial, sans-serif",
  color: C.navy,
};

function Reveal({
  children,
  delay = 0,
  style = {},
}: {
  children: React.ReactNode;
  delay?: number;
  style?: React.CSSProperties;
}) {
  const f = useCurrentFrame();
  return (
    <div
      style={{
        ...style,
        opacity: interpolate(f, [delay, delay + 30], [0, 1], ease),
        translate: `${interpolate(f, [delay, delay + 42], [35, 0], ease)}px 0`,
      }}
    >
      {children}
    </div>
  );
}
export function FloatingArtifact({ label = "" }: { label?: string }) {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps;
  const Icon = /VOICE|WAY TO ASK/.test(label)
    ? Mic
    : /TRUST|ACCESS|PRIVACY|DECISION/.test(label)
      ? ShieldCheck
      : /PLATFORM|SERVICES|AGENCY/.test(label)
        ? Building2
        : /MARIA|FINISHING/.test(label)
          ? GraduationCap
          : FileText;
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        right: 40,
        top: 760,
        width: 116,
        height: 150,
        perspective: 700,
        pointerEvents: "none",
        opacity: 0.85,
        scale: 1.12,
        transformOrigin: "right bottom",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 4,
          top: 172,
          width: 108,
          height: 16,
          borderRadius: "50%",
          background: "radial-gradient(ellipse,#2563eb24,transparent 70%)",
          scale: 1 + 0.05 * Math.sin(t * 0.7),
        }}
      />
      <div
        style={{
          width: 116,
          height: 150,
          transformStyle: "preserve-3d",
          transform:
            "translateY(" +
            (-10 + 9 * Math.sin(t * 0.8)) +
            "px) rotateX(" +
            (8 + 4 * Math.sin(t * 0.45)) +
            "deg) rotateY(" +
            (-20 + 10 * Math.sin(t * 0.55)) +
            "deg) rotateZ(" +
            (-5 + 2 * Math.sin(t * 0.6)) +
            "deg)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            transform: "translateZ(-14px)",
            background: "#dbeafe",
            border: "1px solid #b9cdef",
            borderRadius: 14,
          }}
        />
        <div
          style={{
            position: "absolute",
            right: -7,
            top: 5,
            width: 14,
            height: 140,
            transform: "rotateY(90deg)",
            background: "#bfd4f4",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(145deg,#ffffffed,#e4edffcc)",
            border: "1px solid #ffffff",
            borderRadius: 14,
            boxShadow: "0 16px 30px #6480ab18",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <Icon size={48} strokeWidth={1.3} color={C.blue} />
          <div
            style={{
              height: 3,
              width: 60,
              borderRadius: 5,
              background: "#a5bde4",
            }}
          />
          <div
            style={{
              height: 3,
              width: 42,
              borderRadius: 5,
              background: "#c5d4eb",
            }}
          />
        </div>
      </div>
    </div>
  );
}
function Frame({
  children,
  dark = false,
  label,
  source,
}: {
  children: React.ReactNode;
  dark?: boolean;
  label?: string;
  source?: string;
}) {
  return (
    <AbsoluteFill
      style={{
        ...text,
        background: dark
          ? "linear-gradient(135deg,#eef4ff 0%,#f5f1fc 100%)"
          : "linear-gradient(135deg,#fffdf7 0%,#f5f8fc 65%,#edf4ff 100%)",
        color: C.navy,
        padding: "112px 192px",
        overflow: "hidden",
      }}
    >
      {label && (
        <div
          style={{
            fontSize: 25,
            fontWeight: 700,
            color: C.blue,
            letterSpacing: 2,
            marginBottom: 24,
          }}
        >
          {label}
        </div>
      )}
      {children}

      {source && (
        <div
          style={{
            position: "absolute",
            bottom: 66,
            left: 192,
            right: 192,
            fontSize: 23,
            color: C.muted,
          }}
        >
          {source}
        </div>
      )}
    </AbsoluteFill>
  );
}
const H = ({
  children,
  style = {},
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) => (
  <h1
    style={{
      fontSize: 88,
      lineHeight: 1.06,
      letterSpacing: -3,
      margin: 0,
      fontWeight: 800,
      ...style,
    }}
  >
    {children}
  </h1>
);
const P = ({
  children,
  style = {},
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) => (
  <p style={{ fontSize: 37, lineHeight: 1.4, margin: "28px 0 0", ...style }}>
    {children}
  </p>
);
function Progress() {
  const f = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        height: 6,
        width: "100%",
        background: "#e2e8f0",
        opacity: interpolate(f, [17436, 17520], [1, 0], ease),
      }}
    >
      <div
        style={{
          height: 6,
          width: `${(100 * f) / 17999}%`,
          background: C.gold,
        }}
      />
    </div>
  );
}

export function Hook() {
  const f = useCurrentFrame();
  return (
    <Frame label="THE COST OF BALIK-PILA">
      <H>
        Sent home for a document
        <br />
        <span style={{ color: C.blue }}>nobody told you to bring?</span>
      </H>
      <div
        style={{
          position: "absolute",
          left: 212,
          top: 450,
          width: 970,
          height: 310,
          border: "3px solid #cbd5e1",
          background: "white",
          borderRadius: 12,
          padding: 45,
          rotate: "-3deg",
          translate:
            interpolate(f, [128, 131, 134, 138, 143], [0, -5, 4, -2, 0], ease) +
            "px 0",
        }}
      >
        <div style={{ fontSize: 28, color: C.muted }}>
          GOVERNMENT SERVICE COUNTER
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 55,
            marginTop: 24,
          }}
        >
          <span style={{ fontSize: 126, fontWeight: 800 }}>A-047</span>
          <FileText size={100} strokeWidth={1.3} />
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          right: 230,
          top: 570,
          fontSize: 65,
          fontWeight: 800,
          border: "7px solid #b45309",
          color: "#b45309",
          padding: "22px 34px",
          background: "#fffbeb",
          rotate:
            interpolate(f, [110, 128, 137, 150], [-17, -7, -9, -8], ease) +
            "deg",
          scale: interpolate(
            f,
            [110, 128, 136, 144, 154],
            [1.85, 0.94, 1.055, 0.985, 1],
            ease,
          ),
          translate:
            "0 " +
            interpolate(
              f,
              [110, 128, 133, 138, 144],
              [-95, 0, -7, 3, 0],
              ease,
            ) +
            "px",
          boxShadow:
            "0 " +
            interpolate(f, [110, 128, 146], [28, 2, 0], ease) +
            "px " +
            interpolate(f, [110, 128, 146], [45, 4, 0], ease) +
            "px #92400e25",
          opacity: interpolate(f, [110, 114], [0, 1], ease),
        }}
      >
        KULANG PO
      </div>
    </Frame>
  );
}
function Maria() {
  return (
    <Frame
      label="MARIA’S STORY · ILLUSTRATIVE SCENARIO"
      source="₱755/day: NCR non-agricultural minimum wage, NWPC. Maria is a fictional persona."
    >
      <div
        style={{ display: "flex", gap: 100, alignItems: "center", height: 650 }}
      >
        <div style={{ flex: 1 }}>
          <H>
            A birth certificate.
            <br />A Friday deadline.
          </H>
          <P>
            One mother. One school enrollment.
            <br />A day away from work.
          </P>
        </div>
        <Reveal
          delay={40}
          style={{
            width: 470,
            background: "white",
            border: "2px solid #cbd5e1",
            padding: 46,
            borderTop: `18px solid ${C.gold}`,
          }}
        >
          <GraduationCap size={76} color={C.blue} />
          <div style={{ fontSize: 32, marginTop: 24 }}>ENROLLMENT CLOSES</div>
          <div
            style={{ fontSize: 103, fontWeight: 800, margin: "10px 0 36px" }}
          >
            FRIDAY
          </div>
          <div style={{ fontSize: 28, color: C.muted }}>
            One day’s pay at stake
          </div>
          <div style={{ fontSize: 86, fontWeight: 800 }}>₱755</div>
        </Reveal>
      </div>
    </Frame>
  );
}
export function Trips() {
  const f = useCurrentFrame();
  const step = f < 250 ? 0 : f < 470 ? 1 : 2;
  return (
    <Frame label="THE SAME TASK. ANOTHER TRIP.">
      <H>
        {
          ["“Ma’am, kulang po.”", "“Malabo po ang ID.”", "By the third trip…"][
            step
          ]
        }
      </H>
      <div style={{ marginTop: 90, display: "flex", gap: 42 }}>
        {["Missing document", "Unclear ID", "Enrollment missed"].map((v, i) => (
          <div
            key={v}
            style={{
              flex: 1,
              borderTop: `10px solid ${i <= step ? C.gold : C.line}`,
              paddingTop: 30,
              opacity: i <= step ? 1 : 0.3,
            }}
          >
            <div
              style={{
                fontSize: 110,
                fontWeight: 800,
                color: i === step ? C.blue : C.navy,
              }}
            >
              0{i + 1}
            </div>
            <div style={{ fontSize: 36, fontWeight: 700, marginTop: 18 }}>
              {v}
            </div>
            <div style={{ fontSize: 28, color: C.muted, marginTop: 20 }}>
              TRIP {i + 1}
            </div>
          </div>
        ))}
      </div>
      <Reveal delay={520}>
        <P>Maria isn’t careless. The process is confusing.</P>
      </Reveal>
    </Frame>
  );
}
export function Confusion() {
  return (
    <Frame dark label="THE INFORMATION GAP">
      <H>
        Separate websites.
        <br />
        Heavy jargon.
        <br />
        <span style={{ color: "#94600c" }}>No clear, trusted checklist.</span>
      </H>
      <Reveal delay={90}>
        <P style={{ color: C.muted, maxWidth: 1220 }}>
          Internet access alone does not make a government process easy to
          navigate.
        </P>
      </Reveal>
    </Frame>
  );
}
function Backlog() {
  return (
    <Frame label="BEHIND THE COUNTER">
      <H>
        Every missing detail
        <br />
        starts another round.
      </H>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 70,
          marginTop: 85,
        }}
      >
        <Building2 size={150} strokeWidth={1.2} />
        <ArrowRight size={80} color={C.muted} />
        <div style={{ flex: 1 }}>
          {["Incomplete form", "Unclear image", "Conflicting name"].map(
            (s, i) => (
              <Reveal key={s} delay={i * 48}>
                <div
                  style={{
                    display: "flex",
                    gap: 24,
                    alignItems: "center",
                    borderBottom: "2px solid #cbd5e1",
                    padding: "24px 0",
                    fontSize: 38,
                  }}
                >
                  <AlertTriangle color="#b45309" size={40} />
                  {s}
                </div>
              </Reveal>
            ),
          )}
        </div>
      </div>
    </Frame>
  );
}
export function Platform() {
  return (
    <Frame label="ONE PLATFORM. TWO SIDES.">
      <H>
        Citizens prepare.
        <br />
        <span style={{ color: C.blue }}>Agencies respond.</span>
      </H>
      <Reveal delay={40}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 36,
            marginTop: 55,
          }}
        >
          <Img
            src={staticFile("pitch/logo-mark.png")}
            style={{ width: 140, height: 140, objectFit: "contain" }}
          />
          <span style={{ fontSize: 84, fontWeight: 800, letterSpacing: -3 }}>
            GovGuide PH
          </span>
        </div>
      </Reveal>
      <Reveal delay={140}>
        <P>Filipino · English · Taglish</P>
      </Reveal>
    </Frame>
  );
}
export function Grounding() {
  const f = useCurrentFrame();
  return (
    <Frame dark label="HOW DOES IT KNOW?">
      <H>The Charter comes first.</H>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 30,
          marginTop: 92,
        }}
      >
        {[
          {
            icon: <Search size={56} />,
            title: "Retrieve",
            body: "Relevant official passage",
          },
          {
            icon: <FileText size={56} />,
            title: "Ground",
            body: "Requirements, fees, steps",
          },
          {
            icon: <ShieldCheck size={56} />,
            title: "Cite",
            body: "Show the source",
          },
        ].map((s, i) => (
          <React.Fragment key={s.title}>
            {i > 0 && <ArrowRight size={50} color={C.gold} />}
            <Reveal delay={i * 90} style={{ flex: 1 }}>
              {s.icon}
              <h2 style={{ fontSize: 49, margin: "28px 0 18px" }}>{s.title}</h2>
              <div style={{ fontSize: 31, color: C.muted }}>{s.body}</div>
            </Reveal>
          </React.Fragment>
        ))}
      </div>
      <div
        style={{
          marginTop: 82,
          padding: "24px 30px",
          borderLeft: `6px solid ${C.gold}`,
          fontSize: 34,
          opacity: interpolate(f, [410, 445], [0, 1], ease),
        }}
      >
        No supporting source? Refer to the agency. Don’t guess.
      </div>
    </Frame>
  );
}

export function Screen({
  asset,
  title,
  caption,
  tag = "LIVE PROTOTYPE CAPTURE",
  focus = false,
}: {
  asset: string;
  title: string;
  caption: string;
  tag?: string;
  focus?: boolean;
}) {
  const f = useCurrentFrame();
  return (
    <Frame label={tag}>
      <H style={{ fontSize: 69, maxWidth: 1450 }}>{title}</H>
      <div
        style={{
          position: "absolute",
          top: 260,
          left: 810,
          width: 900,
          height: 660,
          border: "2px solid #cbd5e1",
          borderRadius: 16,
          overflow: "hidden",
          background: "white",
          boxShadow: "0 20px 45px #0f172a12",
        }}
      >
        <Img
          src={staticFile(`pitch/${asset}`)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            objectPosition: "center top",
            scale: focus ? interpolate(f, [150, 230], [1, 1.12], ease) : 1,
            transformOrigin: "center top",
          }}
        />
      </div>
      <div style={{ position: "absolute", left: 192, top: 350, width: 520 }}>
        <Reveal delay={40}>
          <div
            style={{
              height: 8,
              width: 90,
              background: C.gold,
              marginBottom: 36,
            }}
          />
          <P style={{ fontSize: 44, margin: 0, fontWeight: 600 }}>{caption}</P>
        </Reveal>
        <Reveal delay={170}>
          <div
            style={{
              fontSize: 27,
              color: C.muted,
              marginTop: 50,
              lineHeight: 1.5,
            }}
          >
            Actual GovGuide PH interface.
            <br />
            Demonstration environment.
          </div>
        </Reveal>
      </div>
    </Frame>
  );
}
export function Paragraph() {
  const f = useCurrentFrame();
  return (
    <Frame label="WORKFLOW ILLUSTRATION · SAMPLE DETAILS">
      <H>One paragraph becomes a draft.</H>
      <div
        style={{
          display: "flex",
          gap: 70,
          marginTop: 65,
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: 630,
            fontSize: 38,
            lineHeight: 1.5,
            padding: 42,
            background: "#eaf1fe",
            borderLeft: `7px solid ${C.blue}`,
          }}
        >
          “Ako si <b>Maria Cristina</b>. Kailangan ko ng birth certificate ng
          anak kong si <b>Daniel</b> para sa <b>school enrollment</b>.”
        </div>
        <ArrowRight size={65} color={C.blue} />
        <div style={{ flex: 1 }}>
          {[
            ["Requester", "Maria Cristina"],
            ["Document owner", "Daniel"],
            ["Purpose", "School enrollment"],
            ["Date of birth", "Please confirm"],
          ].map(([k, v], i) => (
            <Reveal key={k} delay={80 + i * 55}>
              <div
                style={{ borderBottom: "2px solid #cbd5e1", padding: "20px 0" }}
              >
                <div style={{ fontSize: 25, color: C.muted }}>{k}</div>
                <div
                  style={{
                    fontSize: 38,
                    color: i === 3 ? "#b45309" : C.navy,
                    fontWeight: 700,
                    marginTop: 8,
                  }}
                >
                  {v}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
      <div
        style={{
          fontSize: 31,
          marginTop: 38,
          opacity: interpolate(f, [430, 460], [0, 1], ease),
        }}
      >
        Confirm what is understood. Ask only for what is missing.
      </div>
    </Frame>
  );
}
function Mismatch() {
  const f = useCurrentFrame();
  return (
    <Frame label="DOCUMENT DISCREPANCY · ILLUSTRATIVE EXAMPLE">
      <H>
        A small difference.
        <br />
        <span style={{ color: "#b45309" }}>A useful warning.</span>
      </H>
      <div style={{ display: "flex", gap: 65, marginTop: 58 }}>
        {[
          ["TYPED ENTRY", "Maria Cristina"],
          ["ID / DOCUMENT", "Ma. Cristina"],
        ].map(([k, v], i) => (
          <Reveal
            delay={i * 70}
            key={k}
            style={{
              flex: 1,
              padding: "34px 38px",
              border: "2px solid #cbd5e1",
              background: "white",
            }}
          >
            <div style={{ fontSize: 27, color: C.muted }}>{k}</div>
            <div style={{ fontSize: 55, fontWeight: 700, marginTop: 24 }}>
              {v}
            </div>
          </Reveal>
        ))}
      </div>
      <Reveal delay={210}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 25,
            marginTop: 36,
            fontSize: 37,
            color: "#92400e",
          }}
        >
          <AlertTriangle size={44} />
          Name mismatch: review before proceeding.
        </div>
      </Reveal>
      <div
        style={{
          marginTop: 32,
          fontSize: 33,
          color: C.muted,
          opacity: interpolate(f, [390, 430], [0, 1], ease),
        }}
      >
        The AI flags it. Maria checks her records and decides.
      </div>
    </Frame>
  );
}
export function Voice() {
  const f = useCurrentFrame();
  return (
    <Frame dark label="ANOTHER WAY TO ASK">
      <div
        style={{ display: "flex", gap: 100, alignItems: "center", height: 680 }}
      >
        <div style={{ flex: 1 }}>
          <H>
            Can’t type easily?
            <br />
            <span style={{ color: "#94600c" }}>Just speak.</span>
          </H>
          <P style={{ color: C.muted }}>
            Voice dictation in the chat.
            <br />
            Listen to answers read aloud.
          </P>
        </div>
        <div style={{ width: 400, textAlign: "center" }}>
          <Mic size={160} color={C.blue} strokeWidth={1.2} />
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              justifyContent: "center",
              height: 170,
              marginTop: 35,
            }}
          >
            {Array.from({ length: 17 }, (_, i) => (
              <div
                key={i}
                style={{
                  width: 12,
                  height: 25 + Math.abs(Math.sin(f / 12 + i * 0.65)) * 90,
                  background: C.gold,
                  borderRadius: 6,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </Frame>
  );
}
export function Extension() {
  const f = useCurrentFrame();
  return (
    <Frame label="THE CHROME AUTOFILL COMPANION">
      <H style={{ fontSize: 72 }}>Your details, beside the form.</H>
      <div
        style={{
          position: "absolute",
          left: 192,
          top: 250,
          width: 1536,
          height: 680,
          overflow: "hidden",
          border: "2px solid #cbd5e1",
          background: "white",
          borderRadius: 16,
        }}
      >
        <Img
          src={staticFile(
            f < 420
              ? "pitch/extension-before.png"
              : "pitch/extension-after.png",
          )}
          style={{
            position: "absolute",
            top: -80,
            width: "100%",
            height: "auto",
          }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          left: 192,
          top: 952,
          fontSize: 30,
          color: C.navy,
        }}
      >
        {f < 420
          ? "Open the companion. Autofill recognized fields. Review every entry."
          : "Installed Chrome extension · local sample form · 2 verified fields filled"}
      </div>
    </Frame>
  );
}
export function Tracker({ fixed = false }: { fixed?: boolean }) {
  const f = useCurrentFrame();
  const stages = [
    "Submitted",
    "In process",
    "Reviewed",
    "Paid",
    "Ready for pickup",
  ];
  const active = fixed
    ? Math.min(4, Math.floor(f / 140))
    : Math.min(2, Math.floor(f / 140));
  return (
    <Frame label="WORKFLOW ILLUSTRATION · REQUEST TRACKING">
      <H>
        {fixed
          ? "Fix the issue before the trip."
          : "Maria reviews. Maria submits."}
      </H>
      <P>
        {fixed
          ? "A specific message gives her a specific next step."
          : "The AI prepares a draft. The citizen makes the final decision."}
      </P>
      <div style={{ marginTop: 80, display: "flex" }}>
        {stages.map((s, i) => (
          <div key={s} style={{ flex: 1, position: "relative" }}>
            <div
              style={{
                height: 6,
                background: i < active ? C.green : C.line,
                position: "absolute",
                top: 31,
                left: 32,
                right: 0,
              }}
            />
            <div
              style={{
                width: 68,
                height: 68,
                borderRadius: 34,
                background: i <= active ? C.green : "white",
                border: `3px solid ${i <= active ? C.green : C.line}`,
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
              }}
            >
              {i <= active ? (
                <Check size={36} />
              ) : (
                <span style={{ color: C.muted, fontSize: 30 }}>{i + 1}</span>
              )}
            </div>
            <div
              style={{
                fontSize: 31,
                fontWeight: 700,
                marginTop: 30,
                maxWidth: 230,
              }}
            >
              {s}
            </div>
          </div>
        ))}
      </div>
      <Reveal delay={190}>
        <div
          style={{
            marginTop: 65,
            fontSize: 34,
            color: fixed ? C.green : C.blue,
          }}
        >
          {fixed
            ? "“Please upload a clearer ID image and attach the missing form.”"
            : "Status milestones shown here are an illustrative service journey."}
        </div>
      </Reveal>
    </Frame>
  );
}
export function Handler({ confirm = false }: { confirm?: boolean }) {
  const f = useCurrentFrame();
  return (
    <Frame label="AGENCY WORKFLOW ILLUSTRATION · PSA">
      <H>
        {confirm
          ? "Nothing changes until confirmed."
          : "The handler speaks naturally."}
      </H>
      <div
        style={{
          marginTop: 55,
          background: "white",
          border: "2px solid #cbd5e1",
          padding: "36px 45px",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 25,
            alignItems: "center",
            fontSize: 38,
          }}
        >
          <UserRound size={44} color={C.blue} />
          <b>“missing form at malabo”</b>
        </div>
        <Reveal delay={90}>
          <div
            style={{
              marginTop: 32,
              paddingTop: 28,
              borderTop: "2px solid #e2e8f0",
              display: "flex",
              gap: 60,
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 25, color: C.muted }}>
                PROPOSED STATUS
              </div>
              <div
                style={{
                  fontSize: 42,
                  fontWeight: 700,
                  marginTop: 16,
                  color: "#92400e",
                }}
              >
                Missing Document
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 25, color: C.muted }}>PROPOSED ISSUE</div>
              <div
                style={{
                  fontSize: 42,
                  fontWeight: 700,
                  marginTop: 16,
                  color: "#92400e",
                }}
              >
                Blurry Image
              </div>
            </div>
          </div>
        </Reveal>
        <Reveal delay={210}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 35,
            }}
          >
            <span style={{ fontSize: 30, color: C.muted }}>
              {confirm && f > 300
                ? "Confirmed action recorded in the audit trail."
                : "Review the proposal and edit if needed."}
            </span>
            <div
              style={{
                background: confirm && f > 300 ? C.green : C.blue,
                padding: "22px 32px",
                borderRadius: 8,
                fontSize: 30,
                fontWeight: 700,
                color: "white",
              }}
            >
              {confirm && f > 300 ? "Confirmed" : "Confirm update"}
            </div>
          </div>
        </Reveal>
      </div>
      <Reveal delay={350}>
        <P style={{ fontSize: 32 }}>
          {confirm
            ? "Human accountability stays with the agency officer."
            : "Less menu navigation. More attention to the request."}
        </P>
      </Reveal>
    </Frame>
  );
}
export function Impact() {
  return (
    <Frame dark label="THE VALUE TO A DAILY EARNER">
      <H>
        One fewer repeat trip.
        <br />
        <span style={{ color: "#94600c" }}>One day protected.</span>
      </H>
      <div
        style={{
          display: "flex",
          gap: 90,
          alignItems: "baseline",
          marginTop: 65,
        }}
      >
        <Reveal delay={70}>
          <span style={{ fontSize: 165, fontWeight: 800, letterSpacing: -6 }}>
            ₱755
          </span>
        </Reveal>
        <div style={{ fontSize: 38, lineHeight: 1.45, maxWidth: 650 }}>
          Illustrative day’s pay
          <br />
          <span style={{ color: C.muted }}>
            plus transport, time, and less uncertainty.
          </span>
        </div>
      </div>
      <P style={{ fontSize: 27, color: C.muted }}>
        Potential benefit, not a measured pilot result. NCR non-agricultural
        rate: NWPC.
      </P>
    </Frame>
  );
}
export function Costs() {
  return (
    <Frame
      label="WHY CATCH ERRORS EARLY?"
      source="Source: PSA, Administrative Petition for Correction under RA 9048, as amended. Filing fees only; other costs may apply."
    >
      <H>Corrections can be costly.</H>
      <div style={{ display: "flex", gap: 110, marginTop: 70 }}>
        <Reveal
          delay={30}
          style={{ flex: 1, borderTop: `8px solid ${C.blue}`, paddingTop: 30 }}
        >
          <div style={{ fontSize: 110, fontWeight: 800 }}>₱1,000</div>
          <P style={{ fontSize: 34 }}>
            Clerical-error correction
            <br />
            under RA 9048
          </P>
        </Reveal>
        <Reveal
          delay={140}
          style={{ flex: 1, borderTop: `8px solid ${C.gold}`, paddingTop: 30 }}
        >
          <div style={{ fontSize: 110, fontWeight: 800 }}>₱3,000</div>
          <P style={{ fontSize: 34 }}>
            Change of first name /<br />
            covered RA 10172 corrections
          </P>
        </Reveal>
      </div>
      <Reveal delay={300}>
        <P style={{ fontSize: 32, color: C.muted }}>
          A discrepancy warning prompts review; it does not change a civil
          registry record.
        </P>
      </Reveal>
    </Frame>
  );
}
export function Trust({ kind }: { kind: "source" | "human" | "privacy" }) {
  const map = {
    source: {
      q: "What makes an answer trustworthy?",
      title: "An official source you can inspect.",
      Icon: FileText,
      items: [
        "Retrieve the relevant Citizen’s Charter.",
        "Show the supporting source.",
        "Refer unsupported questions to the agency.",
      ],
    },
    human: {
      q: "Who makes the final decision?",
      title: "A human, at every action gate.",
      Icon: UserRound,
      items: [
        "The citizen reviews and submits.",
        "The agency handler confirms updates.",
        "The AI proposes; the person decides.",
      ],
    },
    privacy: {
      q: "How is access controlled?",
      title: "Consent. Agency access. Audit trail.",
      Icon: LockKeyhole,
      items: [
        "Explain why information is needed.",
        "Limit access by agency and role.",
        "Record confirmed actions for accountability.",
      ],
    },
  }[kind];
  return (
    <Frame label={map.q.toUpperCase()}>
      <H style={{ fontSize: 79 }}>{map.title}</H>
      <div
        style={{
          display: "flex",
          gap: 90,
          alignItems: "center",
          marginTop: 70,
        }}
      >
        <map.Icon size={170} strokeWidth={1.15} color={C.blue} />
        <div style={{ flex: 1 }}>
          {map.items.map((s, i) => (
            <Reveal delay={i * 100} key={s}>
              <div
                style={{
                  fontSize: 39,
                  padding: "28px 0",
                  borderBottom: "2px solid #cbd5e1",
                  display: "flex",
                  gap: 25,
                  alignItems: "center",
                }}
              >
                <Check size={34} color={C.green} />
                {s}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </Frame>
  );
}
function Scale() {
  return (
    <Frame dark label="ONE PLATFORM, MANY SERVICES">
      <H>
        Add services.
        <br />
        <span style={{ color: "#94600c" }}>Keep the same guide.</span>
      </H>
      <div
        style={{
          display: "flex",
          gap: 75,
          marginTop: 70,
          alignItems: "center",
        }}
      >
        <div style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.75 }}>
          PSA
          <br />
          NBI
          <br />
          PhilHealth
        </div>
        <ArrowRight size={90} color={C.gold} />
        <div
          style={{
            borderLeft: "2px solid #64748b",
            paddingLeft: 65,
            fontSize: 39,
            lineHeight: 1.7,
          }}
        >
          Shared account
          <br />
          Charter retrieval
          <br />
          Forms and status tracking
        </div>
      </div>
    </Frame>
  );
}
function Close() {
  return (
    <Frame label="FROM ASKING TO FINISHING">
      <H>
        Help citizens finish.
        <br />
        <span style={{ color: C.blue }}>Help agencies respond.</span>
      </H>
      <Reveal delay={90}>
        <div
          style={{
            display: "flex",
            gap: 45,
            alignItems: "center",
            marginTop: 85,
          }}
        >
          <GraduationCap size={115} color={C.blue} />
          <div>
            <div style={{ fontSize: 48, fontWeight: 700 }}>
              Maria’s goal: enrollment on time.
            </div>
            <div style={{ fontSize: 31, color: C.muted, marginTop: 18 }}>
              A better-prepared request. Fewer reasons to return.
            </div>
          </div>
        </div>
      </Reveal>
    </Frame>
  );
}
function End() {
  const f = useCurrentFrame();
  const dissolve = interpolate(f, [36, 120], [1, 0], ease);
  const fade = interpolate(f, [480, 599], [1, 0], {
    ...ease,
    easing: Easing.inOut(Easing.cubic),
  });
  return (
    <AbsoluteFill style={{ ...text, background: C.white }}>
      <AbsoluteFill
        style={{
          opacity: fade,
          background: "linear-gradient(135deg,#fffdf7,#eff5ff 65%,#f3effa)",
        }}
      >
        <div style={{ opacity: dissolve }}>
          <div
            style={{
              position: "absolute",
              left: 192,
              top: 420,
              fontSize: 72,
              fontWeight: 800,
              lineHeight: 1.4,
              letterSpacing: -2,
            }}
          >
            One platform.
            <br />
            <span style={{ color: C.blue }}>One conversation.</span>
            <br />
            One trip.
          </div>
          <div
            style={{
              position: "absolute",
              right: 192,
              bottom: 100,
              fontSize: 36,
              color: C.muted,
            }}
          >
            Thank you.
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            left: interpolate(f, [120, 240], [-30, 360], {
              ...ease,
              easing: Easing.inOut(Easing.cubic),
            }),
            top: interpolate(f, [120, 240], [190, 585], {
              ...ease,
              easing: Easing.inOut(Easing.cubic),
            }),
            width: 1200,
            textAlign: "center",
            fontSize: 104,
            fontWeight: 800,
            letterSpacing: -4,
            lineHeight: 1.15,
          }}
        >
          GovGuidePH
        </div>
        <Img
          src={staticFile("pitch/logo-mark.png")}
          style={{
            position: "absolute",
            left: 840,
            top: interpolate(f, [240, 330], [300, 275], ease),
            width: 240,
            height: 240,
            objectFit: "contain",
            opacity: interpolate(f, [240, 330], [0, 1], ease),
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

// A centered cover wipe hides each cut without changing scene timing.
// 140s is the extension's internal before/after page change.
export const PAGE_BOUNDARIES = [
  8, 18, 30, 38, 45, 55, 70, 80, 91, 101, 113, 125, 133, 140, 150, 160, 174,
  186, 198, 209, 220, 232, 244, 254, 264, 273, 280, 290,
];
function PageTransitions() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const half = Math.round(fps * 0.3);
  const boundary = PAGE_BOUNDARIES.find(
    (second) => frame >= second * fps - half && frame <= second * fps + half,
  );
  if (boundary === undefined) return null;
  const offset = frame - boundary * fps;
  const x = interpolate(offset, [-half, -2, 2, half], [-102, 0, 0, 102], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.65, 0, 0.35, 1),
  });
  return (
    <AbsoluteFill
      style={{ pointerEvents: "none", overflow: "hidden", zIndex: 100 }}
    >
      <AbsoluteFill
        style={{
          background: "linear-gradient(110deg,#e5efff,#f0eafd 60%,#fff9ec)",
          translate: x + "% 0",
          borderLeft: "18px solid " + C.blue,
          borderRight: "18px solid " + C.gold,
          boxSizing: "border-box",
        }}
      />
    </AbsoluteFill>
  );
}

export const GovGuidePitch = () => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ ...text, background: C.white }}>
      <Sequence name="Hook" from={0} durationInFrames={8 * fps}>
        <Opening />
      </Sequence>
      <Sequence
        name="Maria and Friday"
        from={8 * fps}
        durationInFrames={10 * fps}
      >
        <Maria />
      </Sequence>
      <Sequence
        name="Three repeat trips"
        from={18 * fps}
        durationInFrames={12 * fps}
      >
        <Journey />
      </Sequence>
      <Sequence
        name="Information gap"
        from={30 * fps}
        durationInFrames={8 * fps}
      >
        <Fragmentation />
      </Sequence>
      <Sequence
        name="Agency backlog"
        from={38 * fps}
        durationInFrames={7 * fps}
      >
        <Backlog />
      </Sequence>
      <Sequence name="GovGuide PH" from={45 * fps} durationInFrames={10 * fps}>
        <PlatformReveal />
      </Sequence>
      <Sequence
        name="Charter grounding"
        from={55 * fps}
        durationInFrames={15 * fps}
      >
        <Grounded />
      </Sequence>
      <Sequence
        name="Sign in and consent"
        from={70 * fps}
        durationInFrames={10 * fps}
      >
        <Product
          asset="login.png"
          title="Start with sign-in and consent."
          caption="Maria understands how her information will be used."
        />
      </Sequence>
      <Sequence name="Ask for PSA" from={80 * fps} durationInFrames={11 * fps}>
        <Product
          asset="psa-answer.png"
          title="Start with Maria’s question."
          caption="Ask naturally. Get routed to PSA guidance."
          focus
        />
      </Sequence>
      <Sequence
        name="PSA checklist"
        from={91 * fps}
        durationInFrames={10 * fps}
      >
        <Product
          asset="psa-checklist.png"
          title="Know what to prepare."
          caption="Requirements, fees and next steps in one conversation."
          focus
        />
      </Sequence>
      <Sequence
        name="Paragraph to form"
        from={101 * fps}
        durationInFrames={12 * fps}
      >
        <DraftTransform />
      </Sequence>
      <Sequence
        name="Discrepancy checker"
        from={113 * fps}
        durationInFrames={12 * fps}
      >
        <Mismatch />
      </Sequence>
      <Sequence
        name="Voice accessibility"
        from={125 * fps}
        durationInFrames={8 * fps}
      >
        <VoiceFlow />
      </Sequence>
      <Sequence
        name="Chrome autofill"
        from={133 * fps}
        durationInFrames={17 * fps}
      >
        <ExtensionFocus />
      </Sequence>
      <Sequence
        name="Citizen decides"
        from={150 * fps}
        durationInFrames={10 * fps}
      >
        <ConnectedStatus mode="review" />
      </Sequence>
      <Sequence
        name="Agency language"
        from={160 * fps}
        durationInFrames={14 * fps}
      >
        <ConnectedStatus mode="propose" />
      </Sequence>
      <Sequence
        name="Agency confirms"
        from={174 * fps}
        durationInFrames={12 * fps}
      >
        <ConnectedStatus mode="confirm" />
      </Sequence>
      <Sequence
        name="Citizen sees action needed"
        from={186 * fps}
        durationInFrames={12 * fps}
      >
        <ConnectedStatus mode="fixed" />
      </Sequence>
      <Sequence name="NBI service" from={198 * fps} durationInFrames={11 * fps}>
        <ServiceSwitch service="NBI" />
      </Sequence>
      <Sequence
        name="PhilHealth service"
        from={209 * fps}
        durationInFrames={11 * fps}
      >
        <ServiceSwitch service="PhilHealth" />
      </Sequence>
      <Sequence
        name="Daily-earner impact"
        from={220 * fps}
        durationInFrames={12 * fps}
      >
        <ValueVisual />
      </Sequence>
      <Sequence
        name="Cost of corrections"
        from={232 * fps}
        durationInFrames={12 * fps}
      >
        <ValueVisual cost />
      </Sequence>
      <Sequence
        name="Trust - sources"
        from={244 * fps}
        durationInFrames={10 * fps}
      >
        <TrustDemo kind="source" />
      </Sequence>
      <Sequence
        name="Trust - people"
        from={254 * fps}
        durationInFrames={10 * fps}
      >
        <TrustDemo kind="human" />
      </Sequence>
      <Sequence
        name="Trust - privacy"
        from={264 * fps}
        durationInFrames={9 * fps}
      >
        <TrustDemo kind="privacy" />
      </Sequence>
      <Sequence
        name="Scale across agencies"
        from={273 * fps}
        durationInFrames={7 * fps}
      >
        <Scale />
      </Sequence>
      <Sequence
        name="Maria outcome"
        from={280 * fps}
        durationInFrames={10 * fps}
      >
        <Close />
      </Sequence>
      <Sequence name="Closing" from={290 * fps} durationInFrames={10 * fps}>
        <End />
      </Sequence>
      <Audio src={staticFile("pitch/underscore-product.wav")} volume={0.65} />
      <Sequence name="Stamp impact cue" from={128} durationInFrames={30}>
        <Audio src={staticFile("pitch/stamp-impact.wav")} volume={0.7} />
      </Sequence>
      <Progress />
      <PageTransitions />
    </AbsoluteFill>
  );
};
