import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring} from 'remotion';
import {SANS, MONO, zaladujCzcionki} from './czcionki';

zaladujCzcionki();

/**
 * ANIMOWANE ILUSTRACJE.
 *
 * DLACZEGO TEN PLIK POWSTAL (08.09.2026, po zarzucie "to sa ramki z napisem,
 * takie cos zrobi kazdy w Canvie"):
 *
 * Wszystkie efekty typu "tekst w ramce" wylecialy z automatu. Zostaja rzeczy,
 * ktore RYSUJA to, o czym mowi mowiacy, i robia to w ruchu przez caly swoj czas:
 * linia wykresu, ktora sie rysuje i zalamuje, kartki kalendarza odrywajace sie
 * jedna po drugiej, wskazowki zegara pedzace przez tarcze, sciezki montazu
 * ukladajace sie na osi czasu, ikony orbitujace wokol srodka, fala zasiegow.
 *
 * Zasady, ktorych trzyma sie kazda z nich:
 *   - animuje sie OD PIERWSZEJ DO OSTATNIEJ KLATKI, nigdy nie stoi,
 *   - ma jeden czytelny przekaz, ktory widac bez czytania,
 *   - tekst jest podpisem rysunku, a nie trescia efektu,
 *   - da sie ja opisac zdaniem "widac, jak cos sie dzieje".
 */

const ORANGE = '#FF4D2D';
const AMBER = '#FFB13D';
const GREEN = '#4ED47A';
const RED = '#F0453B';
const INK = '#070B11';
const KREM = '#F4F1EA';

