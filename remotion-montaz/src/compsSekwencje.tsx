import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring} from 'remotion';
import {SANS, MONO, zaladujCzcionki} from './czcionki';

zaladujCzcionki();

/**
 * SEKWENCJE, CZYLI EFEKTY, KTORE NARASTAJA.
 *
 * DLACZEGO TEN PLIK POWSTAL (08.09.2026, po przejrzeniu klatka po klatce
 * wszystkich rolek, ktore autor uznal za dobre):
 *
 * Automat wstawial KARTY: jeden gotowy element, ktory pojawial sie na 2,8 s
 * i znikal. W rolkach autora nie ma prawie takich efektow. Tam efekt ZYJE:
 * wchodzi etykieta, po sekundzie dochodzi pierwsza pozycja, po kolejnej druga,
 * na koncu puenta. Calosc trwa piec do siedmiu sekund i przez caly ten czas
 * cos sie w kadrze dzieje, w rytm tego, co mowi mowiacy. Przyklady wprost
 * z gotowych rolek:
 *
 *   "RECZNIE = STRATA"  ->  [zegar] duzo czasu  ->  [kasa] sporo kasy
 *                       ->  "z AI: lepiej i szybciej"
 *   "ZERO ROBOTY"       ->  ~~uczenia sie montazu~~ X  ->  ~~robienia efektow~~ X
 *   "CO ROBIE"          ->  CIECIA -> EFEKTY -> ANIMACJE -> MUZYKA
 *
 * To jest roznica miedzy "nagraniem z nalepkami" a montazem. Statyczna karta
 * na 2,8 s zawsze bedzie wygladac na doklejona, bo nie ma zwiazku z rytmem mowy.
 *
 * Kazda sekwencja przyjmuje liste pozycji i sama rozklada je w czasie na
 * dlugosc kompozycji. Nie trzeba podawac czasow.
 */

const ORANGE = '#FF4D2D';
const AMBER = '#FFB13D';
const GREEN = '#4ED47A';
const RED = '#F0453B';
const INK = '#070B11';
const KREM = '#F4F1EA';

export type Pozycja = {
  ikona?: string;
  tekst: string;
  przekreslone?: boolean;
};

/** Kiedy wchodzi element numer `i` z `ile`, w klatkach. */
function wejscie(i: number, ile: number, durationInFrames: number, fps: number) {
  const start = Math.round(fps * 0.55) + i * Math.round(fps * 0.85);
  return Math.min(start, durationInFrames - Math.round(fps * 0.5));
}

/** Ruch jednego elementu: z rozmycia, z boku, ze sprezynka. */
function ruch(frame: number, fps: number, opoznienie: number, zLewej = true) {
  const w = spring({frame: frame - opoznienie, fps, config: {damping: 12, mass: 0.6, stiffness: 170}});
  return {
    krycie: w,
    x: interpolate(w, [0, 1], [zLewej ? -90 : 90, 0]),
    skala: interpolate(w, [0, 1], [0.9, 1]),
    rozmycie: interpolate(w, [0, 0.6], [12, 0], {extrapolateRight: 'clamp'}),
  };
}

/* ============================================================
   Tla
   ============================================================ */
const TloJasne: React.FC = () => {
  const frame = useCurrentFrame();
  const d = Math.sin(frame / 44) * 38;
  return (
    <>
      <AbsoluteFill style={{background: `linear-gradient(165deg, #FCFAF7, ${KREM} 58%, #ECE4D8)`}} />
      <AbsoluteFill
        style={{
          background: `radial-gradient(780px 780px at ${820 - d}px ${1540 + d}px, ${ORANGE}1f 0%, transparent 70%), radial-gradient(660px 660px at ${230 + d}px ${430 - d}px, ${AMBER}1c 0%, transparent 70%)`,
        }}
      />
      <AbsoluteFill
        style={{background: 'radial-gradient(circle at 50% 46%, transparent 54%, rgba(120,100,80,0.18) 100%)'}}
      />
    </>
  );
};

