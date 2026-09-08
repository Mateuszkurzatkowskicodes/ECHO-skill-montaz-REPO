import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring} from 'remotion';
import {SANS, MONO, zaladujCzcionki} from './czcionki';

zaladujCzcionki();

/**
 * SCENY PELNOEKRANOWE.
 *
 * DLACZEGO TEN PLIK POWSTAL (08.09.2026, po rolce, ktora wyszla slabo u kursanta):
 *
 * Biblioteka efektow miala same PRZEZROCZYSTE NAKLADKI: maly napis albo mala
 * karta na tle nagrania. Automat nie potrafil zbudowac ani jednej pelnoekranowej
 * sceny, wiec rolka kursanta z definicji nie mogla wygladac jak rolka autora,
 * w ktorej co kilkanascie sekund wchodzi wypelniony kadr: tlo z gradientem,
 * siatka, poswiata, warstwy, duza typografia. Kursant dostawal "nagranie
 * z napisami", autor montowal "zmontowana rolke". Roznica nie byla w promptach
 * ani w modelu, tylko w tym, ze tych klockow po prostu nie bylo w pudelku.
 *
 * Kazda scena tutaj:
 *   - wypelnia caly kadr 1080x1920 i zaslania nagranie (to jest cutaway),
 *   - ma tlo z glebia (gradient + siatka + poswiata + winieta), nie plaski kolor,
 *   - jest sterowana propsami, wiec dziala u kazdego i dla kazdej tresci,
 *   - sama skaluje typografie, zeby dlugi tekst nie wyszedl poza kadr,
 *   - nie zawiera zadnych tresci o firmie autora.
 *
 * Sceny sa ciemne albo jasne. Automat je przeplata, bo kilka ciemnych plansz
 * pod rzad zlewa sie widzowi w jedno tlo.
 */

const ORANGE = '#FF4D2D';
const AMBER = '#FFB13D';
const INK = '#070B11';
const NAVY = '#0E1622';
const KREM = '#F4F1EA';
const GREEN = '#4ED47A';
const RED = '#F0453B';

/* ============================================================
   Budulce wspolne
   ============================================================ */

/** Dryf tla: powolny ruch poswiaty, zeby kadr nie byl martwy. */
const uzyjDryf = (frame: number, sila = 60) => Math.sin(frame / 42) * sila;

const TloCiemne: React.FC<{glow?: string; odcien?: 'granat' | 'czern'}> = ({
  glow = ORANGE,
  odcien = 'granat',
}) => {
  const frame = useCurrentFrame();
  const d = uzyjDryf(frame);
  return (
    <>
      <AbsoluteFill
        style={{
          background:
            odcien === 'granat'
              ? `linear-gradient(160deg, #12253c, ${INK})`
              : `linear-gradient(160deg, ${NAVY}, ${INK})`,
        }}
      />
      {/* Siatka: daje wrazenie "panelu", a nie plaskiego tla. */}
      <AbsoluteFill
        style={{
          backgroundImage:
            'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)',
          backgroundSize: '92px 92px',
          opacity: 0.05,
        }}
      />
      {/* Dwie poswiaty, ktore powoli plyna. */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(900px 900px at ${250 + d}px ${1480 - d}px, ${glow}2b 0%, transparent 70%), radial-gradient(760px 760px at ${860 - d}px ${330 + d}px, #2d6dff20 0%, transparent 70%)`,
        }}
      />
      {/* Winieta: przyciaga wzrok do srodka. */}
      <AbsoluteFill
        style={{background: 'radial-gradient(circle at 50% 45%, transparent 45%, rgba(0,0,0,0.62) 100%)'}}
      />
    </>
  );
};

const TloJasne: React.FC = () => {
  const frame = useCurrentFrame();
  const d = uzyjDryf(frame, 40);
  return (
    <>
      <AbsoluteFill style={{background: `linear-gradient(165deg, #FBF9F5, ${KREM} 60%, #EDE6DA)`}} />
      <AbsoluteFill
        style={{
          background: `radial-gradient(760px 760px at ${820 - d}px ${1560 + d}px, ${ORANGE}1c 0%, transparent 70%), radial-gradient(640px 640px at ${220 + d}px ${420 - d}px, ${AMBER}1a 0%, transparent 70%)`,
        }}
      />
      <AbsoluteFill
        style={{background: 'radial-gradient(circle at 50% 45%, transparent 55%, rgba(120,100,80,0.16) 100%)'}}
      />
    </>
  );
};

