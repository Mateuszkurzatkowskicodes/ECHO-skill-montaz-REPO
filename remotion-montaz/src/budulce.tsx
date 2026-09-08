import React from 'react';
import {AbsoluteFill, Img, staticFile, useCurrentFrame, interpolate, spring, useVideoConfig} from 'remotion';
import {SANS, MONO, zaladujCzcionki} from './czcionki';

zaladujCzcionki();

/**
 * BUDULCE. Wspolne klocki, z ktorych zbudowana jest kazda rolka autora.
 *
 * DLACZEGO TEN PLIK ISTNIEJE (08.09.2026):
 * warsztat autora ma 342 kompozycje pisane pod konkretne rolki i wszystkie
 * korzystaja z tych samych kilku klockow: tego samego tla z ziarnem, tej samej
 * etykiety, tego samego brand buga, tych samych kolorow i sprezyn. To one daja
 * rolkom spojny, drogi wyglad, niezaleznie od tego, co akurat pokazuja.
 * W zestawie dla kursantow tych klockow nie bylo, wiec kazdy nowy efekt
 * wygladal jak z innej bajki.
 *
 * KIEDY PISZESZ WLASNY KOMPONENT, ZACZNIJ OD TEGO PLIKU. Wez `TloCiemne`
 * albo `TloJasne`, dolóz `Etykieta` u gory, `Puenta` na dole, uzyj `wejscie()`
 * do animacji i kolorow z `KOLORY`. Wtedy Twoj efekt bedzie wygladal jak reszta.
 */

/* ============================ kolory i typografia ============================ */

export const KOLORY = {
  ogien: 'linear-gradient(150deg,#FFB13D,#FF4A2D 55%,#E0290F)',
  pomarancz: '#FF4D2D',
  bursztyn: '#FFB13D',
  glebokiCzerwony: '#E0290F',
  blekit: '#38B6D8',
  zielen: '#4ED47A',
  czerwien: '#F0453B',
  atrament: '#141a24',
  czern: '#070B10',
  krem: '#F4F1EA',
};

export const CIEZKI = SANS;
export const TECHNICZNY = MONO;

/* ============================ tla ============================ */

/**
 * Ciemne tlo z ziarnem.
 *
 * Trzy warstwy i kazda cos wnosi:
 *   1. gradient granat-czern, czyli baza,
 *   2. dwie plamy swiatla (cieply pomarancz i zimny blekit), ktore powoli
 *      plyna w przeciwnych kierunkach, wiec kadr nigdy nie stoi,
 *   3. ZIARNO przez feTurbulence w trybie overlay. To jest ta warstwa, ktorej
 *      brakowalo w zestawie kursantow: bez niej gradient wyglada jak tapeta
 *      z edytora, z nia jak material filmowy.
 */
export const TloCiemne: React.FC<{id?: string}> = ({id = 'ziarnoC'}) => {
  const frame = useCurrentFrame();
  const dx = Math.sin(frame / 88) * 70;
  const dy = Math.cos(frame / 112) * 50;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{background: `linear-gradient(160deg,#151c27 0%,${KOLORY.czern} 100%)`}} />
      <AbsoluteFill
        style={{
          background: `radial-gradient(780px 780px at ${76 + dx / 26}% ${22 + dy / 30}%, rgba(255,74,45,.32) 0%, transparent 62%),radial-gradient(700px 700px at ${20 - dx / 30}% ${80 - dy / 34}%, rgba(56,182,216,.18) 0%, transparent 62%)`,
        }}
      />
      <svg width="0" height="0">
        <filter id={id}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </svg>
      <AbsoluteFill style={{filter: `url(#${id})`, opacity: 0.06, mixBlendMode: 'overlay'}} />
    </AbsoluteFill>
  );
};

/** Jasne tlo z ziarnem. Ta sama zasada, tylko ciepla i kremowa. */
export const TloJasne: React.FC<{id?: string}> = ({id = 'ziarnoJ'}) => {
  const frame = useCurrentFrame();
  const dx = Math.sin(frame / 98) * 60;
  const dy = Math.cos(frame / 118) * 45;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{background: 'linear-gradient(160deg,#F7F4EE 0%,#EAE5DC 100%)'}} />
      <AbsoluteFill
        style={{
          background: `radial-gradient(880px 880px at ${84 + dx / 20}% ${84 + dy / 30}%, rgba(255,74,45,.17) 0%, transparent 60%),radial-gradient(800px 800px at ${14 - dx / 22}% ${14 - dy / 34}%, rgba(56,182,216,.12) 0%, transparent 60%)`,
        }}
      />
      <svg width="0" height="0">
        <filter id={id}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </svg>
      <AbsoluteFill style={{filter: `url(#${id})`, opacity: 0.05, mixBlendMode: 'multiply'}} />
    </AbsoluteFill>
  );
};

/* ============================ elementy ============================ */

/**
 * Logo w rogu. Szuka `brand-bug-echo.png`, a gdy go nie ma, `brand-bug.png`.
 * Wrzuc swoje logo do `remotion-montaz/public/` pod jedna z tych nazw.
 * Nazwa marki wystukana czcionka wyglada jak podpis pod zdjeciem, logo wyglada
 * jak marka, dlatego to jest PLIK, a nie tekst.
 */
