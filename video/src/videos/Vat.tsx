import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { C, Card, Count, Equation, F, Frame, Headline, Mark, Outro, Rise, Scene, Tag, Text, fmt } from "../ui";
import { Step, Timeline, total } from "../timeline";

const Formula: React.FC<{ n: number; title: string; children: React.ReactNode }> = ({ n, title, children }) => (
  <>
    <Rise>
      <Tag>Формула {n}</Tag>
    </Rise>
    <div style={{ height: 34 }} />
    <Headline text={title} size={96} delay={4} />
    <div style={{ height: 50 }} />
    {children}
  </>
);

// A labelled bar that grows to its share of the largest value
const Bar: React.FC<{ label: string; base: number; vat: number; max: number; color: string; delay: number }> = ({
  label,
  base,
  vat,
  max,
  color,
  delay,
}) => {
  const frame = useCurrentFrame();
  const w = interpolate(frame - delay, [0, 26], [0, vat / max], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  return (
    <Rise delay={delay} y={20} style={{ marginBottom: 34 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
        <Text size={34} color={C.ink} weight={600}>
          {label} {fmt(base)}
        </Text>
        <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 48, color }}>
          <Count to={vat} delay={delay} len={26} />
        </div>
      </div>
      <div style={{ height: 30, background: C.paper, borderRadius: 30 }}>
        <div style={{ height: "100%", width: `${w * 100}%`, background: color, borderRadius: 30 }} />
      </div>
    </Rise>
  );
};

const steps: Step[] = [
  [
    100,
    (d) => (
      <Scene dur={d}>
        <Rise>
          <Tag>Урок 5 · НДС</Tag>
        </Rise>
        <div style={{ height: 50 }} />
        <Headline text="НДС 12%: три формулы" size={136} delay={6} accent={["12%:"]} />
        <Rise delay={34} style={{ marginTop: 50 }}>
          <Text size={48}>Считаем на примерах — шаг за шагом</Text>
        </Rise>
      </Scene>
    ),
  ],
  [
    260,
    (d) => (
      <Scene dur={d}>
        <Formula n={1} title="Начислить НДС сверху">
          <Rise delay={20}>
            <Card>
              <Equation parts={["НДС", "=", "Цена", "×", "**12%**"]} delay={26} />
            </Card>
          </Rise>
          <Rise delay={80} style={{ marginTop: 40 }}>
            <Text size={34} style={{ marginBottom: 20 }}>
              Пример: товар без НДС за 100 000 сом
            </Text>
            <Equation parts={["100 000", "×", "12%", "=", "**12 000**"]} delay={90} size={68} />
          </Rise>
          <Rise delay={150} style={{ marginTop: 50 }}>
            <Text size={46} color={C.ink} weight={600}>
              Цена с НДС: <Count to={112000} delay={150} /> сом
            </Text>
          </Rise>
        </Formula>
      </Scene>
    ),
  ],
  [
    320,
    (d) => (
      <Scene dur={d}>
        <Formula n={2} title="Выделить НДС из суммы">
          <Rise delay={20}>
            <Card>
              <Equation parts={["НДС", "=", "Сумма", "×", "**12**", "÷", "**112**"]} delay={26} size={64} />
            </Card>
          </Rise>
          <Rise delay={96} style={{ marginTop: 40 }}>
            <Text size={34} style={{ marginBottom: 20 }}>
              В цене 112 000 сом уже есть НДС
            </Text>
            <Equation parts={["112 000", "×", "12", "÷", "112", "=", "**12 000**"]} delay={104} size={54} step={6} />
          </Rise>
          <Rise delay={190} style={{ marginTop: 50 }}>
            <Card style={{ background: C.redSoft, boxShadow: "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
                <Mark ok={false} />
                <div>
                  <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 52, color: C.red }}>
                    112 000 × 12% = 13 440
                  </div>
                  <Text size={34} color={C.ink}>
                    Частая ошибка: так НДС завышен на 1 440 сом
                  </Text>
                </div>
              </div>
            </Card>
          </Rise>
        </Formula>
      </Scene>
    ),
  ],
  [
    360,
    (d) => (
      <Scene dur={d}>
        <Formula n={3} title="НДС к уплате">
          <Rise delay={20}>
            <Card>
              <Equation parts={["К уплате", "=", "Начислено", "−", "К зачёту"]} delay={26} size={50} />
            </Card>
          </Rise>
          <Rise delay={80} style={{ marginTop: 50 }}>
            <Card>
              <Bar label="Продажи" base={560000} vat={60000} max={60000} color={C.red} delay={90} />
              <Bar label="Покупки" base={336000} vat={36000} max={60000} color={C.green} delay={130} />
              <Rise delay={180} y={20}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    borderTop: `3px solid ${C.line}`,
                    paddingTop: 26,
                  }}
                >
                  <Text size={38} color={C.ink} weight={700}>
                    К уплате
                  </Text>
                  <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 70, color: C.ink }}>
                    <Count to={24000} delay={186} /> сом
                  </div>
                </div>
              </Rise>
            </Card>
          </Rise>
          <Rise delay={230} style={{ marginTop: 40 }}>
            <Text size={36}>
              Суммы с НДС: 560 000 × 12 ÷ 112 = 60 000; 336 000 × 12 ÷ 112 = 36 000. Зачёт — только по
              счёту-фактуре от поставщика, плательщика НДС.
            </Text>
          </Rise>
        </Formula>
      </Scene>
    ),
  ],
  [
    220,
    (d) => (
      <Scene dur={d}>
        <Headline text="Шпаргалка" size={110} />
        <div style={{ height: 50 }} />
        {[
          ["Сверху", "Цена × 12%"],
          ["Из суммы", "Сумма × 12 ÷ 112"],
          ["К уплате", "Начислено − Зачёт"],
        ].map(([k, v], i) => (
          <Rise key={k} delay={20 + i * 22} y={30} style={{ marginBottom: 28 }}>
            <Card style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "36px 46px" }}>
              <Text size={36}>{k}</Text>
              <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 50, color: C.ink }}>{v}</div>
            </Card>
          </Rise>
        ))}
      </Scene>
    ),
  ],
  [130, (d) => <Outro dur={d} line="Посчитаем НДС вашего бизнеса" />],
];

export const vatLength = total(steps);

export const Vat: React.FC = () => (
  <Frame lesson="Урок 5 из 13" source="Ставка НДС 12% — НК КР. Примеры без налога с продаж.">
    <Timeline steps={steps} />
  </Frame>
);