/** Mala etykieta nad trescia: nadaje scenie tytul i porzadkuje kadr. */
const Etykieta: React.FC<{tekst: string; jasne?: boolean; post: number}> = ({tekst, jasne, post}) => (
  <div
    style={{
      alignSelf: 'center',
      padding: '14px 30px',
      borderRadius: 999,
      border: `2px solid ${jasne ? `${ORANGE}66` : `${ORANGE}88`}`,
      background: jasne ? '#fff' : 'rgba(255,255,255,0.05)',
      color: ORANGE,
      fontFamily: SANS,
      fontSize: 30,
      fontWeight: 800,
      letterSpacing: 3,
      opacity: post,
      transform: `translateY(${interpolate(post, [0, 1], [-26, 0])}px)`,
      boxShadow: jasne ? '0 10px 30px rgba(180,120,80,0.18)' : 'none',
    }}
  >
    {tekst.toUpperCase()}
  </div>
);

/** Skala typografii: dluzszy tekst dostaje mniejszy stopien, zeby zmiescil sie w kadrze. */
function stopien(tekst: string, bazowy: number, minimalny: number, dzielnik: number) {
  return Math.max(minimalny, Math.min(bazowy, Math.round(dzielnik / Math.max(1, tekst.length))));
}

/* ============================================================
   1. scena-teza: jedno zdanie na caly ekran, slowo po slowie
   ============================================================ */
