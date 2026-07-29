import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Easing} from 'remotion';

/**
 * Biblioteka Premium.
 *
 * Czesc pierwsza to techniki, ktore skill podstawowy wymienia jako "warto
 * wyprobowac" po analizie 5 cudzych rolek, ale nie mial ich gotowych.
 * Czesc druga to popularne efekty z sieci (glitch, scramble, marker, licznik
 * pieniedzy, maszyna do pisania, wybuch emoji).
 *
 * Wszystko parametryzowane przez propsy, wiec ta sama kompozycja obsluguje
 * wiele momentow bez pisania nowego komponentu za kazdym razem.
 */

const ORANGE = '#FF4D2D';
const AMBER = '#FFB13D';
const GREEN = '#5CCB6A';
const SANS = "Montserrat, 'Segoe UI', Arial, sans-serif";
const MONO = "Consolas, 'Courier New', monospace";

/* ============================================================
   1. Etykieta rozdzialu w rogu: "01 / PROBLEM"
   ============================================================ */
export const ChapterLabel: React.FC<{numer?: string; tytul?: string; kolor?: string}> = ({
  numer = '01',
  tytul = 'PROBLEM',
  kolor = ORANGE,
}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const wjazd = spring({frame, fps, config: {damping: 200}});
  const wyjazd = interpolate(frame, [durationInFrames - 12, durationInFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const x = interpolate(wjazd, [0, 1], [-260, 0]) + interpolate(wyjazd, [0, 1], [0, -260]);

  return (
    <AbsoluteFill style={{padding: 54}}>
      <div
        style={{
          transform: `translateX(${x}px)`,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 14,
          alignSelf: 'flex-start',
          padding: '12px 22px',
          borderRadius: 999,
          background: 'rgba(11,15,22,.82)',
          border: `2px solid ${kolor}`,
          backdropFilter: 'blur(6px)',
        }}
      >
        <span style={{fontFamily: MONO, fontSize: 34, fontWeight: 700, color: kolor}}>{numer}</span>
        <span style={{width: 2, height: 26, background: 'rgba(255,255,255,.28)'}} />
        <span style={{fontFamily: SANS, fontSize: 30, fontWeight: 800, color: '#fff', letterSpacing: 1}}>
          {tytul}
        </span>
      </div>
    </AbsoluteFill>
  );
};

/* ============================================================
   2. Kilka liczb rosnacych rownolegle
   ============================================================ */
export const MultiCountUp: React.FC<{
  pozycje?: {etykieta: string; do: number; prefiks?: string; sufiks?: string}[];
}> = ({
  pozycje = [
    {etykieta: 'ROLKI', do: 40, sufiks: '/mies'},
    {etykieta: 'CZAS', do: 4, sufiks: 'min'},
    {etykieta: 'KOSZT', do: 0, prefiks: '', sufiks: ' zl'},
  ],
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', gap: 46}}>
      {pozycje.map((p, i) => {
        const start = i * 8;
        const post = spring({frame: frame - start, fps, config: {damping: 200, mass: 0.7}});
        const wartosc = Math.round(interpolate(post, [0, 1], [0, p.do]));
        return (
          <div key={i} style={{textAlign: 'center', opacity: post}}>
            <div
              style={{
                fontFamily: SANS,
                fontSize: 26,
                fontWeight: 800,
                letterSpacing: 3,
                color: 'rgba(255,255,255,.55)',
              }}
            >
              {p.etykieta}
            </div>
            <div
              style={{
                fontFamily: SANS,
                fontSize: 128,
                fontWeight: 900,
                lineHeight: 1,
                background: `linear-gradient(150deg, ${AMBER}, ${ORANGE})`,
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {p.prefiks || ''}
              {wartosc}
              <span style={{fontSize: 52}}>{p.sufiks || ''}</span>
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/* ============================================================
   3. Diagonalny blysk po nieruchomym zrzucie ekranu
   ============================================================ */
export const LightSweep: React.FC<{kat?: number; szerokosc?: number}> = ({
  kat = 22,
  szerokosc = 420,
}) => {
  const frame = useCurrentFrame();
  const {durationInFrames, width} = useVideoConfig();
  const x = interpolate(frame, [0, durationInFrames], [-szerokosc * 2, width + szerokosc], {
    easing: Easing.inOut(Easing.ease),
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <div
        style={{
          position: 'absolute',
          top: '-30%',
          left: x,
          width: szerokosc,
          height: '160%',
          transform: `rotate(${kat}deg)`,
          background:
            'linear-gradient(90deg, transparent, rgba(255,255,255,.02) 20%, rgba(255,255,255,.22) 50%, rgba(255,255,255,.02) 80%, transparent)',
          filter: 'blur(6px)',
        }}
      />
    </AbsoluteFill>
  );
};

/* ============================================================
   4. Plakietka zmieniajaca kolor: neutralny -> cieply (kontekst -> CTA)
   ============================================================ */
export const BadgeDwaKolory: React.FC<{tekst?: string; przelacz?: number}> = ({
  tekst = 'ZOBACZ JAK',
  przelacz = 0.6,
}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const wjazd = spring({frame, fps, config: {damping: 14, mass: 0.6}});
  const punkt = durationInFrames * przelacz;
  const mieszanie = interpolate(frame, [punkt, punkt + 14], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
      <div
        style={{
          transform: `scale(${wjazd})`,
          padding: '20px 44px',
          borderRadius: 999,
          fontFamily: SANS,
          fontSize: 52,
          fontWeight: 900,
          letterSpacing: 1,
          color: mieszanie > 0.5 ? '#160604' : '#dfe8f2',
          background:
            mieszanie > 0.5
              ? `linear-gradient(150deg, ${AMBER}, ${ORANGE})`
              : 'rgba(255,255,255,.10)',
          border: mieszanie > 0.5 ? 'none' : '2px solid rgba(255,255,255,.28)',
          boxShadow: mieszanie > 0.5 ? `0 18px 50px ${ORANGE}66` : 'none',
        }}
      >
        {tekst}
      </div>
    </AbsoluteFill>
  );
};

/* ============================================================
   5. Karta przeskoku czasu: "20 MINUT POZNIEJ"
   ============================================================ */
export const KartaCzasu: React.FC<{tekst?: string}> = ({tekst = '20 MINUT POZNIEJ'}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const wejscie = interpolate(frame, [0, 8], [0, 1], {extrapolateRight: 'clamp'});
  const wyjscie = interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
  });
  const krycie = Math.min(wejscie, wyjscie);

  return (
    <AbsoluteFill style={{backgroundColor: `rgba(4,6,10,${krycie * 0.96})`}}>
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
        <div
          style={{
            opacity: krycie,
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontStyle: 'italic',
            fontSize: 96,
            fontWeight: 700,
            color: '#f4e9dd',
            textAlign: 'center',
            letterSpacing: 2,
          }}
        >
          {tekst}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ============================================================
   6. Strzalka-wskaznik (zamiast kolorowej ramki)
   ============================================================ */
export const StrzalkaWskaznik: React.FC<{
  x?: number;
  y?: number;
  obrot?: number;
  podpis?: string;
}> = ({x = 540, y = 900, obrot = -35, podpis = 'TU'}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const post = spring({frame, fps, config: {damping: 12, mass: 0.5}});
  const drgania = Math.sin(frame / 6) * 8;

  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          left: x,
          top: y + drgania,
          transform: `rotate(${obrot}deg) scale(${post})`,
          transformOrigin: 'left center',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <svg width="190" height="70" viewBox="0 0 190 70">
          <path
            d="M8 35 C 60 8, 120 8, 168 32"
            stroke={AMBER}
            strokeWidth="9"
            fill="none"
            strokeLinecap="round"
            strokeDasharray="260"
            strokeDashoffset={interpolate(post, [0, 1], [260, 0])}
          />
          <path d="M168 32 L 146 18 M168 32 L 144 44" stroke={AMBER} strokeWidth="9" fill="none" strokeLinecap="round" />
        </svg>
        {podpis ? (
          <span
            style={{
              fontFamily: SANS,
              fontSize: 44,
              fontWeight: 900,
              color: AMBER,
              transform: `rotate(${-obrot}deg)`,
            }}
          >
            {podpis}
          </span>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

/* ============================================================
   7. Glitch: rozjazd kanalow RGB
   ============================================================ */
export const GlitchText: React.FC<{tekst?: string; sila?: number}> = ({
  tekst = 'STOP',
  sila = 14,
}) => {
  const frame = useCurrentFrame();
  const skok = Math.sin(frame * 12.9898) * 43758.5453;
  const los = skok - Math.floor(skok);
  const czyGlitch = los > 0.55;
  const dx = czyGlitch ? (los - 0.5) * sila * 2 : 0;

  // Rozmiar dobierany do dlugosci, zeby dluzsze slowo nie wyjechalo poza kadr.
  const fs = Math.min(168, Math.round(940 / Math.max(1, tekst.length * 0.62)));

  const wspolne: React.CSSProperties = {
    fontFamily: SANS,
    fontSize: fs,
    fontWeight: 900,
    letterSpacing: -2,
    whiteSpace: 'nowrap',
    lineHeight: 1.1,
  };
  // Kopie kolorowe leza NA bialym napisie. Bialy zostaje w normalnym przeplywie,
  // bo inaczej rodzic ma zerowa szerokosc i calosc ucieka w prawo.
  const kopia: React.CSSProperties = {...wspolne, position: 'absolute', top: 0, left: 0};

  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
      <div style={{position: 'relative', display: 'inline-block'}}>
        <div style={{...kopia, color: '#ff2d55', transform: `translate(${-dx}px, ${dx / 3}px)`, mixBlendMode: 'screen'}}>
          {tekst}
        </div>
        <div style={{...kopia, color: '#2dffea', transform: `translate(${dx}px, ${-dx / 3}px)`, mixBlendMode: 'screen'}}>
          {tekst}
        </div>
        <div style={{...wspolne, color: '#fff', position: 'relative'}}>{tekst}</div>
      </div>
    </AbsoluteFill>
  );
};

/* ============================================================
   8. Scramble: tekst "deszyfrowany" znak po znaku
   ============================================================ */
export const ScrambleText: React.FC<{tekst?: string; kolor?: string}> = ({
  tekst = 'GOTOWE',
  kolor = GREEN,
}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const znaki = 'ABCDEFGHIJKLMNOPRSTUWXYZ0123456789#@%&';
  const postep = interpolate(frame, [0, durationInFrames * 0.65], [0, tekst.length], {
    extrapolateRight: 'clamp',
  });

  const wynik = tekst
    .split('')
    .map((z, i) => {
      if (i < Math.floor(postep)) return z;
      if (z === ' ') return ' ';
      const idx = Math.floor(Math.abs(Math.sin((frame + i * 7) * 1.3)) * znaki.length) % znaki.length;
      return znaki[idx];
    })
    .join('');

  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
      <div
        style={{
          fontFamily: MONO,
          fontSize: 118,
          fontWeight: 700,
          color: kolor,
          letterSpacing: 6,
          textShadow: `0 0 40px ${kolor}66`,
        }}
      >
        {wynik}
      </div>
    </AbsoluteFill>
  );
};

/* ============================================================
   9. Podkreslenie markerem (przejezdza pod tekstem)
   ============================================================ */
export const MarkerHighlight: React.FC<{tekst?: string; kolor?: string}> = ({
  tekst = 'TO JEST WAZNE',
  kolor = AMBER,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const post = spring({frame: frame - 6, fps, config: {damping: 200}});

  // Dluzsze haslo samo schodzi z rozmiarem, zeby zmiescic sie w kadrze.
  // Bez tego napis w rodzaju "POTRZEBUJA FACHOWCA" wychodzil poza oba brzegi.
  const fs = Math.min(92, Math.round(900 / Math.max(1, tekst.length * 0.6)));

  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', padding: '0 60px'}}>
      <div style={{position: 'relative', display: 'inline-block', padding: '0 20px', maxWidth: 960}}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: Math.round(fs * 0.12),
            height: Math.round(fs * 0.36),
            transformOrigin: 'left center',
            transform: `scaleX(${post})`,
            background: kolor,
            opacity: 0.55,
            borderRadius: 6,
            filter: 'blur(1px)',
          }}
        />
        <div
          style={{
            position: 'relative',
            fontFamily: SANS,
            fontSize: fs,
            fontWeight: 900,
            color: '#fff',
            textAlign: 'center',
            lineHeight: 1.15,
            textShadow: '0 4px 22px rgba(0,0,0,.55)',
          }}
        >
          {tekst}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ============================================================
   10. Licznik pieniedzy
   ============================================================ */
export const MoneyCounter: React.FC<{do?: number; waluta?: string; podpis?: string}> = ({
  do: doKwoty = 1500,
  waluta = 'zl',
  podpis = 'OSZCZEDZASZ',
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const post = spring({frame, fps, config: {damping: 200, mass: 1.2}});
  const kwota = Math.round(interpolate(post, [0, 1], [0, doKwoty]) / 10) * 10;
  const puls = 1 + Math.sin(frame / 5) * 0.012 * (1 - post);

  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
      <div style={{textAlign: 'center', transform: `scale(${puls})`}}>
        <div
          style={{
            fontFamily: SANS,
            fontSize: 30,
            fontWeight: 800,
            letterSpacing: 4,
            color: 'rgba(255,255,255,.55)',
            marginBottom: 10,
          }}
        >
          {podpis}
        </div>
        <div
          style={{
            fontFamily: SANS,
            fontSize: 172,
            fontWeight: 900,
            lineHeight: 1,
            color: GREEN,
            textShadow: `0 0 60px ${GREEN}55`,
          }}
        >
          {kwota.toLocaleString('pl-PL')}
          <span style={{fontSize: 76, marginLeft: 10}}>{waluta}</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ============================================================
   11. Maszyna do pisania (np. prompt wpisywany do AI)
   ============================================================ */
export const TypewriterCard: React.FC<{tekst?: string; tytul?: string}> = ({
  tekst = 'zmontuj mi z tego rolke w moim stylu',
  tytul = 'TY DO AI',
}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const znakow = Math.floor(
    interpolate(frame, [6, durationInFrames * 0.8], [0, tekst.length], {extrapolateRight: 'clamp'})
  );
  const kursor = Math.floor(frame / 15) % 2 === 0;

  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', padding: 60}}>
      <div
        style={{
          width: '100%',
          padding: 38,
          borderRadius: 26,
          background: 'rgba(14,22,34,.94)',
          border: '1px solid rgba(255,255,255,.14)',
          boxShadow: '0 40px 90px rgba(0,0,0,.6)',
        }}
      >
        <div
          style={{
            fontFamily: SANS,
            fontSize: 24,
            fontWeight: 800,
            letterSpacing: 3,
            color: ORANGE,
            marginBottom: 18,
          }}
        >
          {tytul}
        </div>
        <div style={{fontFamily: MONO, fontSize: 46, lineHeight: 1.45, color: '#eef3f9'}}>
          {tekst.slice(0, znakow)}
          <span style={{opacity: kursor ? 1 : 0, color: ORANGE}}>|</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ============================================================
   12. Wybuch emoji (reakcje)
   ============================================================ */
export const EmojiBurst: React.FC<{emoji?: string[]; ilosc?: number}> = ({
  emoji = ['🔥', '💰', '🤯', '✅', '⚡'],
  ilosc = 18,
}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();

  return (
    <AbsoluteFill>
      {Array.from({length: ilosc}).map((_, i) => {
        const kat = (i / ilosc) * Math.PI * 2;
        const opoznienie = (i % 5) * 2;
        const post = spring({
          frame: frame - opoznienie,
          fps,
          config: {damping: 18, mass: 0.8},
        });
        const promien = interpolate(post, [0, 1], [0, 380 + (i % 4) * 90]);
        const x = width / 2 + Math.cos(kat) * promien;
        const y = height / 2 + Math.sin(kat) * promien * 0.75;
        const krycie = interpolate(post, [0, 0.7, 1], [0, 1, 0]);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              fontSize: 64 + (i % 3) * 18,
              opacity: krycie,
              transform: `translate(-50%,-50%) rotate(${post * 180 * (i % 2 ? 1 : -1)}deg)`,
            }}
          >
            {emoji[i % emoji.length]}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
