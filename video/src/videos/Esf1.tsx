import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { C, Card, Equation, F, Frame, Headline, Outro, Rise, Row, Scene, Tag, Text, useIn } from "../ui";
import { Step, Timeline, total } from "../timeline";

// Seller → ЭСФ → buyer, boxes appear in turn and the arrows draw between them
const Flow: React.FC<{ delay: number }> = ({ delay }) => {
  const frame = useCurrentFrame();
  const box = (label: string, sub: string, i: number, hot = false) => (
    <Rise delay={delay + i * 22} y={30} style={{ flex: 1 }}>
      <div
        style={{
          background: hot ? C.red : C.white,
          color: hot ? C.white : C.ink,
          borderRadius: 32,
          padding: "34px 10px",
          textAlign: "center",
          boxShadow: "0 20px 50px rgba(0,0,0,0.07)",
        }}
      >
        <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 46 }}>{label}</div>
        <div style={{ fontFamily: F.body, fontSize: 28, marginTop: 6, opacity: 0.75 }}>{sub}</div>
      </div>
    </Rise>
  );
  const arrow = (i: number) => {
    const w = interpolate(frame - delay - i * 22 - 12, [0, 12], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return (
      <div style={{ width: 60, display: "flex", alignItems: "center" }}>
        <div style={{ height: 6, width: `${w * 100}%`, background: C.red, borderRadius: 6 }} />
      </div>
    );
  };
  return (
    <div style={{ display: "flex", alignItems: "center", marginTop: 70 }}>
      {box("Продавец", "оформляет", 0)}
      {arrow(0)}
      {box("ЭСФ", "в системе ГНС", 1, true)}
      {arrow(1)}
      {box("Покупатель", "принимает", 2)}
    </div>
  );
};

// A week after the delivery: days 1–5 fill up one by one
const Week: React.FC<{ delay: number }> = ({ delay }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: "flex", gap: 14, marginTop: 70 }}>
      {Array.from({ length: 7 }, (_, d) => {
        const on = d >= 1 && d <= 5 && frame > delay + d * 10;
        const first = d === 0;
        return (
          <Rise key={d} delay={delay + d * 3} y={20} style={{ flex: 1 }}>
            <div
              style={{
                height: 170,
                borderRadius: 26,
                background: first ? C.ink : on ? C.red : C.white,
                color: first || on ? C.white : C.muted,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: F.display,
                fontWeight: 800,
                fontSize: 54,
                transition: "none",
              }}
            >
              {first ? "0" : d}
              <div style={{ fontFamily: F.body, fontWeight: 600, fontSize: 20, marginTop: 4 }}>
                {first ? "поставка" : "день"}
              </div>
            </div>
          </Rise>
        );
      })}
    </div>
  );
};

const Pulse: React.FC<{ children: React.ReactNode; delay: number }> = ({ children, delay }) => {
  const p = useIn(delay, 10);
  return <div style={{ transform: `scale(${0.85 + p * 0.15})`, opacity: p }}>{children}</div>;
};

const steps: Step[] = [
  [
    100,
    (d) => (
      <Scene dur={d}>
        <Rise>
          <Tag>Урок 1 · ЭСФ</Tag>
        </Rise>
        <div style={{ height: 50 }} />
        <Headline text="ЭСФ: нужно ли это вам?" size={130} delay={6} accent={["ЭСФ:"]} />
        <Rise delay={30} style={{ marginTop: 50 }}>
          <Text size={50}>Разбираем за минуту</Text>
        </Rise>
      </Scene>
    ),
  ],
  [
    240,
    (d) => (
      <Scene dur={d}>
        <Headline text="Что такое ЭСФ" size={100} />
        <Rise delay={16} style={{ marginTop: 40 }}>
          <Text size={46}>
            Электронный счёт-фактура — документ о продаже. Продавец оформляет его онлайн в системе налоговой
            службы.
          </Text>
        </Rise>
        <Flow delay={50} />
        <Rise delay={130} style={{ marginTop: 60 }}>
          <Text size={42} color={C.ink} weight={600}>
            Покупатель подтверждает ЭСФ — и сделка видна ГНС.
          </Text>
        </Rise>
      </Scene>
    ),
  ],
  [
    190,
    (d) => (
      <Scene dur={d}>
        <Rise>
          <Tag>С 1 мая 2023</Tag>
        </Rise>
        <div style={{ height: 44 }} />
        <Headline text="ЭСФ выписывают почти все" size={112} delay={6} accent={["почти", "все"]} />
        <Rise delay={40} style={{ marginTop: 50 }}>
          <Text size={46}>
            Все налогоплательщики, кроме тех, кого освободили. Требование ввёл Кабмин постановлением от
            6 апреля 2023 года.
          </Text>
        </Rise>
      </Scene>
    ),
  ],
  [
    330,
    (d) => (
      <Scene dur={d}>
        <Headline text="Кто освобождён" size={100} />
        <div style={{ height: 60 }} />
        {[
          "Упрощёнка 0% и доход до 15 млн сом в год",
          "Патент на услуги населению",
          "Торговый патент",
          "Фермеры со своей продукцией",
          "Единый налог — только с физлицами",
          "Единый налог по ставке 0,5%",
        ].map((t, i) => (
          <Row key={t} delay={24 + i * 24}>
            {t}
          </Row>
        ))}
      </Scene>
    ),
  ],
  [
    230,
    (d) => (
      <Scene dur={d}>
        <Headline text="Срок — 5 дней" size={120} accent={["5"]} />
        <Rise delay={14} style={{ marginTop: 30 }}>
          <Text size={46}>после поставки товара или услуги</Text>
        </Rise>
        <Week delay={34} />
        <Rise delay={120} style={{ marginTop: 60 }}>
          <Card>
            <Text size={38} color={C.ink}>
              Продаёте населению? Можно один <b>единый ЭСФ</b> за месяц — до 10-го рабочего дня следующего месяца.
            </Text>
          </Card>
        </Rise>
      </Scene>
    ),
  ],
  [
    250,
    (d) => (
      <Scene dur={d}>
        <Headline text="Штраф — 5%" size={130} accent={["5%"]} />
        <Rise delay={14} style={{ marginTop: 30 }}>
          <Text size={46}>если купили товар без документов и не внесли его в систему ЭСФ</Text>
        </Rise>
        <Rise delay={50} style={{ marginTop: 70 }}>
          <Card>
            <Text size={34} style={{ marginBottom: 24 }}>
              Пример: закупка на 1 млн сом
            </Text>
            <Equation parts={["1 000 000", "×", "5%", "=", "**50 000 сом**"]} delay={60} size={72} />
          </Card>
        </Rise>
        <Pulse delay={140}>
          <Text size={42} color={C.ink} weight={600} style={{ marginTop: 50 }}>
            Купили у того, кто не выписывает ЭСФ? Внесите покупку в систему сами.
          </Text>
        </Pulse>
      </Scene>
    ),
  ],
  [130, (d) => <Outro dur={d} line="Разберём вашу ситуацию на консультации" />],
];

export const esf1Length = total(steps);

export const Esf1: React.FC = () => (
  <Frame lesson="Урок 1 из 13" source="Источники: ГНС КР (2023, 2025). Сверяйте с действующим НК КР.">
    <Timeline steps={steps} />
  </Frame>
);