/** Postep 0..1 przez caly czas trwania, z lagodnym startem. */
function bieg(frame: number, fps: number, durationInFrames: number, opoznienie = 0.3) {
  return interpolate(frame, [fps * opoznienie, durationInFrames - fps * 0.4], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

const TloCiemne: React.FC<{glow?: string}> = ({glow = ORANGE}) => {
  const frame = useCurrentFrame();
  const d = Math.sin(frame / 40) * 60;
  return (
    <>
      <AbsoluteFill style={{background: `linear-gradient(160deg, #12253c, ${INK})`}} />
      <AbsoluteFill
        style={{
          backgroundImage:
            'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)',
          backgroundSize: '92px 92px',
          opacity: 0.06,
        }}
      />
      <AbsoluteFill
        style={{background: `radial-gradient(900px 900px at ${280 + d}px ${1380 - d}px, ${glow}33 0%, transparent 70%)`}}
      />
      <AbsoluteFill
        style={{background: 'radial-gradient(circle at 50% 42%, transparent 44%, rgba(0,0,0,0.7) 100%)'}}
      />
    </>
  );
};

const TloJasne: React.FC = () => {
  const frame = useCurrentFrame();
  const d = Math.sin(frame / 40) * 40;
  return (
    <>
      <AbsoluteFill style={{background: `linear-gradient(165deg, #FCFAF7, ${KREM} 58%, #ECE4D8)`}} />
      <AbsoluteFill
        style={{background: `radial-gradient(760px 760px at ${800 - d}px ${1500 + d}px, ${ORANGE}22 0%, transparent 70%)`}}
      />
    </>
  );
};

/** Podpis rysunku: maly, kursywa, nad grafika. */
const Podpis: React.FC<{tekst?: string; jasne: boolean; post: number}> = ({tekst, jasne, post}) =>
  tekst ? (
    <div
      style={{
        fontFamily: SANS,
        fontStyle: 'italic',
        fontSize: 34,
        fontWeight: 600,
        color: jasne ? 'rgba(40,40,40,0.6)' : 'rgba(255,255,255,0.72)',
        opacity: post,
        transform: `translateY(${interpolate(post, [0, 1], [-16, 0])}px)`,
        marginBottom: 30,
        textAlign: 'center',
      }}
    >
      {tekst}
    </div>
  ) : null;

/** Wielki podpis pod rysunkiem: to, co widz ma zapamietac. */
const Puenta: React.FC<{tekst?: string; jasne: boolean; wejscie: number}> = ({tekst, jasne, wejscie}) =>
  tekst ? (
    <div
      style={{
        marginTop: 34,
        fontFamily: SANS,
        fontSize: 60,
        fontWeight: 900,
        letterSpacing: -1,
        color: jasne ? '#22201D' : '#fff',
        textAlign: 'center',
        opacity: wejscie,
        transform: `translateY(${interpolate(wejscie, [0, 1], [26, 0])}px)`,
        textShadow: jasne ? 'none' : '0 10px 30px rgba(0,0,0,0.6)',
      }}
    >
      {tekst}
    </div>
  ) : null;

const Kadr: React.FC<{jasne: boolean; children: React.ReactNode}> = ({jasne, children}) => (
  <>
    {jasne ? <TloJasne /> : <TloCiemne />}
    <AbsoluteFill
      style={{justifyContent: 'center', alignItems: 'center', padding: 60, paddingBottom: 520}}
    >
      {children}
    </AbsoluteFill>
  </>
);

/* ============================================================
   1. anim-wykres: linia rysuje sie i zalamuje w dol
   ============================================================ */
export const AnimWykres: React.FC<{
  podpis?: string;
  puenta?: string;
  wDol?: boolean;
  jasne?: boolean;
}> = ({podpis = 'i nagle', puenta = '', wDol = true, jasne = false}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const p = bieg(frame, fps, durationInFrames);
  const post = spring({frame, fps, config: {damping: 200}});
  const wyj = interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const W = 920;
  const H = 500;
  // Punkty: spokojny wzrost, potem gwaltowne zalamanie (albo odwrotnie).
  const punkty = wDol
    ? [[0, 350], [153, 290], [306, 315], [459, 215], [612, 245], [765, 445], [920, 470]]
    : [[0, 450], [153, 415], [306, 350], [459, 290], [612, 205], [765, 105], [920, 40]];
  const sciezka = punkty.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ');
  // Dlugosc linii lamanej, zeby strokeDasharray rysowal ja rowno.
  const dlugosc = punkty.reduce((suma, p2, i) => {
    if (i === 0) return 0;
    const p1 = punkty[i - 1];
    return suma + Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
  }, 0);

  // Kropka jedzie po linii razem z rysowaniem.
  const idx = Math.min(punkty.length - 1, Math.floor(p * (punkty.length - 1)));
  const nast = punkty[Math.min(punkty.length - 1, idx + 1)];
  const ulamek = p * (punkty.length - 1) - idx;
  const kx = punkty[idx][0] + (nast[0] - punkty[idx][0]) * ulamek;
  const ky = punkty[idx][1] + (nast[1] - punkty[idx][1]) * ulamek;

  const kolor = wDol ? RED : GREEN;

  return (
    <AbsoluteFill style={{opacity: wyj}}>
      <Kadr jasne={jasne}>
        <Podpis tekst={podpis} jasne={jasne} post={post} />
        <svg width={W} height={H + 40} style={{overflow: 'visible'}}>
          {/* siatka */}
          {[0, 1, 2, 3].map((i) => (
            <line
              key={i}
              x1={0}
              y1={(H / 3) * i}
              x2={W}
              y2={(H / 3) * i}
              stroke={jasne ? 'rgba(40,40,40,0.10)' : 'rgba(255,255,255,0.10)'}
              strokeWidth={2}
            />
          ))}
          {/* wypelnienie pod linia */}
          <path
            d={`${sciezka} L ${W} ${H} L 0 ${H} Z`}
            fill={`${kolor}22`}
            opacity={interpolate(p, [0, 0.3], [0, 1], {extrapolateRight: 'clamp'})}
          />
          {/* sama linia, rysowana od lewej */}
          <path
            d={sciezka}
            fill="none"
            stroke={kolor}
            strokeWidth={10}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={dlugosc}
            strokeDashoffset={dlugosc * (1 - p)}
            style={{filter: `drop-shadow(0 0 16px ${kolor}88)`}}
          />
          {/* kropka na czole linii */}
          <circle cx={kx} cy={ky} r={16} fill="#fff" stroke={kolor} strokeWidth={7} />
        </svg>
        <Puenta
          tekst={puenta}
          jasne={jasne}
          wejscie={spring({frame: frame - Math.round(fps * 1.5), fps, config: {damping: 13}})}
        />
      </Kadr>
    </AbsoluteFill>
  );
};

/* ============================================================
   2. anim-kalendarz: kartki odrywaja sie jedna po drugiej
   ============================================================ */
export const AnimKalendarz: React.FC<{podpis?: string; puenta?: string; jasne?: boolean}> = ({
  podpis = 'mijają miesiące',
  puenta = '',
  jasne = false,
}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const post = spring({frame, fps, config: {damping: 200}});
  const wyj = interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const ILE = 6;
  const p = bieg(frame, fps, durationInFrames, 0.25);

  return (
    <AbsoluteFill style={{opacity: wyj}}>
      <Kadr jasne={jasne}>
        <Podpis tekst={podpis} jasne={jasne} post={post} />
        <div style={{position: 'relative', width: 520, height: 570}}>
          {Array.from({length: ILE}).map((_, i) => {
            const kolejnosc = ILE - 1 - i; // od gory odrywa sie ostatnia
            const kiedy = (kolejnosc + 1) / ILE;
            const odrywa = interpolate(p, [kiedy - 1 / ILE, kiedy], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: 26,
                  background: '#fff',
                  boxShadow: '0 20px 50px rgba(0,0,0,0.35)',
                  transformOrigin: 'top center',
                  transform: `translateY(${i * -4}px) rotate(${odrywa * (i % 2 ? 26 : -26)}deg) translateY(${odrywa * 700}px)`,
                  opacity: 1 - odrywa,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div
                  style={{
                    height: 92,
                    background: `linear-gradient(140deg, ${AMBER}, ${ORANGE})`,
                    borderTopLeftRadius: 26,
                    borderTopRightRadius: 26,
                  }}
                />
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: SANS,
                    fontSize: 190,
                    fontWeight: 900,
                    color: '#1A1A1A',
                  }}
                >
                  {ILE - i}
                </div>
              </div>
            );
          })}
        </div>
        <Puenta
          tekst={puenta}
          jasne={jasne}
          wejscie={spring({frame: frame - Math.round(fps * 1.6), fps, config: {damping: 13}})}
        />
      </Kadr>
    </AbsoluteFill>
  );
};

