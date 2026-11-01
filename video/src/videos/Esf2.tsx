import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { C, F, Frame, Headline, Mark, Outro, Rise, Scene, Tag, Text, fmt, useIn } from "../ui";
import { Step, Timeline, total } from "../timeline";

// Text typed in letter by letter
const Typed: React.FC<{ text: string; delay: number; speed?: number }> = ({ text, delay, speed = 1.5 }) => {
  const frame = useCurrentFrame();
  const n = Math.max(0, Math.min(text.length, Math.floor((frame - delay) / speed)));
  const caret = n < text.length && Math.floor(frame / 8) % 2 === 0;
  return (
    <span>
      {text.slice(0, n)}
      <span style={{ opacity: caret ? 1 : 0, color: C.red }}>|</span>
    </span>
  );
};

// A simplified portal window. Not the real interface: only what matters for the step
const Window: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Rise delay={10} y={60}>
    <div
      style={{
        background: C.white,
        borderRadius: 40,
        overflow: "hidden",
        boxShadow: "0 40px 100px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.04)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "24px 32px",
          borderBottom: `2px solid ${C.line}`,
        }}
      >
        {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
          <div key={c} style={{ width: 20, height: 20, borderRadius: 20, background: c }} />
        ))}
        <div
          style={{
            marginLeft: 20,
            flex: 1,
            background: C.paper,
            borderRadius: 14,
            padding: "10px 20px",
            fontFamily: F.body,
            fontSize: 26,
            color: C.slate,
          }}
        >
          esf.salyk.kg
        </div>
      </div>
      <div style={{ padding: "44px 44px 50px", minHeight: 560 }}>{children}</div>
    </div>
  </Rise>
);

const Btn: React.FC<{ children: React.ReactNode; on?: boolean; delay: number }> = ({ children, on, delay }) => {
  const p = useIn(delay, 12);
  return (
    <div
      style={{
        opacity: p,
        transform: `scale(${0.9 + p * 0.1})`,
        fontFamily: F.body,
        fontWeight: 600,
        fontSize: 38,
        padding: "28px 34px",
        borderRadius: 24,
        marginBottom: 20,
        background: on ? C.red : C.paper,
        color: on ? C.white : C.ink,
      }}
    >
      {children}
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ marginBottom: 28 }}>
    <Text size={28} style={{ marginBottom: 10 }}>
      {label}
    </Text>
    <div
      style={{
        border: `3px solid ${C.line}`,
        borderRadius: 20,
        padding: "22px 26px",
        fontFamily: F.body,
        fontWeight: 600,
        fontSize: 40,
        color: C.ink,
        minHeight: 52,
      }}
    >
      {children}
    </div>
  </div>
);

// "Шаг 2 из 6" with a row of dots
const StepHead: React.FC<{ n: number; title: string }> = ({ n, title }) => (
  <div style={{ marginBottom: 50 }}>
    <Rise>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <Tag>
          Шаг {n} из 6
        </Tag>
        <div style={{ display: "flex", gap: 10 }}>
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              style={{ width: 18, height: 18, borderRadius: 18, background: i < n ? C.red : C.line }}
            />
          ))}
        </div>
      </div>
    </Rise>
    <div style={{ height: 30 }} />
    <Headline text={title} size={88} delay={4} />
  </div>
);

const Status: React.FC<{ label: string; color: string; bg: string; delay: number; ok?: boolean }> = ({
  label,
  color,
  bg,
  delay,
  ok,
}) => (
  <Rise delay={delay} y={30} style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 26 }}>
    {ok === undefined ? (
      <div style={{ width: 64, height: 64, borderRadius: 64, background: bg }} />
    ) : (
      <Mark ok={ok} />
    )}
    <div
      style={{
        fontFamily: F.body,
        fontWeight: 700,
        fontSize: 42,
        color,
        background: bg,
        padding: "16px 30px",
        borderRadius: 999,
      }}
    >
      {label}
    </div>
  </Rise>
);

const items = [
  { name: "Мука 50 кг", qty: 20, price: 1900 },
  { name: "Сахар 50 кг", qty: 10, price: 4200 },
];

const Items: React.FC = () => {
  const frame = useCurrentFrame();
  const sum = items.reduce((a, i) => a + i.qty * i.price, 0);
  const shown = interpolate(frame, [90, 120], [0, sum], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cell: React.CSSProperties = { fontFamily: F.body, fontSize: 32, padding: "18px 0", color: C.ink };
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "2.2fr 0.8fr 1.2fr 1.4fr", borderBottom: `2px solid ${C.line}` }}>
        {["Товар", "Кол-во", "Цена", "Сумма"].map((h) => (
          <div key={h} style={{ ...cell, color: C.muted, fontSize: 26, fontWeight: 600 }}>
            {h}
          </div>
        ))}
      </div>
      {items.map((it, i) => (
        <Rise key={it.name} delay={30 + i * 26} y={20}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2.2fr 0.8fr 1.2fr 1.4fr",
              borderBottom: `2px solid ${C.line}`,
            }}
          >
            <div style={cell}>{it.name}</div>
            <div style={cell}>{it.qty}</div>
            <div style={cell}>{fmt(it.price)}</div>
            <div style={{ ...cell, fontWeight: 700 }}>{fmt(it.qty * it.price)}</div>
          </div>
        </Rise>
      ))}
      <Rise delay={86} y={20}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 30,
            fontFamily: F.display,
            fontWeight: 800,
            fontSize: 50,
            color: C.ink,
          }}
        >
          <span>Итого</span>
          <span style={{ color: C.red }}>{fmt(shown)} сом</span>
        </div>
      </Rise>
    </div>
  );
};

