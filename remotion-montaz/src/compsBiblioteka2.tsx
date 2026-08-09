import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Easing} from 'remotion';

/**
 * Biblioteka 2 — efekty dobierane automatycznie przez narzedzie plan-efektow.
 *
 * ZASADY, ktore trzymaja te komponenty spojne ze stylem:
 *  - wszystko jest sterowane propsami, wiec jedna kompozycja obsluguje dowolna
 *    liczbe momentow w rolce i nie trzeba pisac nowego komponentu za kazdym razem,
 *  - kazdy element WJEZDZA i WYJEZDZA (nic nie pojawia sie i nie znika skokowo),
 *  - kazdy element ma prop `pozycja`, a domyslnie siedzi w dolnej czesci kadru,
 *    zeby nigdy nie wyladowac na twarzy,
 *  - tlo jest przezroczyste, wiec kompozycje renderuje sie z kanalem alfa
 *    i naklada na nagranie.
 */

const ORANGE = '#FF4D2D';
const AMBER = '#FFB13D';
const GREEN = '#5CCB6A';
const RED = '#FF3B30';
const INK = 'rgba(11,15,22,.88)';
const SANS = "Montserrat, 'Segoe UI', Arial, sans-serif";
const MONO = "Consolas, 'Courier New', monospace";

type Pozycja = 'gora' | 'srodek' | 'dol' | 'naNapisach';

/**
 * Wspolne ustawienie kadru. Geometria jest dobrana pod napisy karaoke, ktore
 * siedza 520 px od dolu (wysokosc szyi):
 *   'dol'        -> NAD napisami, na wysokosci klatki piersiowej. Tu ida karty,
 *                   listy, badge i mockupy, zeby nie zaslanialy napisow.
 *   'naNapisach' -> dokladnie na wysokosci napisow. Tu ida wielkie napisy-slamy,
 *                   ktore ZASTEPUJA napis, a nie go zaslaniaja. Narzedzie
 *                   plan-efektow wycina wtedy napisy na czas efektu.
 *   'srodek'     -> pelnoekranowe interludium.
 *   'gora'       -> etykieta nad kadrem.
 */
const ramka = (pozycja: Pozycja): React.CSSProperties => ({
  justifyContent: pozycja === 'gora' ? 'flex-start' : pozycja === 'srodek' ? 'center' : 'flex-end',
  alignItems: 'center',
  paddingTop: pozycja === 'gora' ? 220 : 0,
  paddingBottom: pozycja === 'dol' ? 720 : pozycja === 'naNapisach' ? 420 : 0,
  paddingLeft: 60,
  paddingRight: 60,
});