/* ============================================================
   3. anim-zegar: wskazowki pedza przez tarcze
   ============================================================ */
export const AnimZegar: React.FC<{podpis?: string; puenta?: string; jasne?: boolean}> = ({
  podpis = 'a czas leci',
  puenta = '',
  jasne = false,
}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const post = spring({frame, fps, config: {damping: 200}});
  const wyj = interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const p = bieg(frame, fps, durationInFrames, 0.2);
  const R = 230;

  return (
    <AbsoluteFill style={{opacity: wyj}}>
      <Kadr jasne={jasne}>
        <Podpis tekst={podpis} jasne={jasne} post={post} />
        <div style={{position: 'relative', width: R * 2 + 40, height: R * 2 + 40}}>
          <svg width={R * 2 + 40} height={R * 2 + 40}>
            <circle
              cx={R + 20}
              cy={R + 20}
              r={R}
              fill={jasne ? '#fff' : 'rgba(255,255,255,0.06)'}
              stroke={ORANGE}
              strokeWidth={10}
            />
            {/* podzialka godzinowa */}
            {Array.from({length: 12}).map((_, i) => {
              const kat = (i / 12) * Math.PI * 2;
              const x1 = R + 20 + Math.sin(kat) * (R - 26);
              const y1 = R + 20 - Math.cos(kat) * (R - 26);
              const x2 = R + 20 + Math.sin(kat) * (R - 10);
              const y2 = R + 20 - Math.cos(kat) * (R - 10);
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={jasne ? 'rgba(40,40,40,0.35)' : 'rgba(255,255,255,0.4)'}
                  strokeWidth={5}
                  strokeLinecap="round"
                />
              );
            })}
            {/* slad przebytego czasu */}
            <circle
              cx={R + 20}
              cy={R + 20}
              r={R - 40}
              fill="none"
              stroke={`${ORANGE}55`}
              strokeWidth={16}
              strokeDasharray={2 * Math.PI * (R - 40)}
              strokeDashoffset={2 * Math.PI * (R - 40) * (1 - p)}
              transform={`rotate(-90 ${R + 20} ${R + 20})`}
            />
            {/* wskazowka minutowa: pedzi */}
            <line
              x1={R + 20}
              y1={R + 20}
              x2={R + 20 + Math.sin(p * Math.PI * 8) * (R - 50)}
              y2={R + 20 - Math.cos(p * Math.PI * 8) * (R - 50)}
              stroke={jasne ? '#22201D' : '#fff'}
              strokeWidth={9}
              strokeLinecap="round"
            />
            {/* wskazowka godzinowa: wolniej */}
            <line
              x1={R + 20}
              y1={R + 20}
              x2={R + 20 + Math.sin(p * Math.PI * 1.4) * (R - 105)}
              y2={R + 20 - Math.cos(p * Math.PI * 1.4) * (R - 105)}
              stroke={ORANGE}
              strokeWidth={14}
              strokeLinecap="round"
            />
            <circle cx={R + 20} cy={R + 20} r={14} fill={ORANGE} />
          </svg>
        </div>
        <Puenta
          tekst={puenta}
          jasne={jasne}
          wejscie={spring({frame: frame - Math.round(fps * 1.5), fps, config: {damping: 13}})}
        />
      </Kadr>
    </AbsoluteFill>
  );
};