const Stamp: React.FC<{ delay: number }> = ({ delay }) => {
  const p = useIn(delay, 9);
  return (
    <div
      style={{
        marginTop: 40,
        display: "inline-flex",
        alignItems: "center",
        gap: 20,
        opacity: p,
        transform: `scale(${1.6 - p * 0.6}) rotate(${-6 * p}deg)`,
        border: `5px solid ${C.green}`,
        color: C.green,
        borderRadius: 24,
        padding: "18px 34px",
        fontFamily: F.display,
        fontWeight: 800,
        fontSize: 52,
        textTransform: "uppercase",
      }}
    >
      ✓ Подписано
    </div>
  );
};

const steps: Step[] = [
  [
    100,
    (d) => (
      <Scene dur={d}>
        <Rise>
          <Tag>Урок 2 · ЭСФ</Tag>
        </Rise>
        <div style={{ height: 50 }} />
        <Headline text="Как выписать ЭСФ за 6 шагов" size={124} delay={6} accent={["6"]} />
        <Rise delay={36} style={{ marginTop: 50 }}>
          <Text size={46}>Схема портала упрощена: показываем только суть</Text>
        </Rise>
      </Scene>
    ),
  ],
  [
    170,
    (d) => (
      <Scene dur={d}>
        <StepHead n={1} title="Войдите" />
        <Window>
          <Btn delay={24}>USB-токен с ЭЦП</Btn>
          <Btn delay={32}>ЕСИ-Облако</Btn>
          <Btn delay={40} on>
            Smart-ID KG
          </Btn>
          <Btn delay={48}>ИНН и пароль</Btn>
        </Window>
      </Scene>
    ),
  ],
  [
    150,
    (d) => (
      <Scene dur={d}>
        <StepHead n={2} title="Создайте новый ЭСФ" />
        <Window>
          <Text size={34} style={{ marginBottom: 30 }}>
            Реализация → Счета-фактуры
          </Text>
          <Btn delay={30}>На работы и услуги</Btn>
          <Btn delay={40} on>
            + Новый ЭСФ на товары
          </Btn>
        </Window>
      </Scene>
    ),
  ],
  [
    190,
    (d) => (
      <Scene dur={d}>
        <StepHead n={3} title="Укажите покупателя" />
        <Window>
          <Field label="ИНН покупателя">
            <Typed text="01234567890123" delay={26} speed={2.4} />
          </Field>
          <Rise delay={70} y={20}>
            <Field label="Наименование">
              <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                ОсОО «Пример» <Mark size={52} />
              </span>
            </Field>
          </Rise>
          <Rise delay={86}>
            <Text size={32}>Название подставится из реестра. Сверьте с договором.</Text>
          </Rise>
        </Window>
      </Scene>
    ),
  ],
  [
    200,
    (d) => (
      <Scene dur={d}>
        <StepHead n={4} title="Добавьте товары" />
        <Window>
          <Items />
          <Rise delay={110} style={{ marginTop: 30 }}>
            <Text size={30}>Суммы — в сомах и тыйынах. Маркированные товары — отдельным ЭСФ.</Text>
          </Rise>
        </Window>
      </Scene>
    ),
  ],
  [
    160,
    (d) => (
      <Scene dur={d}>
        <StepHead n={5} title="Подпишите ЭЦП" />
        <Window>
          <Text size={38} color={C.ink}>
            Подписывает руководитель, ИП или бухгалтер по доверенности.
          </Text>
          <Stamp delay={50} />
        </Window>
      </Scene>
    ),
  ],
  [
    220,
    (d) => (
      <Scene dur={d}>
        <StepHead n={6} title="Отправьте покупателю" />
        <Window>
          <Status label="Отправленный" color={C.ink} bg={C.paper} delay={26} />
          <Text size={30} style={{ margin: "0 0 26px 88px" }}>
            покупатель смотрит и решает
          </Text>
          <Status label="Принят" color={C.green} bg={C.greenSoft} delay={70} ok />
          <Status label="или Отклонён" color={C.red} bg={C.redSoft} delay={90} ok={false} />
        </Window>
      </Scene>
    ),
  ],
  [
    210,
    (d) => (
      <Scene dur={d}>
        <Headline text="Ошибка? Не удаляйте" size={110} accent={["Ошибка?"]} />
        <Rise delay={20} style={{ marginTop: 40 }}>
          <Text size={46}>
            Отклонённый ЭСФ остаётся в истории. Узнайте у покупателя причину и выпишите{" "}
            <b style={{ color: C.ink }}>корректировочный ЭСФ</b>: он исправит товары, количество, цену или
            реквизиты.
          </Text>
        </Rise>
        <Rise delay={70} style={{ marginTop: 50 }}>
          <Text size={46}>
            И помните срок: <b style={{ color: C.red }}>не позднее 5 дней</b> после поставки.
          </Text>
        </Rise>
      </Scene>
    ),
  ],
  [130, (d) => <Outro dur={d} line="Покажем на вашем примере" />],
];

export const esf2Length = total(steps);

export const Esf2: React.FC = () => (
  <Frame lesson="Урок 2 из 13" source="Порядок по открытым источникам ГНС КР. Интерфейс упрощён.">
    <Timeline steps={steps} />
  </Frame>
);
