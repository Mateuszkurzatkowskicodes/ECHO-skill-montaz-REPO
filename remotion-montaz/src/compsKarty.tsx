import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring} from 'remotion';
import {SANS, MONO, zaladujCzcionki} from './czcionki';

zaladujCzcionki();

/**
 * KARTY NAD NAPISAMI.
 *
 * DLACZEGO TEN PLIK POWSTAL (08.09.2026, druga tura po zgloszeniu kursanta):
 *
 * Automat wstawial w rolke "wielkie napisy": fraze wycieta z transkrypcji
 * i pokazana wielka czcionka na wysokosci napisow karaoke. Zeby dwa teksty nie
 * lezaly na sobie, wycinal na ten czas napisy. Wychodzilo z tego jedno i to samo
 * zdanie pokazane dwa razy, raz male i raz duze, urwane w losowym miejscu
 * ("WLASCIWIE NO DARMOWA"), a napisy w kolko znikaly i wracaly.
 *
 * Rolki, ktore autor uznal za dobre, dzialaja INACZEJ:
 *   - napisy karaoke leca CALY CZAS i nigdy nie znikaja,
 *   - efekt siedzi NAD napisami, na wysokosci klatki piersiowej,
 *   - efekt to mala karta z ramka, ikona i wlasnym krotkim haslem,
 *     a nie goly cytat wielka czcionka,
 *   - nad glownym tekstem stoi maly NADTYTUL KURSYWA ("caly montaz zajmuje",
 *     "a teraz", "montazysta co miesiac"). To sygnatura tego stylu.
 *
 * Wszystko tutaj trzyma sie tych czterech zasad.
 */

const ORANGE = '#FF4D2D';
const AMBER = '#FFB13D';
const GREEN = '#4ED47A';
const RED = '#F0453B';
const KARTA_TLO = 'rgba(11,15,22,0.92)';

/** Wysokosc kompozycji. Karty sa niskie i plan kladzie je NAD napisami. */
export const WYS_KARTY = 620;

/** Nadtytul kursywa. Maly, przygaszony, nad glowna trescia. Sygnatura stylu. */
const Nadtytul: React.FC<{tekst?: string; post: number; jasny?: boolean}> = ({tekst, post, jasny}) =>
  tekst ? (
    <div
      style={{
        fontFamily: SANS,
        fontStyle: 'italic',
        fontSize: 34,
        fontWeight: 600,
        color: jasny ? 'rgba(40,40,40,0.62)' : 'rgba(255,255,255,0.86)',
        // Cien: nadtytul stoi na nagraniu, wiec na jasnym tle (sciana, koszulka)
        // sam bialy tekst po prostu znikal.
        textShadow: jasny ? 'none' : '0 3px 14px rgba(0,0,0,0.9), 0 0 26px rgba(0,0,0,0.75)',
        marginBottom: 16,
        opacity: post,
        transform: `translateY(${interpolate(post, [0, 1], [-14, 0])}px)`,
        textAlign: 'center',
      }}
    >
      {tekst}
    </div>
  ) : null;

/** Wspolny wjazd: sprezynka na wejsciu, zjazd na ostatnich klatkach. */
function wjazd(frame: number, fps: number, durationInFrames: number, opoznienie = 0) {
  const w = spring({frame: frame - opoznienie, fps, config: {damping: 15, mass: 0.7, stiffness: 150}});
  const z = interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return {post: w * z, wjechal: w};
}

/** Kadr karty: tresc siedzi u dolu kompozycji, czyli nad napisami karaoke. */
const ramkaKarty: React.CSSProperties = {
  justifyContent: 'flex-end',
  alignItems: 'center',
  paddingLeft: 60,
  paddingRight: 60,
  paddingBottom: 10,
};

/** Dobiera stopien pisma do dlugosci, zeby haslo nie wyszlo poza kadr. */
function stopien(tekst: string, bazowy: number, minimalny: number, dzielnik: number) {
  return Math.max(minimalny, Math.min(bazowy, Math.round(dzielnik / Math.max(1, tekst.length))));
}

/* ============================================================
   1. karta-teza: nadtytul kursywa + haslo w ramce
   ============================================================ */