/** Wjazd sprezynka + wyjazd na koncu kompozycji. Zwraca 0..1 i przesuniecie. */
function wjazdWyjazd(frame: number, fps: number, durationInFrames: number, klatekWyjscia = 12) {
  const wjazd = spring({frame, fps, config: {damping: 14, mass: 0.6, stiffness: 140}});
  const wyjazd = interpolate(frame, [durationInFrames - klatekWyjscia, durationInFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return {wjazd, wyjazd, widocznosc: wjazd * (1 - wyjazd)};
}

/* ============================================================
   1. Slam: jedno slowo wpada z impetem i lekko drga
   ============================================================ */
export const SlamSlowo: React.FC<{tekst?: string; kolor?: string; pozycja?: Pozycja}> = ({
  tekst = 'BEZ KOMBINOWANIA',
  kolor = ORANGE,
  pozycja = 'naNapisach',
}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const {wjazd, wyjazd} = wjazdWyjazd(frame, fps, durationInFrames, 10);
  const skala = interpolate(wjazd, [0, 1], [2.4, 1]);
  // drganie tuz po wejsciu, wygasajace
  const drganie = frame < 18 ? Math.sin(frame * 1.9) * (1 - frame / 18) * 9 : 0;

  return (
    <AbsoluteFill style={ramka(pozycja)}>
      <div
        style={{
          transform: `scale(${skala * (1 - wyjazd * 0.25)}) translateX(${drganie}px)`,
          opacity: interpolate(wjazd, [0, 0.4], [0, 1]) * (1 - wyjazd),
          fontFamily: SANS,
          fontSize: 104,
          fontWeight: 900,
          color: '#fff',
          textAlign: 'center',
          lineHeight: 1,
          letterSpacing: -2,
          textShadow: `0 10px 40px rgba(0,0,0,.6)`,
          WebkitTextStroke: `3px ${kolor}`,
        }}
      >
        {tekst}
      </div>
    </AbsoluteFill>
  );
};

/* ============================================================
   2. Lista z odhaczaniem: punkty pojawiaja sie po kolei
   ============================================================ */
export const ListaCheck: React.FC<{punkty?: string[]; kolor?: string; pozycja?: Pozycja}> = ({
  punkty = ['NAGRYWASZ', 'WRZUCASZ PLIK', 'GOTOWE'],
  kolor = GREEN,
  pozycja = 'dol',
}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const {wyjazd} = wjazdWyjazd(frame, fps, durationInFrames, 12);

  return (
    <AbsoluteFill style={{...ramka(pozycja), opacity: 1 - wyjazd}}>
      <div style={{display: 'flex', flexDirection: 'column', gap: 20, width: '100%'}}>
        {punkty.map((p, i) => {
          const start = i * 9;
          const s = spring({frame: frame - start, fps, config: {damping: 16, mass: 0.5}});
          return (
            <div
              key={i}
              style={{
                transform: `translateX(${interpolate(s, [0, 1], [-90, 0])}px)`,
                opacity: s,
                display: 'flex',
                alignItems: 'center',
                gap: 20,
                background: INK,
                borderRadius: 20,
                padding: '20px 28px',
                borderLeft: `8px solid ${kolor}`,
              }}
            >
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 999,
                  background: kolor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 30,
                  fontWeight: 900,
                  color: '#0B0F16',
                  flexShrink: 0,
                }}
              >
                ✓
              </div>
              <span style={{fontFamily: SANS, fontSize: 46, fontWeight: 800, color: '#fff'}}>{p}</span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* ============================================================
   3. Przekreslenie: to, co odpada
   ============================================================ */
export const Przekreslenie: React.FC<{tekst?: string; kolor?: string; pozycja?: Pozycja}> = ({
  tekst = 'DROGI MONTAŻYSTA',
  kolor = RED,
  pozycja = 'naNapisach',
}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const {wjazd, wyjazd} = wjazdWyjazd(frame, fps, durationInFrames, 10);
  const kreska = interpolate(frame, [8, 22], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  return (
    <AbsoluteFill style={{...ramka(pozycja), opacity: (1 - wyjazd) * interpolate(wjazd, [0, 0.3], [0, 1])}}>
      <div style={{position: 'relative', display: 'inline-block'}}>
        <span
          style={{
            fontFamily: SANS,
            fontSize: 78,
            fontWeight: 900,
            color: '#fff',
            opacity: interpolate(kreska, [0, 1], [1, 0.55]),
            textShadow: '0 8px 30px rgba(0,0,0,.65)',
          }}
        >
          {tekst}
        </span>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: '52%',
            height: 12,
            width: `${kreska * 100}%`,
            background: kolor,
            borderRadius: 8,
            transform: 'rotate(-2.5deg)',
            boxShadow: `0 0 22px ${kolor}`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

/* ============================================================
   4. Karta wyniku: jedna liczba, ktora ma zostac w glowie
   ============================================================ */
export const KartaWyniku: React.FC<{
  liczba?: string;
  podpis?: string;
  kolor?: string;
  pozycja?: Pozycja;
}> = ({liczba = '24 ZŁ', podpis = 'KOSZT JEDNEGO LEADA', kolor = AMBER, pozycja = 'dol'}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const {wjazd, wyjazd} = wjazdWyjazd(frame, fps, durationInFrames, 12);

  return (
    <AbsoluteFill style={ramka(pozycja)}>
      <div
        style={{
          transform: `translateY(${interpolate(wjazd, [0, 1], [120, 0]) + wyjazd * 90}px) scale(${interpolate(
            wjazd,
            [0, 1],
            [0.85, 1]
          )})`,
          opacity: interpolate(wjazd, [0, 0.35], [0, 1]) * (1 - wyjazd),
          background: INK,
          border: `3px solid ${kolor}`,
          borderRadius: 30,
          padding: '34px 52px',
          textAlign: 'center',
          boxShadow: '0 24px 70px rgba(0,0,0,.55)',
        }}
      >
        <div style={{fontFamily: SANS, fontSize: 128, fontWeight: 900, color: kolor, lineHeight: 1}}>
          {liczba}
        </div>
        <div
          style={{
            fontFamily: SANS,
            fontSize: 34,
            fontWeight: 800,
            color: 'rgba(255,255,255,.9)',
            letterSpacing: 2,
            marginTop: 10,
          }}
        >
          {podpis}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ============================================================
   5. Zakreslenie odreczne: kolo wokol slowa
   ============================================================ */
export const KoloZakreslenie: React.FC<{tekst?: string; kolor?: string; pozycja?: Pozycja}> = ({
  tekst = 'DARMOWE',
  kolor = ORANGE,
  pozycja = 'naNapisach',
}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const rysowanie = interpolate(frame, [4, 26], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const wyjazd = interpolate(frame, [durationInFrames - 10, durationInFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const obwod = 2 * Math.PI * 150;

  return (
    <AbsoluteFill style={{...ramka(pozycja), opacity: 1 - wyjazd}}>
      <div style={{position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <svg width={760} height={330} style={{position: 'absolute', overflow: 'visible'}}>
          <ellipse
            cx={380}
            cy={165}
            rx={330}
            ry={140}
            fill="none"
            stroke={kolor}
            strokeWidth={12}
            strokeLinecap="round"
            strokeDasharray={obwod * 2}
            strokeDashoffset={obwod * 2 * (1 - rysowanie)}
            transform="rotate(-4 380 165)"
            style={{filter: `drop-shadow(0 0 14px ${kolor})`}}
          />
        </svg>
        <span
          style={{
            fontFamily: SANS,
            fontSize: 92,
            fontWeight: 900,
            color: '#fff',
            textShadow: '0 8px 30px rgba(0,0,0,.7)',
          }}
        >
          {tekst}
        </span>
      </div>
    </AbsoluteFill>
  );
};

/* ============================================================
   6. Dwie kolumny: tak kontra nie
   ============================================================ */
export const DwieKolumny: React.FC<{
  zle?: string;
  dobre?: string;
  etykietaZla?: string;
  etykietaDobra?: string;
}> = ({zle = '3 GODZINY', dobre = '4 MINUTY', etykietaZla = 'RĘCZNIE', etykietaDobra = 'Z AI'}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const l = spring({frame, fps, config: {damping: 15, mass: 0.6}});
  const p = spring({frame: frame - 7, fps, config: {damping: 15, mass: 0.6}});
  const wyjazd = interpolate(frame, [durationInFrames - 12, durationInFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const kolumna = (
    etykieta: string,
    wartosc: string,
    kolor: string,
    s: number,
    zLewej: boolean
  ): React.CSSProperties => ({
    flex: 1,
    background: INK,
    border: `3px solid ${kolor}`,
    borderRadius: 26,
    padding: '26px 18px',
    textAlign: 'center',
    transform: `translateX(${interpolate(s, [0, 1], [zLewej ? -260 : 260, 0])}px)`,
    opacity: s,
  });

  return (
    <AbsoluteFill style={{...ramka('dol'), opacity: 1 - wyjazd}}>
      <div style={{display: 'flex', gap: 22, width: '100%', alignItems: 'stretch'}}>
        <div style={kolumna(etykietaZla, zle, RED, l, true)}>
          <div style={{fontFamily: SANS, fontSize: 30, fontWeight: 800, color: RED, letterSpacing: 2}}>
            {etykietaZla}
          </div>
          <div style={{fontFamily: SANS, fontSize: 68, fontWeight: 900, color: '#fff', marginTop: 8}}>
            {zle}
          </div>
        </div>
        <div style={kolumna(etykietaDobra, dobre, GREEN, p, false)}>
          <div style={{fontFamily: SANS, fontSize: 30, fontWeight: 800, color: GREEN, letterSpacing: 2}}>
            {etykietaDobra}
          </div>
          <div style={{fontFamily: SANS, fontSize: 68, fontWeight: 900, color: '#fff', marginTop: 8}}>
            {dobre}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ============================================================
   7. Komentarz pod rolka (mockup) — pod CTA
   ============================================================ */
export const DymekKomentarza: React.FC<{nick?: string; tresc?: string; pozycja?: Pozycja}> = ({
  nick = 'karol.hvac',
  tresc = 'MONTAŻ',
  pozycja = 'dol',
}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const {wjazd, wyjazd} = wjazdWyjazd(frame, fps, durationInFrames, 12);
  const serce = spring({frame: frame - 26, fps, config: {damping: 9, mass: 0.4}});

  return (
    <AbsoluteFill style={ramka(pozycja)}>
      <div
        style={{
          width: '100%',
          transform: `translateY(${interpolate(wjazd, [0, 1], [150, 0]) + wyjazd * 120}px)`,
          opacity: interpolate(wjazd, [0, 0.3], [0, 1]) * (1 - wyjazd),
          background: 'rgba(255,255,255,.97)',
          borderRadius: 26,
          padding: '22px 26px',
          display: 'flex',
          gap: 18,
          alignItems: 'center',
          boxShadow: '0 20px 60px rgba(0,0,0,.5)',
        }}
      >
        <div
          style={{
            width: 66,
            height: 66,
            borderRadius: 999,
            background: `linear-gradient(135deg,${ORANGE},${AMBER})`,
            flexShrink: 0,
          }}
        />
        <div style={{flex: 1}}>
          <div style={{fontFamily: SANS, fontSize: 26, fontWeight: 700, color: '#6B7280'}}>{nick}</div>
          <div style={{fontFamily: SANS, fontSize: 44, fontWeight: 900, color: '#0B0F16', marginTop: 2}}>
            {tresc}
          </div>
        </div>
        <div style={{fontSize: 44, transform: `scale(${0.4 + serce * 0.6})`, opacity: serce}}>❤️</div>
      </div>
    </AbsoluteFill>
  );
};

/* ============================================================
   8. Pasek postepu z etapami
   ============================================================ */
export const PasekEtapow: React.FC<{etapy?: string[]; kolor?: string}> = ({
  etapy = ['NAGRANIE', 'MONTAŻ', 'PUBLIKACJA'],
  kolor = ORANGE,
}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const postep = interpolate(frame, [6, durationInFrames - 16], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.cubic),
  });
  const wyjazd = interpolate(frame, [durationInFrames - 10, durationInFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{...ramka('dol'), opacity: 1 - wyjazd}}>
      <div style={{width: '100%'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 16}}>
          {etapy.map((e, i) => {
            const aktywny = postep >= i / Math.max(1, etapy.length - 1) - 0.02;
            return (
              <span
                key={i}
                style={{
                  fontFamily: SANS,
                  fontSize: 30,
                  fontWeight: 800,
                  color: aktywny ? '#fff' : 'rgba(255,255,255,.45)',
                  textShadow: '0 4px 18px rgba(0,0,0,.8)',
                }}
              >
                {e}
              </span>
            );
          })}
        </div>
        <div style={{height: 18, borderRadius: 999, background: 'rgba(255,255,255,.22)', overflow: 'hidden'}}>
          <div
            style={{
              height: '100%',
              width: `${postep * 100}%`,
              background: `linear-gradient(90deg,${ORANGE},${AMBER})`,
              boxShadow: `0 0 20px ${kolor}`,
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ============================================================
   9. Stempel: wbijana pieczatka
   ============================================================ */
export const Stempel: React.FC<{tekst?: string; kolor?: string; pozycja?: Pozycja}> = ({
  tekst = 'FAKT',
  kolor = GREEN,
  pozycja = 'naNapisach',
}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const wbicie = interpolate(frame, [0, 7], [3.2, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const odbicie = frame >= 7 && frame < 16 ? 1 + Math.sin((frame - 7) * 0.7) * 0.05 : 1;
  const wyjazd = interpolate(frame, [durationInFrames - 8, durationInFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{...ramka(pozycja), opacity: 1 - wyjazd}}>
      <div
        style={{
          transform: `scale(${wbicie * odbicie}) rotate(-7deg)`,
          border: `9px solid ${kolor}`,
          borderRadius: 18,
          padding: '16px 40px',
          fontFamily: SANS,
          fontSize: 88,
          fontWeight: 900,
          color: kolor,
          letterSpacing: 4,
          background: 'rgba(11,15,22,.55)',
          boxShadow: `0 0 40px ${kolor}55`,
        }}
      >
        {tekst}
      </div>
    </AbsoluteFill>
  );
};

/* ============================================================
   10. Wielka cyfra kroku
   ============================================================ */
export const CyfraKroku: React.FC<{numer?: string; opis?: string; kolor?: string}> = ({
  numer = '1',
  opis = 'WRZUCASZ NAGRANIE',
  kolor = ORANGE,
}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const {wjazd, wyjazd} = wjazdWyjazd(frame, fps, durationInFrames, 10);

  return (
    <AbsoluteFill style={ramka('dol')}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 26,
          opacity: interpolate(wjazd, [0, 0.3], [0, 1]) * (1 - wyjazd),
          transform: `translateX(${interpolate(wjazd, [0, 1], [-140, 0]) + wyjazd * 100}px)`,
        }}
      >
        <div
          style={{
            fontFamily: SANS,
            fontSize: 190,
            fontWeight: 900,
            color: 'transparent',
            WebkitTextStroke: `6px ${kolor}`,
            lineHeight: 0.85,
          }}
        >
          {numer}
        </div>
        <div
          style={{
            fontFamily: SANS,
            fontSize: 54,
            fontWeight: 900,
            color: '#fff',
            maxWidth: 640,
            textShadow: '0 8px 26px rgba(0,0,0,.7)',
          }}
        >
          {opis}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ============================================================
   11. Podkreslenie odreczne pod slowem
   ============================================================ */
export const PodkreslenieReczne: React.FC<{tekst?: string; kolor?: string; pozycja?: Pozycja}> = ({
  tekst = 'JEDNA KOMENDA',
  kolor = AMBER,
  pozycja = 'naNapisach',
}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const {wjazd, wyjazd} = wjazdWyjazd(frame, fps, durationInFrames, 10);
  const rysowanie = interpolate(frame, [7, 24], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.quad),
  });

  return (
    <AbsoluteFill style={{...ramka(pozycja), opacity: (1 - wyjazd) * interpolate(wjazd, [0, 0.3], [0, 1])}}>
      <div style={{position: 'relative', display: 'inline-block', paddingBottom: 34}}>
        <span
          style={{
            fontFamily: SANS,
            fontSize: 88,
            fontWeight: 900,
            color: '#fff',
            textShadow: '0 8px 30px rgba(0,0,0,.7)',
          }}
        >
          {tekst}
        </span>
        <svg
          width="100%"
          height={40}
          viewBox="0 0 600 40"
          preserveAspectRatio="none"
          style={{position: 'absolute', left: 0, bottom: 0}}
        >
          <path
            d="M6 26 C 140 8, 320 34, 594 14"
            fill="none"
            stroke={kolor}
            strokeWidth={12}
            strokeLinecap="round"
            strokeDasharray={700}
            strokeDashoffset={700 * (1 - rysowanie)}
            style={{filter: `drop-shadow(0 0 12px ${kolor})`}}
          />
        </svg>
      </div>
    </AbsoluteFill>
  );
};

/* ============================================================
   12. Pytanie i odpowiedz jedno po drugim
   ============================================================ */
export const PytanieOdpowiedz: React.FC<{pytanie?: string; odpowiedz?: string; kolor?: string}> = ({
  pytanie = 'ILE TO ZAJMUJE?',
  odpowiedz = '4 MINUTY',
  kolor = ORANGE,
}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const p = spring({frame, fps, config: {damping: 16, mass: 0.6}});
  const o = spring({frame: frame - 22, fps, config: {damping: 11, mass: 0.5}});
  const wyjazd = interpolate(frame, [durationInFrames - 10, durationInFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{...ramka('dol'), opacity: 1 - wyjazd}}>
      <div style={{textAlign: 'center', width: '100%'}}>
        <div
          style={{
            fontFamily: SANS,
            fontSize: 52,
            fontWeight: 800,
            color: 'rgba(255,255,255,.85)',
            opacity: p,
            transform: `translateY(${interpolate(p, [0, 1], [40, 0])}px)`,
            textShadow: '0 6px 22px rgba(0,0,0,.8)',
          }}
        >
          {pytanie}
        </div>
        <div
          style={{
            fontFamily: SANS,
            fontSize: 116,
            fontWeight: 900,
            color: kolor,
            marginTop: 14,
            opacity: o,
            transform: `scale(${interpolate(o, [0, 1], [0.5, 1])})`,
            textShadow: '0 10px 34px rgba(0,0,0,.7)',
          }}
        >
          {odpowiedz}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ============================================================
   13. Pasek przewijajacy sie u dolu (ticker)
   ============================================================ */
export const Ticker: React.FC<{tekst?: string; kolor?: string}> = ({
  tekst = 'MONTAŻ Z AI • BEZ KOMBINOWANIA • ',
  kolor = ORANGE,
}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const przesuniecie = (frame * 4) % 1200;
  const wjazd = interpolate(frame, [0, 10], [0, 1], {extrapolateRight: 'clamp'});
  const wyjazd = interpolate(frame, [durationInFrames - 10, durationInFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const powtorzony = tekst.repeat(6);

  return (
    <AbsoluteFill style={{justifyContent: 'flex-end', paddingBottom: 300, opacity: wjazd * (1 - wyjazd)}}>
      <div
        style={{
          background: `linear-gradient(90deg,${ORANGE},${AMBER})`,
          padding: '14px 0',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          transform: `translateY(${wyjazd * 80}px)`,
        }}
      >
        <div
          style={{
            transform: `translateX(${-przesuniecie}px)`,
            fontFamily: SANS,
            fontSize: 42,
            fontWeight: 900,
            color: '#0B0F16',
            letterSpacing: 2,
          }}
        >
          {powtorzony}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ============================================================
   14. Odliczanie sekund
   ============================================================ */
export const Odliczanie: React.FC<{od?: number; podpis?: string; kolor?: string}> = ({
  od = 3,
  podpis = 'TYLE TO ZAJMUJE',
  kolor = AMBER,
}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const krok = Math.min(od - 1, Math.floor(frame / Math.max(1, Math.floor(durationInFrames / od))));
  const wartosc = Math.max(1, od - krok);
  const wSkoku = frame % Math.max(1, Math.floor(durationInFrames / od));
  const puls = wSkoku < 6 ? 1 + (6 - wSkoku) * 0.05 : 1;
  const wyjazd = interpolate(frame, [durationInFrames - 8, durationInFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{...ramka('dol'), opacity: 1 - wyjazd}}>
      <div style={{textAlign: 'center'}}>
        <div
          style={{
            fontFamily: MONO,
            fontSize: 200,
            fontWeight: 700,
            color: kolor,
            transform: `scale(${puls})`,
            lineHeight: 1,
            textShadow: `0 0 50px ${kolor}77`,
          }}
        >
          {wartosc}
        </div>
        <div
          style={{
            fontFamily: SANS,
            fontSize: 38,
            fontWeight: 800,
            color: '#fff',
            letterSpacing: 3,
            textShadow: '0 6px 20px rgba(0,0,0,.8)',
          }}
        >
          {podpis}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ============================================================
   15. Trzy ikony wjezdzajace po kolei
   ============================================================ */
export const TrzyIkony: React.FC<{
  pozycje?: {ikona: string; podpis: string}[];
  kolor?: string;
}> = ({
  pozycje = [
    {ikona: '🎬', podpis: 'MONTAŻ'},
    {ikona: '✍️', podpis: 'NAPISY'},
    {ikona: '🎵', podpis: 'MUZYKA'},
  ],
  kolor = ORANGE,
}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const wyjazd = interpolate(frame, [durationInFrames - 12, durationInFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{...ramka('dol'), opacity: 1 - wyjazd}}>
      <div style={{display: 'flex', gap: 24, justifyContent: 'center', width: '100%'}}>
        {pozycje.map((p, i) => {
          const s = spring({frame: frame - i * 8, fps, config: {damping: 12, mass: 0.5}});
          return (
            <div
              key={i}
              style={{
                flex: 1,
                background: INK,
                border: `3px solid ${kolor}`,
                borderRadius: 24,
                padding: '24px 10px',
                textAlign: 'center',
                transform: `translateY(${interpolate(s, [0, 1], [130, 0])}px) scale(${interpolate(
                  s,
                  [0, 1],
                  [0.8, 1]
                )})`,
                opacity: s,
              }}
            >
              <div style={{fontSize: 74, lineHeight: 1}}>{p.ikona}</div>
              <div
                style={{
                  fontFamily: SANS,
                  fontSize: 28,
                  fontWeight: 900,
                  color: '#fff',
                  marginTop: 10,
                  letterSpacing: 1,
                }}
              >
                {p.podpis}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* ============================================================
   16. Cytat na pelnym ekranie (interludium tekstowe)
   ============================================================ */
export const Cytat: React.FC<{tekst?: string; podpis?: string; kolor?: string}> = ({
  tekst = 'NIE MUSISZ TAŃCZYĆ, ŻEBY MIEĆ ZASIĘGI',
  podpis = '',
  kolor = AMBER,
}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const s = spring({frame, fps, config: {damping: 18, mass: 0.8}});
  const wyjazd = interpolate(frame, [durationInFrames - 14, durationInFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // ciemna zaslona, zeby tekst mial kontrast na dowolnym kadrze
  const zaslona = interpolate(frame, [0, 10], [0, 0.72], {extrapolateRight: 'clamp'}) * (1 - wyjazd);

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{background: `rgba(8,11,16,${zaslona})`}} />
      <AbsoluteFill style={{...ramka('srodek'), opacity: 1 - wyjazd}}>
        <div style={{textAlign: 'center'}}>
          <div
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontStyle: 'italic',
              fontSize: 82,
              fontWeight: 700,
              color: '#fff',
              lineHeight: 1.15,
              transform: `scale(${interpolate(s, [0, 1], [0.9, 1])})`,
              opacity: s,
            }}
          >
            {tekst}
          </div>
          {podpis ? (
            <div
              style={{
                fontFamily: SANS,
                fontSize: 34,
                fontWeight: 800,
                color: kolor,
                letterSpacing: 3,
                marginTop: 26,
                opacity: interpolate(frame, [18, 30], [0, 1], {extrapolateRight: 'clamp'}),
              }}
            >
              {podpis}
            </div>
          ) : null}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