export const ScenaTeza: React.FC<{tekst?: string; etykieta?: string; klucz?: string}> = ({
  tekst = 'TO JEST NAJWAZNIEJSZE ZDANIE',
  etykieta = 'zapamietaj',
  klucz = '',
}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const slowa = tekst.trim().split(/\s+/);
  const post = spring({frame, fps, config: {damping: 200}});
  const wyjscie = interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const fs = stopien(tekst, 178, 88, 2750);

  return (
    <AbsoluteFill style={{opacity: wyjscie}}>
      <TloCiemne />
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', padding: 80, gap: 54}}>
        {etykieta ? <Etykieta tekst={etykieta} post={post} /> : null}
        <div style={{display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0 28px', maxWidth: 1000}}>
          {slowa.map((s, i) => {
            const p = spring({frame: frame - 3 - i * 4, fps, config: {damping: 16, mass: 0.7}});
            const podswietl = klucz && s.toLowerCase().includes(klucz.toLowerCase());
            return (
              <span
                key={i}
                style={{
                  fontFamily: SANS,
                  fontSize: fs,
                  fontWeight: 900,
                  letterSpacing: -2,
                  lineHeight: 1.04,
                  color: podswietl ? ORANGE : '#fff',
                  opacity: p,
                  transform: `translateY(${interpolate(p, [0, 1], [70, 0])}px) scale(${interpolate(p, [0, 1], [0.86, 1])})`,
                  textShadow: podswietl
                    ? `0 0 46px ${ORANGE}88, 0 12px 30px rgba(0,0,0,0.6)`
                    : '0 12px 34px rgba(0,0,0,0.65)',
                }}
              >
                {s}
              </span>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ============================================================
   2. scena-kontra: dwa panele, stary sposob kontra nowy
   ============================================================ */
export const ScenaKontra: React.FC<{
  zleTytul?: string;
  zlePunkty?: string[];
  dobreTytul?: string;
  dobrePunkty?: string[];
}> = ({
  zleTytul = 'RECZNIE',
  zlePunkty = ['godziny pracy', 'ciagle poprawki'],
  dobreTytul = 'Z AI',
  dobrePunkty = ['kilka minut', 'jedna komenda'],
}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const lewy = spring({frame, fps, config: {damping: 18, mass: 0.8}});
  const prawy = spring({frame: frame - 6, fps, config: {damping: 18, mass: 0.8}});
  const vs = spring({frame: frame - 14, fps, config: {damping: 11, mass: 0.6}});
  const wyjscie = interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const panel = (
    tytul: string,
    punkty: string[],
    kolor: string,
    post: number,
    zLewej: boolean,
    znak: string
  ) => (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 46,
        padding: '260px 96px',
        opacity: post,
        transform: `translateX(${interpolate(post, [0, 1], [zLewej ? -300 : 300, 0])}px)`,
      }}
    >
      <div
        style={{
          fontFamily: SANS,
          fontSize: 62,
          fontWeight: 900,
          color: kolor,
          letterSpacing: 1,
          textShadow: `0 0 40px ${kolor}66`,
        }}
      >
        {tytul}
      </div>
      {punkty.slice(0, 3).map((p, i) => (
        <div
          key={i}
          style={{
            fontFamily: SANS,
            fontSize: 44,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.9)',
            textAlign: 'center',
            lineHeight: 1.3,
            maxWidth: 330,
          }}
        >
          {p}
        </div>
      ))}
      <div
        style={{
          width: 128,
          height: 128,
          borderRadius: '50%',
          background: kolor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 72,
          fontWeight: 900,
          color: '#fff',
          fontFamily: SANS,
          lineHeight: 1,
          boxShadow: `0 18px 46px ${kolor}55`,
        }}
      >
        {znak}
      </div>
    </div>
  );

  return (
    <AbsoluteFill style={{opacity: wyjscie}}>
      <TloCiemne odcien="czern" />
      {/* Polowa lewa ciemniejsza, prawa cieplejsza: widac na pierwszy rzut oka, ktora strona wygrywa. */}
      <AbsoluteFill style={{flexDirection: 'row'}}>
        <div style={{flex: 1, background: 'linear-gradient(180deg, rgba(240,69,59,0.10), transparent)'}} />
        <div style={{flex: 1, background: 'linear-gradient(180deg, rgba(255,77,45,0.16), transparent)'}} />
      </AbsoluteFill>
      <AbsoluteFill style={{flexDirection: 'row', alignItems: 'center'}}>
        {panel(zleTytul, zlePunkty, RED, lewy, true, '✗')}
        {panel(dobreTytul, dobrePunkty, ORANGE, prawy, false, '✓')}
      </AbsoluteFill>
      {/* Kreska rozdzielajaca panele. */}
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
        <div
          style={{
            position: 'absolute',
            width: 3,
            height: 900,
            background: 'linear-gradient(transparent, rgba(255,255,255,0.22), transparent)',
          }}
        />
        <div
          style={{
            width: 150,
            height: 150,
            borderRadius: '50%',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: SANS,
            fontSize: 54,
            fontWeight: 900,
            color: INK,
            transform: `scale(${vs})`,
            boxShadow: '0 22px 60px rgba(0,0,0,0.6)',
          }}
        >
          VS
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ============================================================
   3. scena-lista: punkty odhaczane po kolei (tlo JASNE)
   ============================================================ */
export const ScenaLista: React.FC<{punkty?: string[]; etykieta?: string}> = ({
  punkty = ['nagrywasz', 'wrzucasz plik', 'gotowe'],
  etykieta = 'jak to dziala',
}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const post = spring({frame, fps, config: {damping: 200}});
  const wyjscie = interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{opacity: wyjscie}}>
      <TloJasne />
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', padding: 70, gap: 46}}>
        {etykieta ? <Etykieta tekst={etykieta} jasne post={post} /> : null}
        <div style={{display: 'flex', flexDirection: 'column', gap: 38, width: '100%', maxWidth: 940}}>
          {punkty.slice(0, 4).map((p, i) => {
            const wj = spring({frame: frame - 8 - i * 9, fps, config: {damping: 15, mass: 0.7}});
            const check = spring({frame: frame - 16 - i * 9, fps, config: {damping: 12, mass: 0.5}});
            const fs = stopien(p, 64, 42, 1900);
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 26,
                  padding: '42px 40px',
                  background: '#fff',
                  borderRadius: 26,
                  boxShadow: '0 18px 46px rgba(120,90,60,0.16)',
                  opacity: wj,
                  transform: `translateX(${interpolate(wj, [0, 1], [-90, 0])}px)`,
                }}
              >
                <div
                  style={{
                    width: 78,
                    height: 78,
                    borderRadius: '50%',
                    background: GREEN,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontFamily: SANS,
                    fontSize: 38,
                    fontWeight: 900,
                    transform: `scale(${check})`,
                    flexShrink: 0,
                  }}
                >
                  {'✓'}
                </div>
                <div
                  style={{
                    fontFamily: SANS,
                    fontSize: fs,
                    fontWeight: 800,
                    color: '#1A1A1A',
                    letterSpacing: -0.5,
                  }}
                >
                  {p}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ============================================================
   4. scena-liczba: wielka liczba z licznikiem
   ============================================================ */
export const ScenaLiczba: React.FC<{liczba?: string; podpis?: string; etykieta?: string}> = ({
  liczba = '4 MINUTY',
  podpis = 'tyle to zajmuje',
  etykieta = '',
}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const post = spring({frame, fps, config: {damping: 200}});
  const skok = spring({frame: frame - 4, fps, config: {damping: 12, mass: 0.9}});
  const podpisP = spring({frame: frame - 16, fps, config: {damping: 200}});
  const wyjscie = interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const fs = stopien(liczba, 210, 96, 1750);
  const puls = 1 + Math.sin(frame / 9) * 0.012;

  return (
    <AbsoluteFill style={{opacity: wyjscie}}>
      <TloCiemne glow={AMBER} />
      {/* Pierscien poswiaty za liczba. */}
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
        <div
          style={{
            width: 880,
            height: 880,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${ORANGE}30 0%, transparent 62%)`,
            transform: `scale(${interpolate(skok, [0, 1], [0.6, 1]) * puls})`,
          }}
        />
      </AbsoluteFill>
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', padding: 70, gap: 34}}>
        {etykieta ? <Etykieta tekst={etykieta} post={post} /> : null}
        <div
          style={{
            fontFamily: SANS,
            fontSize: fs,
            fontWeight: 900,
            color: '#fff',
            letterSpacing: -4,
            lineHeight: 1,
            textAlign: 'center',
            transform: `scale(${interpolate(skok, [0, 1], [0.55, 1])})`,
            textShadow: `0 0 70px ${ORANGE}aa, 0 16px 40px rgba(0,0,0,0.7)`,
          }}
        >
          {liczba}
        </div>
        <div
          style={{
            fontFamily: SANS,
            fontSize: 40,
            fontWeight: 800,
            letterSpacing: 5,
            color: 'rgba(255,255,255,0.82)',
            textTransform: 'uppercase',
            textAlign: 'center',
            opacity: podpisP,
            transform: `translateY(${interpolate(podpisP, [0, 1], [26, 0])}px)`,
          }}
        >
          {podpis}
        </div>
        <div
          style={{
            width: interpolate(podpisP, [0, 1], [0, 260]),
            height: 6,
            borderRadius: 3,
            background: `linear-gradient(90deg, ${AMBER}, ${ORANGE})`,
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ============================================================
   5. scena-problem: bole przekreslane po kolei (tlo JASNE)
   ============================================================ */
export const ScenaProblem: React.FC<{punkty?: string[]; etykieta?: string}> = ({
  punkty = ['reczne ciecie', 'szukanie muzyki', 'poprawki w kolko'],
  etykieta = 'koniec z tym',
}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const post = spring({frame, fps, config: {damping: 200}});
  const wyjscie = interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{opacity: wyjscie}}>
      <TloJasne />
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', padding: 70, gap: 44}}>
        {etykieta ? <Etykieta tekst={etykieta} jasne post={post} /> : null}
        <div style={{display: 'flex', flexDirection: 'column', gap: 34, width: '100%', maxWidth: 940}}>
          {punkty.slice(0, 4).map((p, i) => {
            const wj = spring({frame: frame - 8 - i * 10, fps, config: {damping: 15, mass: 0.7}});
            const kreska = interpolate(frame, [20 + i * 10, 32 + i * 10], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            const fs = stopien(p, 60, 40, 1800);
            return (
              <div
                key={i}
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 22,
                  padding: '40px 38px',
                  background: '#fff',
                  borderRadius: 24,
                  boxShadow: '0 16px 42px rgba(120,90,60,0.15)',
                  opacity: wj,
                  transform: `translateX(${interpolate(wj, [0, 1], [-80, 0])}px)`,
                }}
              >
                <div
                  style={{
                    position: 'relative',
                    fontFamily: SANS,
                    fontSize: fs,
                    fontWeight: 800,
                    color: '#2A2A2A',
                    opacity: interpolate(kreska, [0, 1], [1, 0.45]),
                  }}
                >
                  {p}
                  {/* Kreska przekreslajaca rysuje sie, a nie pojawia od razu. */}
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: '52%',
                      height: 7,
                      width: `${kreska * 100}%`,
                      borderRadius: 4,
                      background: RED,
                    }}
                  />
                </div>
                <div
                  style={{
                    fontFamily: SANS,
                    fontSize: 46,
                    fontWeight: 900,
                    color: RED,
                    opacity: kreska,
                    transform: `scale(${interpolate(kreska, [0, 1], [0.4, 1])})`,
                    flexShrink: 0,
                  }}
                >
                  {'✗'}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ============================================================
   6. scena-kroki: numerowane etapy
   ============================================================ */
export const ScenaKroki: React.FC<{kroki?: string[]; etykieta?: string}> = ({
  kroki = ['wrzucasz nagranie', 'wpisujesz komende', 'odbierasz gotowe'],
  etykieta = 'trzy kroki',
}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const post = spring({frame, fps, config: {damping: 200}});
  const wyjscie = interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{opacity: wyjscie}}>
      <TloCiemne odcien="czern" glow={AMBER} />
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', padding: 70, gap: 46}}>
        {etykieta ? <Etykieta tekst={etykieta} post={post} /> : null}
        <div style={{display: 'flex', flexDirection: 'column', gap: 42, width: '100%', maxWidth: 940}}>
          {kroki.slice(0, 4).map((k, i) => {
            const wj = spring({frame: frame - 8 - i * 10, fps, config: {damping: 16, mass: 0.75}});
            const fs = stopien(k, 60, 40, 1800);
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 28,
                  opacity: wj,
                  transform: `translateY(${interpolate(wj, [0, 1], [50, 0])}px)`,
                }}
              >
                <div
                  style={{
                    width: 112,
                    height: 112,
                    borderRadius: 24,
                    background: `linear-gradient(140deg, ${AMBER}, ${ORANGE})`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: SANS,
                    fontSize: 52,
                    fontWeight: 900,
                    color: '#fff',
                    flexShrink: 0,
                    boxShadow: `0 16px 40px ${ORANGE}55`,
                  }}
                >
                  {i + 1}
                </div>
                <div
                  style={{
                    flex: 1,
                    padding: '38px 34px',
                    borderRadius: 22,
                    background: 'rgba(255,255,255,0.07)',
                    border: '2px solid rgba(255,255,255,0.13)',
                    fontFamily: SANS,
                    fontSize: fs,
                    fontWeight: 800,
                    color: '#fff',
                  }}
                >
                  {k}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ============================================================
   7. scena-komentarz: mockup komentarza (tlo JASNE)
   ============================================================ */
export const ScenaKomentarz: React.FC<{nick?: string; tresc?: string; etykieta?: string}> = ({
  nick = 'ktos_z_komentarzy',
  tresc = 'napisz w komentarzu',
  etykieta = '',
}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const post = spring({frame, fps, config: {damping: 200}});
  const karta = spring({frame: frame - 4, fps, config: {damping: 14, mass: 0.8}});
  const serce = spring({frame: frame - 22, fps, config: {damping: 9, mass: 0.5}});
  const drugi = spring({frame: frame - 16, fps, config: {damping: 16, mass: 0.8}});
  const wyjscie = interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const fs = stopien(tresc, 66, 42, 2000);

  return (
    <AbsoluteFill style={{opacity: wyjscie}}>
      <TloJasne />
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', padding: 70, gap: 40}}>
        {etykieta ? <Etykieta tekst={etykieta} jasne post={post} /> : null}
        <div
          style={{
            width: '100%',
            maxWidth: 950,
            background: '#fff',
            borderRadius: 38,
            padding: '54px 48px',
            display: 'flex',
            gap: 26,
            alignItems: 'flex-start',
            boxShadow: '0 26px 70px rgba(120,90,60,0.22)',
            opacity: karta,
            transform: `scale(${interpolate(karta, [0, 1], [0.86, 1])}) translateY(${interpolate(karta, [0, 1], [40, 0])}px)`,
          }}
        >
          <div
            style={{
              width: 104,
              height: 104,
              borderRadius: '50%',
              background: `linear-gradient(140deg, ${AMBER}, ${ORANGE})`,
              flexShrink: 0,
            }}
          />
          <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: 12}}>
            <div style={{fontFamily: MONO, fontSize: 28, fontWeight: 700, color: '#8A8A8A'}}>{nick}</div>
            <div style={{fontFamily: SANS, fontSize: fs, fontWeight: 800, color: '#1A1A1A', lineHeight: 1.2}}>
              {tresc}
            </div>
          </div>
          <div
            style={{
              fontSize: 44,
              color: RED,
              transform: `scale(${serce})`,
              flexShrink: 0,
              fontFamily: SANS,
              lineHeight: 1,
            }}
          >
            {'♥'}
          </div>
        </div>
        {/* Drugi dymek, mniejszy i przygaszony: kadr przestaje byc pusty,
            a widz czyta to jako liste komentarzy, nie pojedynczy napis. */}
        <div
          style={{
            width: '100%',
            maxWidth: 780,
            background: 'rgba(255,255,255,0.72)',
            borderRadius: 30,
            padding: '30px 36px',
            display: 'flex',
            gap: 20,
            alignItems: 'center',
            boxShadow: '0 16px 40px rgba(120,90,60,0.14)',
            opacity: drugi * 0.9,
            transform: `translateY(${interpolate(drugi, [0, 1], [40, 0])}px)`,
          }}
        >
          <div
            style={{
              width: 62,
              height: 62,
              borderRadius: '50%',
              background: 'linear-gradient(140deg, #9AA7B5, #6B7887)',
              flexShrink: 0,
            }}
          />
          <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: 10}}>
            <div style={{width: '46%', height: 14, borderRadius: 7, background: 'rgba(0,0,0,0.16)'}} />
            <div style={{width: '78%', height: 20, borderRadius: 10, background: 'rgba(0,0,0,0.22)'}} />
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ============================================================
   8. scena-cta: koncowka
   ============================================================ */
export const ScenaCta: React.FC<{haslo?: string; podpis?: string}> = ({
  haslo = 'ZRÓB TO DZISIAJ',
  podpis = 'napisz w komentarzu',
}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const skok = spring({frame, fps, config: {damping: 13, mass: 0.8}});
  const podpisP = spring({frame: frame - 14, fps, config: {damping: 200}});
  const wyjscie = interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const fs = stopien(haslo, 160, 76, 2000);
  const strzalka = Math.sin(frame / 7) * 12;

  return (
    <AbsoluteFill style={{opacity: wyjscie}}>
      <TloCiemne glow={ORANGE} />
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', padding: 70, gap: 46}}>
        <div
          style={{
            fontFamily: SANS,
            fontSize: fs,
            fontWeight: 900,
            color: '#fff',
            letterSpacing: -3,
            lineHeight: 1.04,
            textAlign: 'center',
            transform: `scale(${interpolate(skok, [0, 1], [0.7, 1])})`,
            textShadow: `0 0 60px ${ORANGE}99, 0 16px 40px rgba(0,0,0,0.7)`,
          }}
        >
          {haslo}
        </div>
        <div
          style={{
            padding: '22px 46px',
            borderRadius: 999,
            background: `linear-gradient(140deg, ${AMBER}, ${ORANGE})`,
            fontFamily: SANS,
            fontSize: 42,
            fontWeight: 900,
            color: '#fff',
            letterSpacing: 1,
            opacity: podpisP,
            transform: `translateY(${interpolate(podpisP, [0, 1], [40, 0])}px)`,
            boxShadow: `0 20px 56px ${ORANGE}66`,
          }}
        >
          {podpis}
        </div>
        <div
          style={{
            fontFamily: SANS,
            fontSize: 96,
            fontWeight: 900,
            color: 'rgba(255,255,255,0.9)',
            opacity: podpisP,
            transform: `translateY(${strzalka}px)`,
            lineHeight: 1,
          }}
        >
          {'↓'}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