/* ============================================================
   4. anim-timeline: sciezki montazu ukladaja sie na osi czasu
   ============================================================ */
export const AnimTimeline: React.FC<{podpis?: string; puenta?: string; etykieta?: string}> = ({
  podpis = 'tak to wygląda w środku',
  puenta = '',
  etykieta = 'MONTAŻ',
}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const post = spring({frame, fps, config: {damping: 200}});
  const wyj = interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const p = bieg(frame, fps, durationInFrames, 0.2);

  const sciezki = [
    [{x: 0, w: 120, c: ORANGE}, {x: 150, w: 90, c: AMBER}, {x: 270, w: 160, c: ORANGE}, {x: 460, w: 110, c: AMBER}],
    [{x: 40, w: 100, c: '#5AB0FF'}, {x: 180, w: 140, c: '#5AB0FF'}, {x: 360, w: 90, c: '#7C5CFF'}],
    [{x: 20, w: 180, c: GREEN}, {x: 230, w: 120, c: GREEN}, {x: 390, w: 170, c: GREEN}],
  ];
  const W = 820;

  return (
    <AbsoluteFill style={{opacity: wyj}}>
      <Kadr jasne={false}>
        <Podpis tekst={podpis} jasne={false} post={post} />
        <div
          style={{
            width: W + 60,
            background: 'rgba(8,11,16,0.96)',
            border: '2px solid rgba(255,255,255,0.16)',
            borderRadius: 20,
            padding: 26,
            boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
            transform: `scale(${interpolate(post, [0, 1], [0.92, 1])})`,
          }}
        >
          <div
            style={{
              fontFamily: MONO,
              fontSize: 20,
              fontWeight: 700,
              color: ORANGE,
              letterSpacing: 3,
              marginBottom: 16,
            }}
          >
            {etykieta}
          </div>
          <div style={{position: 'relative'}}>
            {sciezki.map((sciezka, si) => (
              <div
                key={si}
                style={{
                  position: 'relative',
                  height: 46,
                  marginBottom: 12,
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: 8,
                }}
              >
                {sciezka.map((k, ki) => {
                  const kiedy = (si * 4 + ki) / 12;
                  const w = spring({
                    frame: frame - Math.round(fps * (0.25 + kiedy * 1.6)),
                    fps,
                    config: {damping: 14, mass: 0.6},
                  });
                  return (
                    <div
                      key={ki}
                      style={{
                        position: 'absolute',
                        left: k.x,
                        top: 6,
                        width: k.w * w,
                        height: 34,
                        borderRadius: 6,
                        background: k.c,
                        opacity: 0.9,
                        boxShadow: `0 4px 14px ${k.c}66`,
                      }}
                    />
                  );
                })}
              </div>
            ))}
            {/* glowica odtwarzania jedzie przez cala os */}
            <div
              style={{
                position: 'absolute',
                top: -6,
                left: p * W,
                width: 3,
                height: 3 * 58 + 12,
                background: '#fff',
                boxShadow: '0 0 12px rgba(255,255,255,0.9)',
              }}
            />
          </div>
        </div>
        <Puenta
          tekst={puenta}
          jasne={false}
          wejscie={spring({frame: frame - Math.round(fps * 1.7), fps, config: {damping: 13}})}
        />
      </Kadr>
    </AbsoluteFill>
  );
};

/* ============================================================
   5. anim-orbita: ikony kraza wokol srodka i wlatuja do niego
   ============================================================ */