const TloCiemne: React.FC = () => {
  const frame = useCurrentFrame();
  const d = Math.sin(frame / 44) * 52;
  return (
    <>
      <AbsoluteFill style={{background: `linear-gradient(160deg, #12253c, ${INK})`}} />
      <AbsoluteFill
        style={{
          backgroundImage:
            'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)',
          backgroundSize: '92px 92px',
          opacity: 0.05,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(900px 900px at ${250 + d}px ${1480 - d}px, ${ORANGE}2e 0%, transparent 70%)`,
        }}
      />
      <AbsoluteFill
        style={{background: 'radial-gradient(circle at 50% 45%, transparent 45%, rgba(0,0,0,0.66) 100%)'}}
      />
    </>
  );
};

/** Etykieta u gory sekwencji: "RECZNIE = STRATA", "ZERO ROBOTY", "CO ROBIE". */
const Etykieta: React.FC<{tekst: string; jasne: boolean; post: number}> = ({tekst, jasne, post}) => (
  <div
    style={{
      alignSelf: 'center',
      padding: '12px 26px',
      borderRadius: 999,
      border: `2px solid ${ORANGE}${jasne ? '55' : '88'}`,
      background: jasne ? '#fff' : 'rgba(255,255,255,0.06)',
      color: ORANGE,
      fontFamily: SANS,
      fontSize: 26,
      fontWeight: 800,
      letterSpacing: 3,
      opacity: post,
      transform: `translateY(${interpolate(post, [0, 1], [-22, 0])}px)`,
      boxShadow: jasne ? '0 10px 26px rgba(180,120,80,0.16)' : 'none',
      marginBottom: 34,
    }}
  >
    {tekst.toUpperCase()}
  </div>
);

/** Jeden wiersz sekwencji: ikona, tekst, opcjonalne przekreslenie i krzyzyk. */
const Wiersz: React.FC<{
  poz: Pozycja;
  jasne: boolean;
  r: ReturnType<typeof ruch>;
  frame: number;
  opoznienie: number;
  fps: number;
  duzy: boolean;
}> = ({poz, jasne, r, frame, opoznienie, fps, duzy}) => {
  // Kreska przekreslajaca RYSUJE SIE, chwile po tym, jak wiersz wjechal.
  const kreska = interpolate(
    frame,
    [opoznienie + fps * 0.35, opoznienie + fps * 0.75],
    [0, 1],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}
  );
  const fs = duzy ? 46 : 38;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        padding: duzy ? '20px 30px' : '14px 24px',
        borderRadius: 18,
        background: jasne ? '#fff' : 'rgba(11,15,22,0.92)',
        border: jasne ? '2px solid rgba(120,90,60,0.10)' : '2px solid rgba(255,255,255,0.14)',
        boxShadow: jasne
          ? '0 14px 36px rgba(120,90,60,0.16)'
          : '0 16px 40px rgba(0,0,0,0.5)',
        opacity: r.krycie,
        transform: `translateX(${r.x}px) scale(${r.skala})`,
        filter: `blur(${r.rozmycie}px)`,
      }}
    >
      {poz.ikona ? <div style={{fontSize: fs + 6, lineHeight: 1, flexShrink: 0}}>{poz.ikona}</div> : null}
      <div style={{position: 'relative'}}>
        <div
          style={{
            fontFamily: SANS,
            fontSize: fs,
            fontWeight: 800,
            color: jasne ? '#22201D' : '#fff',
            opacity: poz.przekreslone ? interpolate(kreska, [0, 1], [1, 0.5]) : 1,
            whiteSpace: 'nowrap',
          }}
        >
          {poz.tekst}
        </div>
        {poz.przekreslone ? (
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: '52%',
              height: 6,
              width: `${kreska * 100}%`,
              borderRadius: 3,
              background: RED,
            }}
          />
        ) : null}
      </div>
      {poz.przekreslone ? (
        <div
          style={{
            fontFamily: SANS,
            fontSize: fs - 4,
            fontWeight: 900,
            color: RED,
            opacity: kreska,
            transform: `scale(${interpolate(kreska, [0, 1], [0.4, 1])})`,
            flexShrink: 0,
          }}
        >
          {'✗'}
        </div>
      ) : null}
    </div>
  );
};

/* ============================================================
   1. sekwencja-pelna: pelnoekranowa, elementy dochodza po kolei
   ============================================================ */
export const SekwencjaPelna: React.FC<{
  etykieta?: string;
  pozycje?: Pozycja[];
  puenta?: string;
  jasne?: boolean;
}> = ({
  etykieta = 'ręcznie = strata',
  pozycje = [
    {ikona: '⏰', tekst: 'dużo czasu', przekreslone: false},
    {ikona: '💸', tekst: 'sporo kasy', przekreslone: false},
  ],
  puenta = '',
  jasne = true,
}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const post = spring({frame, fps, config: {damping: 200}});
  const wyjscie = interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const lista = pozycje.slice(0, 4);
  const puentaP = spring({
    frame: frame - wejscie(lista.length, lista.length, durationInFrames, fps),
    fps,
    config: {damping: 12, mass: 0.6},
  });

  return (
    <AbsoluteFill style={{opacity: wyjscie}}>
      {jasne ? <TloJasne /> : <TloCiemne />}
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', padding: 70}}>
        {etykieta ? <Etykieta tekst={etykieta} jasne={jasne} post={post} /> : null}
        <div style={{display: 'flex', flexDirection: 'column', gap: 22, alignItems: 'center'}}>
          {lista.map((p, i) => {
            const op = wejscie(i, lista.length, durationInFrames, fps);
            return (
              <Wiersz
                key={i}
                poz={p}
                jasne={jasne}
                r={ruch(frame, fps, op, i % 2 === 0)}
                frame={frame}
                opoznienie={op}
                fps={fps}
                duzy
              />
            );
          })}
        </div>
        {puenta ? (
          <div
            style={{
              marginTop: 34,
              fontFamily: SANS,
              fontSize: 44,
              fontWeight: 900,
              color: jasne ? '#22201D' : '#fff',
              opacity: puentaP,
              transform: `translateY(${interpolate(puentaP, [0, 1], [26, 0])}px)`,
              textAlign: 'center',
            }}
          >
            {puenta.split(':').map((cz, i) =>
              i === 1 ? (
                <span key={i} style={{color: ORANGE}}>
                  :{cz}
                </span>
              ) : (
                <span key={i}>{cz}</span>
              )
            )}
          </div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ============================================================
   2. sekwencja-nakladka: to samo, ale NA nagraniu, nad napisami
   ============================================================ */
export const SekwencjaNakladka: React.FC<{pozycje?: Pozycja[]; etykieta?: string}> = ({
  pozycje = [
    {ikona: '✅', tekst: 'montaż to dobra umiejętność'},
    {ikona: '⏳', tekst: 'ale nie za cenę 3 godzin'},
  ],
  etykieta = '',
}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const post = spring({frame, fps, config: {damping: 200}});
  const wyjscie = interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const lista = pozycje.slice(0, 2);

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingLeft: 60,
        paddingRight: 60,
        paddingBottom: 8,
        opacity: wyjscie,
      }}
    >
      <div style={{display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center'}}>
        {etykieta ? <Etykieta tekst={etykieta} jasne={false} post={post} /> : null}
        {lista.map((p, i) => {
          const op = wejscie(i, lista.length, durationInFrames, fps);
          return (
            <Wiersz
              key={i}
              poz={p}
              jasne={false}
              r={ruch(frame, fps, op, i % 2 === 0)}
              frame={frame}
              opoznienie={op}
              fps={fps}
              duzy={false}
            />
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* ============================================================
   3. sekwencja-checklista: pozycje odhaczane, jak "CO ROBIE"
   ============================================================ */
export const SekwencjaChecklista: React.FC<{etykieta?: string; punkty?: string[]; jasne?: boolean}> = ({
  etykieta = 'co robię',
  punkty = ['CIĘCIA', 'EFEKTY', 'ANIMACJE', 'MUZYKA'],
  jasne = false,
}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const post = spring({frame, fps, config: {damping: 200}});
  const wyjscie = interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const lista = punkty.slice(0, 4);

  return (
    <AbsoluteFill style={{opacity: wyjscie}}>
      {jasne ? <TloJasne /> : <TloCiemne />}
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', padding: 70}}>
        {etykieta ? <Etykieta tekst={etykieta} jasne={jasne} post={post} /> : null}
        <div style={{display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'flex-start'}}>
          {lista.map((p, i) => {
            const op = wejscie(i, lista.length, durationInFrames, fps);
            const r = ruch(frame, fps, op, true);
            const ptaszek = spring({frame: frame - op - fps * 0.3, fps, config: {damping: 10, mass: 0.5}});
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: '14px 26px',
                  borderRadius: 14,
                  background: jasne ? '#fff' : 'rgba(11,15,22,0.92)',
                  border: `2px solid ${ORANGE}${jasne ? '33' : '55'}`,
                  boxShadow: jasne ? '0 12px 30px rgba(120,90,60,0.14)' : '0 14px 34px rgba(0,0,0,0.5)',
                  opacity: r.krycie,
                  transform: `translateX(${r.x}px) scale(${r.skala})`,
                  filter: `blur(${r.rozmycie}px)`,
                  // Kazdy kolejny wiersz odrobine dalej w prawo: lista "schodzi"
                  // po skosie, zamiast stac w kolumnie jak tabela.
                  marginLeft: i * 26,
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    background: ORANGE,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontFamily: SANS,
                    fontSize: 22,
                    fontWeight: 900,
                    transform: `scale(${ptaszek})`,
                    flexShrink: 0,
                  }}
                >
                  {'✓'}
                </div>
                <div
                  style={{
                    fontFamily: SANS,
                    fontSize: 38,
                    fontWeight: 800,
                    color: jasne ? '#22201D' : '#fff',
                    letterSpacing: 1,
                    whiteSpace: 'nowrap',
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
   4. sekwencja-terminal: AI pracuje, wiersze dochodza jak w konsoli
   ============================================================ */
export const SekwencjaTerminal: React.FC<{tytul?: string; kroki?: string[]}> = ({
  tytul = 'AI MONTUJE',
  kroki = ['analizuję nagranie', 'wycinam ciszę i wpadki', 'dokładam napisy'],
}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const post = spring({frame, fps, config: {damping: 16, mass: 0.7}});
  const wyjscie = interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const lista = kroki.slice(0, 4);
  const postep = interpolate(frame, [fps * 0.4, durationInFrames - fps * 0.4], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingLeft: 60,
        paddingRight: 60,
        paddingBottom: 8,
        opacity: wyjscie,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 880,
          background: 'rgba(8,11,16,0.95)',
          border: `2px solid ${ORANGE}77`,
          borderRadius: 18,
          padding: '20px 26px',
          opacity: post,
          transform: `translateY(${interpolate(post, [0, 1], [40, 0])}px)`,
          boxShadow: `0 20px 50px rgba(0,0,0,0.6), 0 0 34px ${ORANGE}22`,
        }}
      >
        <div
          style={{
            fontFamily: MONO,
            fontSize: 22,
            fontWeight: 700,
            color: ORANGE,
            letterSpacing: 3,
            marginBottom: 12,
          }}
        >
          {tytul}
        </div>
        {lista.map((k, i) => {
          const op = wejscie(i, lista.length, durationInFrames, fps);
          const r = ruch(frame, fps, op, true);
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 8,
                opacity: r.krycie,
                transform: `translateX(${r.x * 0.35}px)`,
              }}
            >
              <span style={{color: GREEN, fontFamily: MONO, fontSize: 26, fontWeight: 700}}>{'✓'}</span>
              <span style={{color: 'rgba(255,255,255,0.9)', fontFamily: MONO, fontSize: 26}}>{k}</span>
            </div>
          );
        })}
        <div style={{height: 10, borderRadius: 5, background: 'rgba(255,255,255,0.12)', marginTop: 14}}>
          <div
            style={{
              width: `${postep * 100}%`,
              height: '100%',
              borderRadius: 5,
              background: `linear-gradient(90deg, ${AMBER}, ${ORANGE})`,
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};
