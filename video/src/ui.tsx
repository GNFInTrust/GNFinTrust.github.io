import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadInterTight } from "@remotion/google-fonts/InterTight";

// Same fonts and colours as the site (theme.css)
const { fontFamily: body } = loadInter("normal", {
  weights: ["400", "500", "600", "700"],
  subsets: ["cyrillic", "latin"],
});
const { fontFamily: display } = loadInterTight("normal", {
  weights: ["600", "700", "800"],
  subsets: ["cyrillic", "latin"],
});

export const F = { body, display };

export const C = {
  ink: "#1D1D1F",
  slate: "#6E6E73",
  muted: "#86868B",
  paper: "#F5F5F7",
  white: "#FFFFFF",
  line: "#E5E5EA",
  red: "#D70F2E",
  redSoft: "#FDEEF0",
  green: "#1E7B4E",
  greenSoft: "#E8F5EE",
};

export const PAD = 90;

// Numbers the Russian way: 1 000 000
export const fmt = (n: number) =>
  Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");

// 0 → 1 spring that starts `delay` frames into the current sequence
export const useIn = (delay = 0, damping = 18) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping, mass: 0.8 } });
};

// Rises out of a slight blur, like the .rv blocks on the site
export const Rise: React.FC<{
  delay?: number;
  y?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ delay = 0, y = 50, style, children }) => {
  const p = useIn(delay);
  return (
    <div
      style={{
        opacity: p,
        transform: `translateY(${(1 - p) * y}px)`,
        filter: `blur(${(1 - p) * 10}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// Fades the whole scene in and out so cuts are soft
export const Scene: React.FC<{ dur: number; children: React.ReactNode }> = ({ dur, children }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 8, dur - 10, dur], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill
      style={{
        opacity: o,
        padding: `340px ${PAD}px 300px`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

// Headline whose words rise one after another
export const Headline: React.FC<{
  text: string;
  size?: number;
  delay?: number;
  color?: string;
  accent?: string[];
}> = ({ text, size = 118, delay = 0, color = C.ink, accent = [] }) => {
  const words = text.split(" ");
  return (
    <div
      style={{
        fontFamily: F.display,
        fontWeight: 800,
        fontSize: size,
        lineHeight: 1.04,
        letterSpacing: -size * 0.03,
        color,
        display: "flex",
        flexWrap: "wrap",
        columnGap: size * 0.26,
      }}
    >
      {words.map((w, i) => (
        <Rise key={i} delay={delay + i * 4} y={size * 0.5}>
          <span style={{ color: accent.includes(w) ? C.red : undefined }}>{w}</span>
        </Rise>
      ))}
    </div>
  );
};

export const Text: React.FC<{
  children: React.ReactNode;
  size?: number;
  color?: string;
  weight?: number;
  style?: React.CSSProperties;
}> = ({ children, size = 50, color = C.slate, weight = 500, style }) => (
  <div style={{ fontFamily: F.body, fontSize: size, lineHeight: 1.3, color, fontWeight: weight, ...style }}>
    {children}
  </div>
);

export const Tag: React.FC<{ children: React.ReactNode; color?: string; bg?: string }> = ({
  children,
  color = C.red,
  bg = C.redSoft,
}) => (
  <span
    style={{
      display: "inline-block",
      fontFamily: F.body,
      fontWeight: 700,
      fontSize: 34,
      letterSpacing: 1,
      textTransform: "uppercase",
      color,
      background: bg,
      padding: "12px 26px",
      borderRadius: 999,
    }}
  >
    {children}
  </span>
);

export const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div
    style={{
      background: C.white,
      borderRadius: 44,
      padding: "44px 52px",
      boxShadow: "0 30px 80px rgba(0,0,0,0.07), 0 2px 6px rgba(0,0,0,0.04)",
      ...style,
    }}
  >
    {children}
  </div>
);

// Check or cross in a circle
export const Mark: React.FC<{ ok?: boolean; size?: number }> = ({ ok = true, size = 64 }) => (
  <div
    style={{
      width: size,
      height: size,
      flex: "none",
      borderRadius: size,
      background: ok ? C.greenSoft : C.redSoft,
      color: ok ? C.green : C.red,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: F.display,
      fontWeight: 800,
      fontSize: size * 0.55,
    }}
  >
    {ok ? "✓" : "✕"}
  </div>
);

export const Row: React.FC<{ delay: number; ok?: boolean; children: React.ReactNode }> = ({ delay, ok, children }) => (
  <Rise delay={delay} y={30} style={{ display: "flex", alignItems: "center", gap: 30, marginBottom: 30 }}>
    <Mark ok={ok} />
    <Text size={44} color={C.ink}>
      {children}
    </Text>
  </Rise>
);

// Number that counts up from 0
export const Count: React.FC<{ to: number; delay?: number; len?: number; suffix?: string }> = ({
  to,
  delay = 0,
  len = 30,
  suffix = "",
}) => {
  const frame = useCurrentFrame();
  const v = interpolate(frame - delay, [0, len], [0, to], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  return (
    <span style={{ fontVariantNumeric: "tabular-nums" }}>
      {fmt(v)}
      {suffix}
    </span>
  );
};

// Equation: each token appears in turn; tokens starting with "=" or wrapped in **…** are accented
export const Equation: React.FC<{ parts: string[]; delay?: number; size?: number; step?: number }> = ({
  parts,
  delay = 0,
  size = 76,
  step = 8,
}) => (
  <div
    style={{
      display: "flex",
      flexWrap: "wrap",
      alignItems: "baseline",
      columnGap: size * 0.3,
      rowGap: size * 0.2,
      fontFamily: F.display,
      fontWeight: 700,
      fontSize: size,
      color: C.ink,
      letterSpacing: -1,
    }}
  >
    {parts.map((t, i) => {
      const strong = t.startsWith("**");
      const op = ["=", "×", "−", "+", "÷"].includes(t);
      return (
        <Rise key={i} delay={delay + i * step} y={30}>
          <span
            style={{
              color: op ? C.muted : strong ? C.red : C.ink,
              fontWeight: strong ? 800 : 700,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {t.replace(/\*\*/g, "")}
          </span>
        </Rise>
      );
    })}
  </div>
);

// Frame shared by every lesson: brand at the top, progress bar and source at the bottom
export const Frame: React.FC<{ lesson: string; source?: string; children: React.ReactNode }> = ({
  lesson,
  source,
  children,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const drift = Math.sin(frame / 90) * 60;
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      {/* Soft red glow drifting behind the content */}
      <div
        style={{
          position: "absolute",
          width: 1100,
          height: 1100,
          left: -300 + drift,
          top: 1050 - drift,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(215,15,46,0.10), rgba(215,15,46,0) 65%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 150,
          left: PAD,
          right: PAD,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontFamily: F.display,
          fontWeight: 700,
          fontSize: 40,
          color: C.ink,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 22, height: 22, borderRadius: 22, background: C.red }} />
          GN FinTrust
        </div>
        <div style={{ fontFamily: F.body, fontWeight: 600, fontSize: 32, color: C.slate }}>{lesson}</div>
      </div>
      {children}
      <div style={{ position: "absolute", left: PAD, right: PAD, bottom: 190 }}>
        {source ? (
          <Text size={26} color={C.muted} style={{ marginBottom: 22 }}>
            {source}
          </Text>
        ) : null}
        <div style={{ height: 8, borderRadius: 8, background: C.line, overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${(frame / (durationInFrames - 1)) * 100}%`,
              background: C.red,
              borderRadius: 8,
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Final call to action, the same in every lesson
export const Outro: React.FC<{ dur: number; line: string }> = ({ dur, line }) => (
  <Scene dur={dur}>
    <Headline text={line} size={100} />
    <Rise delay={20} style={{ marginTop: 60 }}>
      <Card style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <Text size={36}>Вебинары и консультации</Text>
          <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 76, color: C.ink }}>fintrust.dev</div>
        </div>
        <div
          style={{
            width: 110,
            height: 110,
            borderRadius: 110,
            background: C.red,
            color: C.white,
            fontSize: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: F.display,
            fontWeight: 800,
          }}
        >
          →
        </div>
      </Card>
    </Rise>
    <Rise delay={34} style={{ marginTop: 40 }}>
      <Text size={40}>Сохраните, чтобы не потерять</Text>
    </Rise>
  </Scene>
);
