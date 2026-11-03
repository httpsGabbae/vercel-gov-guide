import React from "react";
import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  interpolate,
  Easing,
} from "remotion";
import {
  FileText,
  Check,
  ArrowRight,
  UserRound,
  Building2,
  Mic,
  LockKeyhole,
  Bell,
  MapPin,
  Search,
} from "lucide-react";
const c = {
  ink: "#10223e",
  blue: "#245cdb",
  gold: "#b77b13",
  muted: "#52637a",
  line: "#b8c9e0",
};
const ease = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
  easing: Easing.bezier(0.22, 1, 0.36, 1),
};
const panel: React.CSSProperties = {
  background: "linear-gradient(145deg,#ffffff,#eaf1fc)",
  border: "2px solid #b8c9e0",
  borderRadius: 26,
  boxShadow: "10px 22px 45px #24436b20",
};
const h: React.CSSProperties = {
  fontSize: 76,
  lineHeight: 1.05,
  fontWeight: 800,
  letterSpacing: -2.5,
  margin: 0,
};
const p: React.CSSProperties = {
  fontSize: 32,
  lineHeight: 1.4,
  color: c.muted,
};
function Card({
  children,
  style = {},
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return <div style={{ ...panel, padding: 36, ...style }}>{children}</div>;
}
function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 25,
        fontWeight: 700,
        color: c.blue,
        background: "#dfebff",
        padding: "12px 20px",
        borderRadius: 12,
      }}
    >
      {children}
    </span>
  );
}
function Base({
  children,
  stage = "MARIA’S JOURNEY",
  title,
  note,
}: {
  children: React.ReactNode;
  stage?: string;
  title?: string;
  note?: string;
}) {
  return (
    <AbsoluteFill
      style={{
        fontFamily: "Arial,sans-serif",
        color: c.ink,
        background:
          "radial-gradient(ellipse at 70% 20%,#e0ebff 0%,#f4f2fa 45%,#fffaf0 100%)",
        padding: "65px 96px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          fontSize: 23,
          letterSpacing: 2,
          fontWeight: 700,
          color: c.blue,
          marginBottom: 24,
        }}
      >
        {stage}
      </div>
      {title && <h1 style={h}>{title}</h1>}
      {children}
      {note && (
        <div
          style={{
            position: "absolute",
            left: 96,
            right: 96,
            bottom: 35,
            fontSize: 23,
            color: c.muted,
          }}
        >
          {note}
        </div>
      )}
    </AbsoluteFill>
  );
}
export function Product({
  asset,
  title,
  caption,
}: {
  asset: string;
  title: string;
  caption: string;
  focus?: boolean;
}) {
  const f = useCurrentFrame();
  const login = asset === "login.png",
    check = asset === "psa-checklist.png";
  const y = login
    ? -80
    : check
      ? interpolate(f, [40, 210, 350, 510], [-130, -130, -550, -550], ease)
      : interpolate(f, [40, 160, 230, 450], [-78, -78, -240, -240], ease);
  return (
    <Base
      stage="PREPARE · ACTUAL PROTOTYPE CAPTURE"
      note="Actual interface capture · Demonstration environment · Confirm current agency rules against official sources."
    >
      <div style={{ position: "absolute", left: 96, top: 230, width: 410 }}>
        <h1 style={{ ...h, fontSize: 65 }}>{title}</h1>
        <p style={p}>{caption}</p>
        <div style={{ marginTop: 46 }}>
          <Tag>
            {login
              ? "Consent first"
              : check
                ? "Know what to bring"
                : "Ask in your own words"}
          </Tag>
        </div>
      </div>
      <div
        style={{
          ...panel,
          position: "absolute",
          left: 550,
          top: 150,
          width: 1274,
          height: 810,
          overflow: "hidden",
          transform:
            "perspective(1800px) rotateY(" +
            interpolate(f, [0, 60], [-3, 0], ease) +
            "deg)",
        }}
      >
        <div
          style={{
            height: 48,
            background: "#d7e4fa",
            borderBottom: "1px solid #b8c9e0",
            padding: "8px 24px",
            fontSize: 23,
            color: c.muted,
          }}
        >
          GovGuidePH / {login ? "Sign in" : "Conversation"}
        </div>
        <div
          style={{
            position: "absolute",
            inset: "49px 0 0",
            height: !login && !check ? 500 : undefined,
            overflow: "hidden",
            background: "white",
          }}
        >
          <Img
            src={staticFile("pitch/" + asset)}
            style={{
              position: "absolute",
              width: login ? 1000 : 1274,
              maxWidth: "none",
              left: login ? 137 : 0,
              top: y,
            }}
          />
          {!login && (
            <div
              style={{
                position: "absolute",
                left: 50,
                right: 36,
                top: check ? 135 : 160,
                height: check ? 200 : 290,
                border: "3px solid #2563eb",
                borderRadius: 14,
                opacity: interpolate(f, [180, 220], [0, 1], ease),
                boxShadow: "0 0 0 400px #ffffff12",
                pointerEvents: "none",
              }}
            />
          )}
        </div>
        {!login && !check && (
          <div
            style={{
              position: "absolute",
              left: 45,
              right: 45,
              top: 590,
              borderTop: "2px solid #bfd0e7",
              paddingTop: 28,
              fontSize: 37,
              color: c.blue,
            }}
          >
            Requirements first.
            <br />
            <span style={{ fontSize: 29, color: c.muted }}>
              Review the checklist before making the trip.
            </span>
          </div>
        )}
      </div>
    </Base>
  );
}
export function Opening() {
  const f = useCurrentFrame();
  const hit = interpolate(f, [110, 128, 136, 146], [1.8, 0.95, 1.04, 1], ease);
  return (
    <Base
      stage="THE COST OF BALIK-PILA"
      title="A missing document. Another lost day."
    >
      <div
        style={{
          position: "absolute",
          left: 150,
          top: 290,
          width: 1630,
          height: 570,
          borderRadius: 35,
          background: "linear-gradient(160deg,#d7e2f4,#f3f6fb)",
          border: "2px solid #b4c6df",
          boxShadow: "0 45px 60px #29486c20",
        }}
      />
      <Card
        style={{
          position: "absolute",
          left: 970,
          top: 280,
          width: 650,
          height: 510,
          transform: "perspective(1400px) rotateY(-12deg) rotateZ(5deg)",
        }}
      >
        <div style={{ fontSize: 27, color: c.muted }}>REQUIRED DOCUMENTS</div>
        {[
          "Application form",
          "Valid identification",
          "Supporting document",
        ].map((x, i) => (
          <div
            key={x}
            style={{
              fontSize: 34,
              marginTop: 36,
              padding: 18,
              background: i === 2 && f > 128 ? "#fff0ce" : "#ffffff80",
              borderRadius: 10,
              border:
                i === 2 && f > 128
                  ? "2px solid #ca8a04"
                  : "2px solid transparent",
            }}
          >
            {i < 2 ? (
              <Check size={28} style={{ marginRight: 16 }} />
            ) : (
              <span style={{ color: c.gold, marginRight: 16 }}>!</span>
            )}
            {x}
          </div>
        ))}
      </Card>
      <Card
        style={{
          position: "absolute",
          left: 235,
          top: 390,
          width: 850,
          height: 330,
          transform: "perspective(1300px) rotateY(8deg) rotateZ(-5deg)",
          translate:
            interpolate(f, [128, 131, 135, 140], [0, -6, 4, 0], ease) + "px 0",
        }}
      >
        <div style={{ fontSize: 28, color: c.muted }}>
          GOVERNMENT SERVICE COUNTER
        </div>
        <div style={{ fontSize: 140, fontWeight: 800, marginTop: 30 }}>
          A-047 <FileText size={104} />
        </div>
      </Card>
      <div
        style={{
          position: "absolute",
          left: 650,
          top: 590,
          fontSize: 65,
          fontWeight: 800,
          padding: "22px 36px",
          border: "8px double #a34d14",
          color: "#a34d14",
          background: "#fff7dfeb",
          rotate: interpolate(f, [110, 128, 145], [-18, -7, -9], ease) + "deg",
          scale: hit,
          opacity: interpolate(f, [110, 114], [0, 1], ease),
          translate: "0 " + interpolate(f, [110, 128], [-100, 0], ease) + "px",
        }}
      >
        KULANG PO
      </div>
      <div style={{ position: "absolute", left: 240, top: 910, fontSize: 37 }}>
        Nobody told Maria what to bring.
      </div>
    </Base>
  );
}
export function Journey() {
  const f = useCurrentFrame(),
    active = f < 200 ? 0 : f < 430 ? 1 : 2;
  return (
    <Base
      stage="MARIA’S JOURNEY · ILLUSTRATIVE SCENARIO"
      title="The same request. Three visits."
    >
      <svg
        width="1650"
        height="240"
        style={{ position: "absolute", left: 130, top: 610 }}
      >
        <path
          d="M100 120 C400 -10 500 230 825 120 S1300 0 1540 120"
          fill="none"
          stroke="#94aed5"
          strokeWidth="8"
          strokeDasharray="14 12"
        />
      </svg>
      {["Missing document", "Unclear ID", "Enrollment deadline missed"].map(
        (x, i) => (
          <Card
            key={x}
            style={{
              position: "absolute",
              left: 120 + i * 570,
              top: 330 + (i % 2) * 65,
              width: 520,
              height: 340,
              borderColor: i === active ? "#2563eb" : c.line,
              transform:
                "perspective(1400px) rotateY(" + (i - active) * 5 + "deg)",
              opacity: i <= active ? 1 : 0.6,
            }}
          >
            <MapPin size={50} color={c.blue} />
            <div style={{ fontSize: 27, color: c.muted, margin: "22px 0" }}>
              VISIT {i + 1}
            </div>
            <div style={{ fontSize: 46, fontWeight: 800 }}>{x}</div>
          </Card>
        ),
      )}
      <Card
        style={{
          position: "absolute",
          left: interpolate(
            f,
            [80, 200, 330, 430],
            [200, 770, 770, 1340],
            ease,
          ),
          top: 780,
          width: 350,
          height: 150,
          display: "flex",
          alignItems: "center",
          gap: 25,
          transform: "rotateZ(-5deg)",
        }}
      >
        <FileText size={64} color={c.blue} />
        <b style={{ fontSize: 30 }}>Maria’s request</b>
      </Card>
    </Base>
  );
}
export function Fragmentation() {
  const f = useCurrentFrame(),
    spread = interpolate(f, [0, 300], [0, 65], ease);
  return (
    <Base stage="THE INFORMATION GAP">
      {[
        "Agency website",
        "Requirements",
        "Application form",
        "Office instructions",
      ].map((x, i) => (
        <Card
          key={x}
          style={{
            position: "absolute",
            left: (i % 2 ? 1260 : 110) + (i % 2 ? spread : -spread),
            top: (i < 2 ? 180 : 655) + (i < 2 ? -spread / 3 : spread / 3),
            width: 510,
            height: 260,
            rotate: (i % 2 ? 6 : -6) + "deg",
          }}
        >
          <div
            style={{
              fontSize: 29,
              fontWeight: 700,
              borderBottom: "2px solid #b8c9e0",
              paddingBottom: 20,
            }}
          >
            {x}
          </div>
          {[0, 1, 2].map((j) => (
            <div
              key={j}
              style={{
                height: 14,
                width: 75 - j * 14 + "%",
                background: j === 1 ? "#c4d5ef" : "#dce5f2",
                marginTop: 22,
                borderRadius: 5,
              }}
            />
          ))}
        </Card>
      ))}
      <div
        style={{
          position: "absolute",
          left: 480,
          top: 380,
          width: 960,
          textAlign: "center",
          padding: 42,
          background: "#f6f7fbed",
          borderRadius: 30,
        }}
      >
        <h1 style={{ ...h, fontSize: 85 }}>
          Separate websites.
          <br />
          Conflicting instructions.
        </h1>
        <p style={{ ...p, fontSize: 40, color: c.blue }}>
          Maria needs one trusted next step.
        </p>
      </div>
    </Base>
  );
}
export function PlatformReveal() {
  const f = useCurrentFrame();
  return (
    <Base
      stage="ONE PLATFORM · TWO SIDES"
      title="Prepare. Act. Know what happens next."
    >
      <svg
        width="1700"
        height="400"
        style={{ position: "absolute", left: 110, top: 370 }}
      >
        <path
          d="M200 200 H1500"
          stroke="#83a7e5"
          strokeWidth="8"
          strokeDasharray="12 8"
        />
      </svg>
      <Card
        style={{
          position: "absolute",
          left: 100,
          top: 440,
          width: 300,
          height: 360,
          textAlign: "center",
        }}
      >
        <UserRound size={94} color={c.blue} />
        <h2 style={{ fontSize: 40 }}>Maria</h2>
        <div style={p}>A request to finish</div>
      </Card>
      <Card
        style={{
          position: "absolute",
          left: 470,
          top: 280,
          width: 980,
          height: 650,
          scale: interpolate(f, [0, 80], [0.92, 1], ease),
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            borderBottom: "2px solid #bfd0e7",
            paddingBottom: 25,
          }}
        >
          <Img
            src={staticFile("pitch/logo-mark.png")}
            style={{ width: 80, height: 80, objectFit: "contain" }}
          />
          <b style={{ fontSize: 54 }}>GovGuidePH</b>
        </div>
        <div
          style={{
            background: "#e1ecff",
            padding: 27,
            borderRadius: 18,
            fontSize: 37,
            marginTop: 32,
          }}
        >
          Birth certificate para sa anak ko.
        </div>
        <div style={{ display: "flex", gap: 25, marginTop: 36 }}>
          {["Prepare", "Review & act", "Track"].map((x, i) => (
            <div
              key={x}
              style={{
                flex: 1,
                padding: "30px 18px",
                background: "#f9fbff",
                border: "2px solid #c1d1e8",
                borderRadius: 16,
                opacity: interpolate(
                  f,
                  [30 + i * 35, 60 + i * 35],
                  [0, 1],
                  ease,
                ),
              }}
            >
              <div style={{ fontSize: 29, color: c.blue }}>0{i + 1}</div>
              <b style={{ fontSize: 32 }}>{x}</b>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 30, fontSize: 29, color: c.muted }}>
          Filipino · English · Taglish
        </div>
      </Card>
      <Card
        style={{
          position: "absolute",
          left: 1520,
          top: 440,
          width: 300,
          height: 360,
          textAlign: "center",
        }}
      >
        <Building2 size={94} color={c.blue} />
        <h2 style={{ fontSize: 40 }}>Agency</h2>
        <div style={p}>A clear response</div>
      </Card>
    </Base>
  );
}
export function Grounded() {
  const f = useCurrentFrame();
  return (
    <Base
      stage="PREPARE · WORKFLOW ILLUSTRATION"
      title="An official passage becomes useful guidance."
      note="Simplified source-to-answer illustration. Unsupported questions are referred to the agency."
    >
      <Card
        style={{
          position: "absolute",
          left: 140,
          top: 300,
          width: 700,
          height: 600,
          transform: "perspective(1700px) rotateY(7deg)",
        }}
      >
        <FileText size={64} color={c.blue} />
        <h2 style={{ fontSize: 43 }}>Citizen’s Charter</h2>
        <div style={{ ...p, marginBottom: 34 }}>Service requirements</div>
        <div
          style={{
            fontSize: 34,
            lineHeight: 1.9,
            padding: 24,
            background: f > 80 ? "#fff0bb" : "#edf2fa",
            borderLeft: "6px solid #d39628",
          }}
        >
          Application form
          <br />
          Valid identification
        </div>
        <div
          style={{
            height: 14,
            background: "#cfdaea",
            marginTop: 35,
            width: "85%",
          }}
        />
        <div
          style={{
            height: 14,
            background: "#cfdaea",
            marginTop: 22,
            width: "65%",
          }}
        />
      </Card>
      <ArrowRight
        size={100}
        color={c.blue}
        style={{ position: "absolute", left: 900, top: 550 }}
      />
      <Card
        style={{
          position: "absolute",
          left: 1080,
          top: 350,
          width: 700,
          height: 500,
          opacity: interpolate(f, [110, 170], [0, 1], ease),
          translate: interpolate(f, [110, 170], [-60, 0], ease) + "px 0",
        }}
      >
        <div style={{ fontSize: 27, color: c.blue }}>PLAIN-LANGUAGE ANSWER</div>
        <h2 style={{ fontSize: 48, lineHeight: 1.2 }}>
          Ihanda ang form
          <br />
          at valid ID.
        </h2>
        <Tag>View official source</Tag>
        <div style={{ ...p, marginTop: 40 }}>
          The answer stays connected
          <br />
          to its evidence.
        </div>
      </Card>
    </Base>
  );
}
export function DraftTransform() {
  const f = useCurrentFrame();
  const colors = ["#2563eb", "#8b5bb7", "#aa7114"];
  return (
    <Base stage="ACT · WORKFLOW ILLUSTRATION" title="Her words become a draft.">
      <Card
        style={{
          position: "absolute",
          left: 100,
          top: 320,
          width: 680,
          height: 570,
        }}
      >
        <div style={{ fontSize: 27, color: c.muted, marginBottom: 35 }}>
          MARIA’S MESSAGE
        </div>
        <div style={{ fontSize: 44, lineHeight: 1.65 }}>
          Ako si{" "}
          <span style={{ color: colors[0], fontWeight: 700 }}>
            Maria Cristina
          </span>
          .<br />
          Birth certificate ni{" "}
          <span style={{ color: colors[1], fontWeight: 700 }}>Daniel</span>,
          para sa{" "}
          <span style={{ color: colors[2], fontWeight: 700 }}>
            school enrollment
          </span>
          .
        </div>
      </Card>
      <Card
        style={{
          position: "absolute",
          left: 1000,
          top: 280,
          width: 800,
          height: 660,
        }}
      >
        <div style={{ fontSize: 28, color: c.muted, marginBottom: 25 }}>
          REVIEW YOUR DRAFT
        </div>
        {["Requestor", "Document owner", "Purpose", "Date of birth"].map(
          (x, i) => (
            <div
              key={x}
              style={{
                borderBottom: "2px solid #c8d5e7",
                padding: "19px 12px",
                height: 122,
                background: i === 3 && f > 240 ? "#fff0c9" : "transparent",
              }}
            >
              <div style={{ fontSize: 24, color: c.muted }}>{x}</div>
              <div
                style={{
                  fontSize: 36,
                  fontWeight: 700,
                  color: i === 3 ? c.gold : colors[i],
                  opacity: interpolate(
                    f,
                    [50 + i * 65, 85 + i * 65],
                    [0, 1],
                    ease,
                  ),
                  translate:
                    interpolate(
                      f,
                      [50 + i * 65, 85 + i * 65],
                      [-220, 0],
                      ease,
                    ) + "px 0",
                }}
              >
                {
                  [
                    "Maria Cristina",
                    "Daniel",
                    "School enrollment",
                    "Please confirm",
                  ][i]
                }
              </div>
            </div>
          ),
        )}
      </Card>
      <ArrowRight
        size={90}
        color={c.blue}
        style={{ position: "absolute", left: 835, top: 560 }}
      />
    </Base>
  );
}
export function VoiceFlow() {
  const f = useCurrentFrame();
  return (
    <Base
      stage="PREPARE · VOICE INTERACTION ILLUSTRATION"
      title="Speak. See the words. Get guidance."
    >
      <Card
        style={{
          position: "absolute",
          left: 100,
          top: 320,
          width: 580,
          height: 580,
          textAlign: "center",
        }}
      >
        <Mic size={125} color={c.blue} />
        <div
          style={{
            display: "flex",
            height: 100,
            alignItems: "center",
            justifyContent: "center",
            gap: 9,
            marginTop: 30,
          }}
        >
          {Array.from({ length: 25 }, (_, i) => (
            <div
              key={i}
              style={{
                width: 8,
                borderRadius: 8,
                background: c.blue,
                height:
                  f < 220
                    ? 20 + 65 * Math.abs(Math.sin(f * 0.12 + i * 0.7))
                    : 14,
              }}
            />
          ))}
        </div>
        <div style={{ fontSize: 37, marginTop: 40 }}>
          “Birth certificate
          <br />
          para sa anak ko.”
        </div>
      </Card>
      <Card
        style={{
          position: "absolute",
          left: 780,
          top: 280,
          width: 1040,
          height: 650,
        }}
      >
        <Tag>Live transcript</Tag>
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            marginTop: 35,
            minHeight: 140,
          }}
        >
          {"Birth certificate para sa anak ko.".slice(
            0,
            Math.floor(interpolate(f, [30, 200], [0, 34], ease)),
          )}
        </div>
        <div
          style={{
            borderTop: "2px solid #b8c9e0",
            paddingTop: 36,
            opacity: interpolate(f, [210, 250], [0, 1], ease),
          }}
        >
          <Tag>PSA guidance</Tag>
          <div style={{ fontSize: 39, marginTop: 28 }}>
            Let’s prepare your request.
          </div>
          <div style={{ ...p, marginTop: 16 }}>
            Requirements · Official source · Next step
          </div>
        </div>
      </Card>
    </Base>
  );
}
export function ExtensionFocus() {
  const f = useCurrentFrame(),
    after = f >= 420;
  return (
    <Base
      stage="ACT · CHROME AUTOFILL"
      title="Two fields. One review. Then autofill."
      note="Installed extension capture on a local sample form; two verified fields filled. Review step illustrated."
    >
      <Card
        style={{
          position: "absolute",
          left: 96,
          top: 300,
          width: 530,
          height: 610,
        }}
      >
        <div style={{ fontSize: 27, color: c.blue }}>COMPANION PROPOSAL</div>
        <h2 style={{ fontSize: 43 }}>Use verified details</h2>
        <div style={{ fontSize: 34, lineHeight: 1.8 }}>
          Civil status: SINGLE
          <br />
          Sex: MALE
        </div>
        <div
          style={{
            background: f > 220 ? "#2460dc" : "#d9e5f8",
            color: f > 220 ? "white" : c.ink,
            borderRadius: 14,
            padding: 23,
            fontSize: 32,
            fontWeight: 700,
            marginTop: 42,
          }}
        >
          {after
            ? "Applied to form"
            : f > 220
              ? "Review and confirm"
              : "Ready to review"}
        </div>
        <div style={{ ...p, marginTop: 30 }}>You stay in control.</div>
      </Card>
      <div
        style={{
          ...panel,
          position: "absolute",
          left: 690,
          top: 270,
          width: 1130,
          height: 670,
          overflow: "hidden",
          background: "white",
        }}
      >
        <Img
          src={staticFile(
            "pitch/extension-" + (after ? "after" : "before") + ".png",
          )}
          style={{
            position: "absolute",
            width: 3686,
            left: -1150,
            top: -1250,
            maxWidth: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 130,
            padding: 17,
            borderRadius: 12,
            background: after ? "#dbf4e8" : "#eaf0fa",
            border: "2px solid " + (after ? "#1d9b68" : "#a6bddc"),
            fontSize: 30,
            fontWeight: 700,
          }}
        >
          {after
            ? "2 verified fields filled"
            : "Review the proposed values first"}
        </div>
      </div>
    </Base>
  );
}
export function ConnectedStatus({
  mode,
}: {
  mode: "review" | "propose" | "confirm" | "fixed";
}) {
  const f = useCurrentFrame();
  const confirmed = (mode === "confirm" && f > 130) || mode === "fixed";
  return (
    <Base
      stage="KNOW WHAT HAPPENS NEXT · WORKFLOW ILLUSTRATION"
      title={
        mode === "review"
          ? "Maria reviews. Maria submits."
          : mode === "propose"
            ? "One agency update. A clear next step."
            : mode === "fixed"
              ? "Fix the issue before making the trip."
              : "Confirm here. Notify Maria there."
      }
    >
      <Card
        style={{
          position: "absolute",
          left: 110,
          top: 310,
          width: 740,
          height: 600,
          transform: "perspective(1600px) rotateY(4deg)",
        }}
      >
        <Tag>{mode === "review" ? "Citizen review" : "Agency workspace"}</Tag>
        <div style={{ fontSize: 40, fontWeight: 700, marginTop: 45 }}>
          {mode === "review"
            ? "Birth certificate request"
            : "“missing form at malabo”"}
        </div>
        <div style={{ fontSize: 34, lineHeight: 1.7, marginTop: 30 }}>
          {mode === "review" ? (
            <>
              Check details
              <br />
              Review attachments
            </>
          ) : (
            <>
              Missing Document
              <br />
              Blurry Image
            </>
          )}
        </div>
        <div
          style={{
            marginTop: 45,
            padding: 23,
            borderRadius: 15,
            background: confirmed ? "#16825c" : c.blue,
            color: "white",
            fontSize: 34,
            fontWeight: 700,
          }}
        >
          {mode === "review"
            ? "Submit request"
            : confirmed
              ? "Confirmed"
              : "Confirm update"}
        </div>
      </Card>
      <div
        style={{
          position: "absolute",
          left: 910,
          top: 530,
          opacity: interpolate(f, [80, 140], [0, 1], ease),
          translate: confirmed
            ? interpolate(f, [130, 220], [0, 65], ease) + "px 0"
            : "0 0",
        }}
      >
        <ArrowRight size={90} color={c.blue} />
      </div>
      <Card
        style={{
          position: "absolute",
          left: 1090,
          top: 310,
          width: 700,
          height: 600,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <Bell size={48} color={c.blue} />
          <Tag>Maria’s tracker</Tag>
        </div>
        <h2 style={{ fontSize: 46, marginTop: 50 }}>
          {mode === "review"
            ? "Ready to submit"
            : confirmed
              ? "Action needed"
              : "Waiting for confirmation"}
        </h2>
        <div style={{ fontSize: 34, lineHeight: 1.6, color: c.muted }}>
          {confirmed
            ? "Upload a clearer ID and attach the missing form."
            : mode === "review"
              ? "The AI prepares. Maria decides."
              : "Nothing is saved until the handler confirms."}
        </div>
        <div
          style={{
            marginTop: 40,
            border: "2px solid #a9bfdf",
            borderRadius: 15,
            padding: 23,
            fontSize: 30,
            background: mode === "fixed" && f > 170 ? "#daf2e6" : "#edf3ff",
          }}
        >
          {mode === "fixed" && f > 170
            ? "Correction sent · In process"
            : mode === "review"
              ? "Submitted → In process"
              : "Specific issue · Specific next step"}
        </div>
      </Card>
    </Base>
  );
}
export function ServiceSwitch({ service }: { service: "NBI" | "PhilHealth" }) {
  const f = useCurrentFrame();
  return (
    <Base
      stage="ONE PLATFORM · DIFFERENT SERVICE"
      title="Change the service. Keep the familiar guide."
      note="Service-switch workflow illustration. Each service uses its own official requirements and source."
    >
      <Card
        style={{
          position: "absolute",
          left: 150,
          top: 290,
          width: 1620,
          height: 650,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 24,
            borderBottom: "2px solid #b7c9e4",
            paddingBottom: 25,
          }}
        >
          {["PSA", "NBI", "PhilHealth"].map((x) => (
            <div
              key={x}
              style={{
                fontSize: 34,
                padding: "18px 34px",
                borderRadius: 12,
                background: x === service ? c.blue : "#e2eafa",
                color: x === service ? "white" : c.muted,
              }}
            >
              {x}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 60, marginTop: 48 }}>
          <div style={{ width: 480 }}>
            <Building2 size={100} color={c.blue} />
            <h2 style={{ fontSize: 55, margin: "30px 0" }}>
              {service === "NBI" ? "NBI clearance" : "PhilHealth registration"}
            </h2>
          </div>
          <div
            style={{
              flex: 1,
              opacity: interpolate(f, [0, 45], [0, 1], ease),
              translate: interpolate(f, [0, 60], [80, 0], ease) + "px 0",
            }}
          >
            <div
              style={{
                fontSize: 40,
                padding: 26,
                background: "#dce9ff",
                borderRadius: 16,
              }}
            >
              {service === "NBI"
                ? "Kailangan ko ng NBI clearance."
                : "Paano mag-register sa PhilHealth?"}
            </div>
            <div style={{ fontSize: 39, lineHeight: 1.7, marginTop: 35 }}>
              {service === "NBI" ? (
                <>
                  Clearance preparation
                  <br />
                  Official appointment guidance
                </>
              ) : (
                <>
                  PMRF preparation
                  <br />
                  Membership requirements
                </>
              )}
            </div>
            <div style={{ marginTop: 20 }}>
              <Tag>Official agency source</Tag>
            </div>
          </div>
        </div>
      </Card>
    </Base>
  );
}
export function ValueVisual({ cost = false }: { cost?: boolean }) {
  return (
    <Base
      stage={cost ? "PREVENT AVOIDABLE ERRORS" : "PROTECT THE DAY"}
      title={
        cost
          ? "A small error can become a costly correction."
          : "One fewer repeat trip. One day protected."
      }
      note={
        cost
          ? "PSA administrative-petition filing fees: RA 9048 / covered RA 10172 corrections. Filing fees only; other costs may apply."
          : "₱755: NCR non-agricultural daily minimum wage reference, NWPC. Illustrative potential benefit—not a measured pilot result."
      }
    >
      <Card
        style={{
          position: "absolute",
          left: 130,
          top: 320,
          width: 660,
          height: 580,
          transform: "perspective(1400px) rotateY(9deg) rotateZ(-3deg)",
        }}
      >
        <FileText size={70} color={c.blue} />
        <div
          style={{
            fontSize: 29,
            letterSpacing: 2,
            marginTop: 30,
            color: c.muted,
          }}
        >
          {cost ? "CIVIL REGISTRY CORRECTION" : "A REPEAT TRIP COSTS"}
        </div>
        <div style={{ fontSize: 38, lineHeight: 1.8, marginTop: 36 }}>
          {cost ? (
            <>
              Review the name
              <br />
              Compare the document
              <br />
              Resolve mismatches early
            </>
          ) : (
            <>
              Transport
              <br />
              Time in line
              <br />A day away from work
            </>
          )}
        </div>
      </Card>
      <div style={{ position: "absolute", left: 940, top: 350, width: 820 }}>
        {cost ? (
          <>
            <div style={{ fontSize: 108, fontWeight: 800 }}>₱1,000</div>
            <div style={{ ...p, marginBottom: 34 }}>
              Clerical-error correction
            </div>
            <div style={{ fontSize: 108, fontWeight: 800 }}>₱3,000</div>
            <div style={p}>First-name / covered RA 10172 correction</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 178, fontWeight: 800, letterSpacing: -8 }}>
              ₱755
            </div>
            <div style={{ fontSize: 44, color: c.blue }}>
              Illustrative day’s pay
            </div>
            <div style={{ ...p, marginTop: 45 }}>
              Plus transport, time,
              <br />
              and less uncertainty.
            </div>
          </>
        )}
      </div>
    </Base>
  );
}
export function TrustDemo({ kind }: { kind: "source" | "human" | "privacy" }) {
  const f = useCurrentFrame();
  return (
    <Base
      stage="TRUST, MADE VISIBLE · WORKFLOW ILLUSTRATION"
      title={
        kind === "source"
          ? "Inspect the evidence behind the answer."
          : kind === "human"
            ? "The person makes the final decision."
            : "The right access. A visible activity record."
      }
    >
      {kind === "source" ? (
        <>
          <Card
            style={{
              position: "absolute",
              left: 120,
              top: 330,
              width: 700,
              height: 530,
            }}
          >
            <div style={{ fontSize: 28, color: c.blue }}>GUIDANCE</div>
            <h2 style={{ fontSize: 48 }}>
              Prepare the required
              <br />
              form and identification.
            </h2>
            <Tag>Open Citizen’s Charter</Tag>
            <Search size={60} color={c.blue} style={{ margin: 35 }} />
          </Card>
          <Card
            style={{
              position: "absolute",
              left: 990,
              top: 280,
              width: 790,
              height: 650,
              translate: interpolate(f, [40, 100], [100, 0], ease) + "px 0",
            }}
          >
            <FileText size={70} color={c.blue} />
            <h2 style={{ fontSize: 44 }}>Official source</h2>
            <div
              style={{
                fontSize: 36,
                padding: 32,
                background: "#fff0bd",
                borderLeft: "6px solid #c49430",
              }}
            >
              Relevant service requirements
            </div>
            <p style={p}>
              Check the passage.
              <br />
              Check the agency.
              <br />
              Check the current version.
            </p>
          </Card>
        </>
      ) : kind === "human" ? (
        <Card
          style={{
            position: "absolute",
            left: 300,
            top: 310,
            width: 1320,
            height: 600,
          }}
        >
          <Tag>Proposed action</Tag>
          <h2 style={{ fontSize: 55 }}>Submit this request?</h2>
          <div style={{ fontSize: 36, color: c.muted }}>
            Review details and attachments before proceeding.
          </div>
          <div style={{ display: "flex", gap: 30, marginTop: 65 }}>
            <div
              style={{
                padding: 28,
                border: "2px solid #b7c9e2",
                borderRadius: 16,
                fontSize: 38,
              }}
            >
              Edit details
            </div>
            <div
              style={{
                padding: 28,
                background: f > 220 ? "#16825c" : c.blue,
                color: "white",
                borderRadius: 16,
                fontSize: 38,
              }}
            >
              {f > 220 ? "Confirmed by citizen" : "Confirm submission"}
            </div>
          </div>
          <div style={{ marginTop: 40, fontSize: 28, color: c.muted }}>
            Agency handlers also confirm their updates.
          </div>
        </Card>
      ) : (
        <Card
          style={{
            position: "absolute",
            left: 150,
            top: 300,
            width: 1620,
            height: 620,
          }}
        >
          <div style={{ display: "flex", gap: 70 }}>
            <div style={{ width: 360 }}>
              <LockKeyhole size={100} color={c.blue} />
              <h2 style={{ fontSize: 45 }}>Agency access</h2>
              <Tag>Authorized handler</Tag>
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 37,
                  fontWeight: 700,
                  borderBottom: "2px solid #b7c9e2",
                  paddingBottom: 25,
                }}
              >
                Activity record
              </div>
              {[
                "Consent recorded",
                "Handler confirmed update",
                "Citizen sent correction",
              ].map((x, i) => (
                <div
                  key={x}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 32,
                    padding: "30px 0",
                    borderBottom: "1px solid #bfd0e7",
                    opacity: interpolate(
                      f,
                      [i * 45, i * 45 + 35],
                      [0, 1],
                      ease,
                    ),
                  }}
                >
                  <span>{x}</span>
                  <span style={{ color: c.muted }}>Recorded</span>
                </div>
              ))}
              <div style={{ fontSize: 28, color: c.muted, marginTop: 28 }}>
                Access is scoped to the agency and role.
              </div>
            </div>
          </div>
        </Card>
      )}
    </Base>
  );
}