export const KartaTeza: React.FC<{nadtytul?: string; tekst?: string}> = ({
  nadtytul = 'ta rolka, którą oglądasz',
  tekst = 'ZMONTOWANA PRZEZ AI',
}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const {post} = wjazd(frame, fps, durationInFrames);
  const fs = stopien(tekst, 62, 38, 1750);

  return (
    <AbsoluteFill style={ramkaKarty}>
      <div style={{opacity: post, transform: `translateY(${interpolate(post, [0, 1], [46, 0])}px)`}}>
        <Nadtytul tekst={nadtytul} post={post} />
        <div
          style={{
            background: KARTA_TLO,
            border: `3px solid ${ORANGE}`,
            borderRadius: 22,
            padding: '28px 38px',
            maxWidth: 900,
            boxShadow: `0 22px 60px rgba(0,0,0,0.55), 0 0 40px ${ORANGE}33`,
          }}
        >
          <div
            style={{
              fontFamily: SANS,
              fontSize: fs,
              fontWeight: 900,
              color: '#fff',
              letterSpacing: -0.5,
              lineHeight: 1.1,
              textAlign: 'center',
            }}
          >
            {tekst}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ============================================================
   2. karta-liczba: ikona + liczba + podpis, w jednej ramce
   ============================================================ */
export const KartaLiczba: React.FC<{ikona?: string; liczba?: string; podpis?: string}> = ({
  ikona = '⏳',
  liczba = '2h+',
  podpis = 'DZIENNIE NA MONTAŻ',
}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const {post} = wjazd(frame, fps, durationInFrames);
  const puls = 1 + Math.sin(frame / 8) * 0.015;

  return (
    <AbsoluteFill style={ramkaKarty}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          background: KARTA_TLO,
          border: `3px solid ${ORANGE}`,
          borderRadius: 22,
          padding: '24px 34px',
          maxWidth: 940,
          opacity: post,
          transform: `translateY(${interpolate(post, [0, 1], [46, 0])}px) scale(${puls})`,
          boxShadow: `0 22px 60px rgba(0,0,0,0.55), 0 0 40px ${ORANGE}33`,
        }}
      >
        <div style={{fontSize: 62, lineHeight: 1, flexShrink: 0}}>{ikona}</div>
        <div style={{display: 'flex', flexDirection: 'column', gap: 4}}>
          <div style={{fontFamily: SANS, fontSize: 64, fontWeight: 900, color: '#fff', lineHeight: 1}}>
            {liczba}
          </div>
          <div
            style={{
              fontFamily: SANS,
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: 2,
              color: 'rgba(255,255,255,0.72)',
            }}
          >
            {podpis.toUpperCase()}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ============================================================
   3. pigulki-nie: 2-3 pigułki z krzyżykiem, wjeżdżają kolejno
   ============================================================ */
export const PigulkiNie: React.FC<{punkty?: string[]; nadtytul?: string}> = ({
  punkty = ['bez cięcia', 'bez efektów'],
  nadtytul = '',
}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const {post} = wjazd(frame, fps, durationInFrames);

  return (
    <AbsoluteFill style={ramkaKarty}>
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14}}>
        <Nadtytul tekst={nadtytul} post={post} />
        {punkty.slice(0, 3).map((p, i) => {
          const w = wjazd(frame, fps, durationInFrames, 6 + i * 7);
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                background: KARTA_TLO,
                border: `2px solid ${RED}aa`,
                borderRadius: 999,
                padding: '16px 30px',
                opacity: w.post,
                transform: `translateX(${interpolate(w.wjechal, [0, 1], [-70, 0])}px)`,
                boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
              }}
            >
              <div style={{fontFamily: SANS, fontSize: 34, fontWeight: 900, color: RED, lineHeight: 1}}>
                {'✗'}
              </div>
              <div style={{fontFamily: SANS, fontSize: 38, fontWeight: 800, color: '#fff'}}>{p}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* ============================================================
   4. badge-ikona: jedna pigułka z ikoną (najczęstszy efekt we wzorcu)
   ============================================================ */
export const BadgeIkona: React.FC<{ikona?: string; tekst?: string; kolor?: string}> = ({
  ikona = '🚫',
  tekst = 'NIE MUSISZ SIĘ UCZYĆ',
  kolor = AMBER,
}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const {post, wjechal} = wjazd(frame, fps, durationInFrames);
  const fs = stopien(tekst, 40, 27, 1050);

  return (
    <AbsoluteFill style={ramkaKarty}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          background: KARTA_TLO,
          border: `2px solid ${kolor}`,
          borderRadius: 999,
          padding: '16px 30px',
          maxWidth: 900,
          opacity: post,
          transform: `translateY(${interpolate(wjechal, [0, 1], [40, 0])}px)`,
          boxShadow: `0 18px 46px rgba(0,0,0,0.5), 0 0 30px ${kolor}2a`,
        }}
      >
        <div style={{fontSize: 40, lineHeight: 1, flexShrink: 0}}>{ikona}</div>
        <div
          style={{
            fontFamily: SANS,
            fontSize: fs,
            fontWeight: 900,
            color: '#fff',
            letterSpacing: 1,
            whiteSpace: 'nowrap',
          }}
        >
          {tekst.toUpperCase()}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ============================================================
   5. mockup-plik: plik + pasek postępu (pokazuje proces, nie opisuje go)
   ============================================================ */
export const MockupPlik: React.FC<{nazwa?: string; podpis?: string; etykieta?: string}> = ({
  nazwa = 'nagranie-surowe.mp4',
  podpis = 'bez cięcia · bez efektów',
  etykieta = 'montuję...',
}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const {post, wjechal} = wjazd(frame, fps, durationInFrames);
  const postepP = interpolate(frame, [14, durationInFrames - 14], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={ramkaKarty}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          width: '100%',
          maxWidth: 860,
          opacity: post,
          transform: `translateY(${interpolate(wjechal, [0, 1], [46, 0])}px)`,
        }}
      >
        {/* Wiersz pliku */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            background: KARTA_TLO,
            border: '2px solid rgba(255,255,255,0.18)',
            borderRadius: 18,
            padding: '18px 26px',
            boxShadow: '0 18px 46px rgba(0,0,0,0.5)',
          }}
        >
          <div style={{fontSize: 38, lineHeight: 1}}>{'🎬'}</div>
          <div style={{display: 'flex', flexDirection: 'column', gap: 4}}>
            <div style={{fontFamily: MONO, fontSize: 30, fontWeight: 700, color: '#fff'}}>{nazwa}</div>
            <div style={{fontFamily: SANS, fontSize: 22, fontWeight: 600, color: 'rgba(255,255,255,0.5)'}}>
              {podpis}
            </div>
          </div>
        </div>
        {/* Pasek postepu: pokazuje, ze cos sie dzieje */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            background: KARTA_TLO,
            border: `2px solid ${ORANGE}`,
            borderRadius: 18,
            padding: '16px 24px',
            boxShadow: `0 18px 46px rgba(0,0,0,0.5), 0 0 30px ${ORANGE}2a`,
          }}
        >
          <div
            style={{
              fontFamily: SANS,
              fontSize: 24,
              fontWeight: 900,
              color: '#fff',
              background: ORANGE,
              borderRadius: 8,
              padding: '4px 10px',
              flexShrink: 0,
            }}
          >
            AI
          </div>
          <div style={{fontFamily: SANS, fontSize: 26, fontWeight: 700, color: 'rgba(255,255,255,0.8)', flexShrink: 0}}>
            {etykieta}
          </div>
          <div style={{flex: 1, height: 14, borderRadius: 7, background: 'rgba(255,255,255,0.12)'}}>
            <div
              style={{
                width: `${postepP * 100}%`,
                height: '100%',
                borderRadius: 7,
                background: `linear-gradient(90deg, ${AMBER}, ${ORANGE})`,
              }}
            />
          </div>
          <div style={{fontFamily: MONO, fontSize: 24, fontWeight: 700, color: ORANGE, flexShrink: 0}}>
            {Math.round(postepP * 100)}%
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ============================================================
   6. karta-zamiana: przekreślone stare, pod spodem nowe
   ============================================================ */
export const KartaZamiana: React.FC<{nadtytul?: string; stare?: string; nowe?: string; podpis?: string}> = ({
  nadtytul = 'montażysta co miesiąc',
  stare = 'TYSIĄCE ZŁ',
  nowe = '0 ZŁ',
  podpis = '',
}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const {post} = wjazd(frame, fps, durationInFrames);
  const kreska = interpolate(frame, [12, 26], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const noweP = spring({frame: frame - 28, fps, config: {damping: 12, mass: 0.7}});

  return (
    <AbsoluteFill style={ramkaKarty}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
          opacity: post,
          transform: `translateY(${interpolate(post, [0, 1], [46, 0])}px)`,
        }}
      >
        <Nadtytul tekst={nadtytul} post={post} />
        <div style={{position: 'relative'}}>
          <div
            style={{
              fontFamily: SANS,
              fontSize: stopien(stare, 68, 40, 1500),
              fontWeight: 900,
              color: 'rgba(255,255,255,0.55)',
              letterSpacing: -1,
              textShadow: '0 10px 26px rgba(0,0,0,0.7)',
            }}
          >
            {stare}
          </div>
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: '52%',
              height: 8,
              width: `${kreska * 100}%`,
              borderRadius: 4,
              background: RED,
              boxShadow: `0 0 20px ${RED}aa`,
            }}
          />
        </div>
        <div
          style={{
            fontFamily: SANS,
            fontSize: 40,
            color: 'rgba(255,255,255,0.6)',
            opacity: noweP,
            lineHeight: 1,
          }}
        >
          {'↓'}
        </div>
        <div
          style={{
            fontFamily: SANS,
            fontSize: stopien(nowe, 96, 54, 1700),
            fontWeight: 900,
            color: GREEN,
            letterSpacing: -2,
            opacity: noweP,
            transform: `scale(${interpolate(noweP, [0, 1], [0.7, 1])})`,
            textShadow: `0 0 46px ${GREEN}66, 0 12px 30px rgba(0,0,0,0.7)`,
          }}
        >
          {nowe}
        </div>
        {podpis ? (
          <div
            style={{
              fontFamily: SANS,
              fontSize: 26,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.6)',
              opacity: noweP,
            }}
          >
            {podpis}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