export const BrandBug: React.FC<{jasne?: boolean; plik?: string}> = ({jasne, plik = 'brand-bug.png'}) => (
  <Img
    src={staticFile(plik)}
    style={{
      position: 'absolute',
      top: 56,
      right: 44,
      width: 180,
      opacity: jasne ? 0.9 : 0.95,
      filter: jasne ? 'drop-shadow(0 8px 20px rgba(0,0,0,0.18))' : 'drop-shadow(0 8px 24px rgba(0,0,0,0.55))',
    }}
  />
);

/** Etykieta u gory sceny: "RECZNIE = STRATA", "CO ROBIE", "A TERAZ". */
export const Etykieta: React.FC<{children: React.ReactNode; opoznienie?: number; jasne?: boolean}> = ({
  children,
  opoznienie = 0,
  jasne,
}) => {
  const frame = useCurrentFrame();
  const op = interpolate(frame - opoznienie, [0, 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const y = interpolate(frame - opoznienie, [0, 12], [-28, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div
      style={{
        display: 'inline-block',
        fontFamily: CIEZKI,
        fontWeight: 800,
        fontSize: 34,
        letterSpacing: 7,
        color: jasne ? KOLORY.pomarancz : '#FF7A4D',
        padding: '12px 30px',
        border: `2px solid ${jasne ? 'rgba(255,74,45,.45)' : 'rgba(255,122,77,.5)'}`,
        borderRadius: 999,
        background: jasne ? 'rgba(255,255,255,.75)' : 'rgba(255,255,255,.05)',
        opacity: op,
        transform: `translateY(${y}px)`,
      }}
    >
      {children}
    </div>
  );
};

/** Nadtytul kursywa: sygnatura stylu ("caly montaz zajmuje", "a teraz"). */
export const Nadtytul: React.FC<{children: React.ReactNode; jasne?: boolean; opoznienie?: number}> = ({
  children,
  jasne,
  opoznienie = 0,
}) => {
  const frame = useCurrentFrame();
  const op = interpolate(frame - opoznienie, [0, 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div
      style={{
        fontFamily: CIEZKI,
        fontStyle: 'italic',
        fontSize: 34,
        fontWeight: 600,
        color: jasne ? 'rgba(40,40,40,0.6)' : 'rgba(255,255,255,0.72)',
        opacity: op,
        textAlign: 'center',
        marginBottom: 26,
      }}
    >
      {children}
    </div>
  );
};

/** Wielki podpis pod grafika: to, co widz ma zapamietac. */
export const Puenta: React.FC<{children: React.ReactNode; jasne?: boolean; opoznienie?: number}> = ({
  children,
  jasne,
  opoznienie = 0,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const w = spring({frame: frame - opoznienie, fps, config: {damping: 13, mass: 0.6}});
  return (
    <div
      style={{
        marginTop: 32,
        fontFamily: CIEZKI,
        fontSize: 60,
        fontWeight: 900,
        letterSpacing: -1,
        color: jasne ? '#22201D' : '#fff',
        textAlign: 'center',
        opacity: w,
        transform: `translateY(${interpolate(w, [0, 1], [26, 0])}px)`,
        textShadow: jasne ? 'none' : '0 10px 30px rgba(0,0,0,0.6)',
      }}
    >
      {children}
    </div>
  );
};

/* ============================ ruch ============================ */

/**
 * Wejscie elementu: z rozmycia, z przestrzeleniem skali i z dolu.
 * Zwraca komplet wartosci na jeden `style`. Uzywaj tego zamiast pisac wlasne
 * `opacity` od zera do jedynki: samo krycie wyglada jak slajd w prezentacji.
 */
export function wejscie(frame: number, fps: number, opoznienie = 0) {
  const w = spring({frame: frame - opoznienie, fps, config: {damping: 12, mass: 0.6, stiffness: 175}});
  return {
    krycie: w,
    skala: interpolate(w, [0, 1], [0.86, 1]),
    przesun: interpolate(w, [0, 1], [52, 0]),
    rozmycie: interpolate(w, [0, 0.55], [15, 0], {extrapolateRight: 'clamp'}),
  };
}

/** Zjazd na ostatnich klatkach. Mnoz przez `krycie` z `wejscie()`. */
export function wyjscie(frame: number, durationInFrames: number, klatek = 10) {
  return interpolate(frame, [durationInFrames - klatek, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

/**
 * Kadr sceny pelnoekranowej: tresc w gornej czesci, bo pod spodem leca napisy
 * karaoke, ktorych NIC nie ma prawa zaslaniac.
 */
export const KadrSceny: React.FC<{jasne?: boolean; children: React.ReactNode; logo?: boolean}> = ({
  jasne,
  children,
  logo = true,
}) => (
  <>
    {jasne ? <TloJasne /> : <TloCiemne />}
    {logo ? <BrandBug jasne={jasne} /> : null}
    <AbsoluteFill
      style={{justifyContent: 'center', alignItems: 'center', padding: 60, paddingBottom: 540}}
    >
      {children}
    </AbsoluteFill>
  </>
);

/**
 * Kadr nakladki: tresc siedzi tuz nad napisami, na wysokosci klatki piersiowej.
 * Nakladka NIE zaslania mowiacego i to jest jej caly sens: w rolce ma sie dziac
 * cos NA nagraniu, a nie zamiast niego.
 */
export const KadrNakladki: React.FC<{children: React.ReactNode}> = ({children}) => (
  <AbsoluteFill
    style={{
      justifyContent: 'flex-end',
      alignItems: 'center',
      paddingLeft: 60,
      paddingRight: 60,
      paddingBottom: 10,
    }}
  >
    {children}
  </AbsoluteFill>
);