export const AnimOrbita: React.FC<{
  podpis?: string;
  srodek?: string;
  ikony?: string[];
  puenta?: string;
  jasne?: boolean;
}> = ({
  podpis = 'wszystko naraz',
  srodek = '🤯',
  ikony = ['🎬', '✂️', '🎵', '📝', '🎨', '📤'],
  puenta = '',
  jasne = false,
}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const post = spring({frame, fps, config: {damping: 200}});
  const wyj = interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const p = bieg(frame, fps, durationInFrames, 0.2);
  const R = 250;

  return (
    <AbsoluteFill style={{opacity: wyj}}>
      <Kadr jasne={jasne}>
        <Podpis tekst={podpis} jasne={jasne} post={post} />
        <div style={{position: 'relative', width: R * 2 + 140, height: R * 2 + 140}}>
          {/* pierscien orbity */}
          <svg
            width={R * 2 + 140}
            height={R * 2 + 140}
            style={{position: 'absolute', inset: 0, opacity: 0.35}}
          >
            <circle
              cx={R + 70}
              cy={R + 70}
              r={R}
              fill="none"
              stroke={jasne ? 'rgba(40,40,40,0.25)' : 'rgba(255,255,255,0.3)'}
              strokeWidth={2}
              strokeDasharray="8 12"
            />
          </svg>
          {/* srodek */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: `translate(-50%,-50%) scale(${interpolate(post, [0, 1], [0.6, 1])})`,
              width: 150,
              height: 150,
              borderRadius: '50%',
              background: `linear-gradient(140deg, ${AMBER}, ${ORANGE})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 74,
              boxShadow: `0 0 60px ${ORANGE}88`,
            }}
          >
            {srodek}
          </div>
          {/* ikony na orbicie, ktore stopniowo sciagaja do srodka */}
          {ikony.slice(0, 6).map((ik, i) => {
            const kat = (i / Math.min(6, ikony.length)) * Math.PI * 2 + p * 1.5;
            const promien = R * (1 - p * 0.55);
            const x = Math.cos(kat) * promien;
            const y = Math.sin(kat) * promien;
            const w = spring({frame: frame - Math.round(fps * (0.2 + i * 0.09)), fps, config: {damping: 13}});
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  transform: `translate(-50%,-50%) translate(${x}px, ${y}px) scale(${w * (1 - p * 0.25)})`,
                  width: 92,
                  height: 92,
                  borderRadius: 22,
                  background: jasne ? '#fff' : 'rgba(255,255,255,0.1)',
                  border: jasne ? '2px solid rgba(40,40,40,0.08)' : '2px solid rgba(255,255,255,0.18)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 46,
                  boxShadow: jasne ? '0 12px 30px rgba(120,90,60,0.2)' : '0 12px 30px rgba(0,0,0,0.5)',
                }}
              >
                {ik}
              </div>
            );
          })}
        </div>
        <Puenta
          tekst={puenta}
          jasne={jasne}
          wejscie={spring({frame: frame - Math.round(fps * 1.7), fps, config: {damping: 13}})}
        />
      </Kadr>
    </AbsoluteFill>
  );
};

/* ============================================================
   6. anim-fala: slupki fali rosna i pulsuja, jak zasieg
   ============================================================ */
export const AnimFala: React.FC<{podpis?: string; puenta?: string; jasne?: boolean}> = ({
  podpis = 'i wtedy zaczyna się dziać',
  puenta = '',
  jasne = false,
}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const post = spring({frame, fps, config: {damping: 200}});
  const wyj = interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const p = bieg(frame, fps, durationInFrames, 0.15);
  const ILE = 26;

  return (
    <AbsoluteFill style={{opacity: wyj}}>
      <Kadr jasne={jasne}>
        <Podpis tekst={podpis} jasne={jasne} post={post} />
        <div style={{display: 'flex', alignItems: 'center', gap: 10, height: 460}}>
          {Array.from({length: ILE}).map((_, i) => {
            const faza = i / ILE;
            // Fala biegnie przez slupki i rosnie w miare postepu.
            const amplituda = 0.25 + 0.75 * Math.min(1, p * 1.6);
            const h =
              (0.2 + 0.8 * Math.abs(Math.sin(faza * Math.PI * 2 + frame / 7))) *
              amplituda *
              (0.5 + faza * 0.9) *
              420;
            const wejscie = spring({
              frame: frame - Math.round(fps * (0.15 + faza * 0.7)),
              fps,
              config: {damping: 14},
            });
            return (
              <div
                key={i}
                style={{
                  width: 26,
                  height: Math.max(16, h) * wejscie,
                  borderRadius: 11,
                  background: `linear-gradient(180deg, ${AMBER}, ${ORANGE})`,
                  opacity: 0.55 + faza * 0.45,
                  boxShadow: `0 0 18px ${ORANGE}44`,
                }}
              />
            );
          })}
        </div>
        <Puenta
          tekst={puenta}
          jasne={jasne}
          wejscie={spring({frame: frame - Math.round(fps * 1.6), fps, config: {damping: 13}})}
        />
      </Kadr>
    </AbsoluteFill>
  );
};
