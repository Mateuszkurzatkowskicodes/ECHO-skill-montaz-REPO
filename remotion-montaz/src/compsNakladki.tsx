import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring} from 'remotion';
import {SANS, MONO, zaladujCzcionki} from './czcionki';

zaladujCzcionki();

/**
 * ANIMOWANE NAKLADKI, KTORE NIE ZASLANIAJA KADRU.
 *
 * DLACZEGO TEN PLIK POWSTAL (08.09.2026, po zarzucie o monotonie):
 *
 * Gdy z automatu wylecialy wszystkie "ramki z napisem", zostaly same sceny
 * pelnoekranowe. Rolka zaczela wygladac tak: mowiacy, czarna plansza, mowiacy,
 * czarna plansza. Autor nazwal to wprost i mial racje: to jest rytm karuzeli,
 * nie montazu. W jego rolkach wiekszosc efektow siedzi NA nagraniu i tylko co
 * kilkanascie sekund wchodzi pelny kadr.
 *
 * Tutaj sa rzeczy, ktore graja na tle mowiacego: licznik przewijajacy sie do
 * wartosci, pasek postepu, ikony wlatujace z boku, equalizer. Zadna nie jest
 * ramka z napisem: w kazdej cos sie RUSZA przez caly czas trwania.
 *
 * Kompozycje sa niskie (300 px), wiec plan kladzie je nad napisami, w pasie
 * miedzy broda a napisem karaoke.
 */

const ORANGE = '#FF4D2D';
const AMBER = '#FFB13D';
const GREEN = '#4ED47A';
const CYAN = '#38B6D8';
const TLO = 'rgba(11,15,22,0.94)';

export const WYS_NAKLADKI = 300;

/** Postep 0..1 przez caly czas trwania. */
function bieg(frame: number, fps: number, durationInFrames: number, opoznienie = 0.25) {
  return interpolate(frame, [fps * opoznienie, durationInFrames - fps * 0.4], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

/** Wjazd z dolu i zjazd na koncu, wspolny dla wszystkich nakladek. */
function ruchKarty(frame: number, fps: number, durationInFrames: number) {
  const w = spring({frame, fps, config: {damping: 13, mass: 0.6, stiffness: 175}});
  const z = interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return {
    krycie: w * z,
    przesun: interpolate(w, [0, 1], [48, 0]),
    rozmycie: interpolate(w, [0, 0.55], [14, 0], {extrapolateRight: 'clamp'}),
  };
}

const Ramka: React.FC<{children: React.ReactNode; szerokosc?: number}> = ({children, szerokosc = 860}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const r = ruchKarty(frame, fps, durationInFrames);
  const puls = 0.5 + Math.sin(frame / 12) * 0.5;
  return (
    <AbsoluteFill
      style={{justifyContent: 'flex-end', alignItems: 'center', paddingLeft: 60, paddingRight: 60, paddingBottom: 10}}
    >
      <div
        style={{
          width: '100%',
          maxWidth: szerokosc,
          background: TLO,
          border: `2px solid ${ORANGE}88`,
          borderRadius: 20,
          padding: '20px 26px',
          opacity: r.krycie,
          transform: `translateY(${r.przesun}px)`,
          filter: `blur(${r.rozmycie}px)`,
          boxShadow: `0 20px 52px rgba(0,0,0,0.6), 0 0 ${Math.round(24 + puls * 22)}px ${ORANGE}33`,
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};

/* ============================================================
   1. nak-licznik: liczba przewija sie do wartosci
   ============================================================ */
export const NakLicznik: React.FC<{do?: number; jednostka?: string; podpis?: string; wDol?: boolean}> = ({
  do: docelowa = 100,
  jednostka = '',
  podpis = '',
  wDol = false,
}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const p = bieg(frame, fps, durationInFrames);
  // Licznik zwalnia na koncu, zeby ostatnie cyfry dalo sie przeczytac.
  const wygladzony = 1 - Math.pow(1 - p, 3);
  const teraz = Math.round((wDol ? docelowa * (1 - wygladzony) : docelowa * wygladzony));

  return (
    <Ramka szerokosc={720}>
      <div style={{display: 'flex', alignItems: 'center', gap: 22}}>
        <div style={{display: 'flex', alignItems: 'baseline', gap: 8}}>
          <div
            style={{
              fontFamily: SANS,
              fontSize: 76,
              fontWeight: 900,
              color: '#fff',
              lineHeight: 1,
              letterSpacing: -2,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {teraz.toLocaleString('pl-PL')}
          </div>
          {jednostka ? (
            <div style={{fontFamily: SANS, fontSize: 44, fontWeight: 900, color: ORANGE}}>{jednostka}</div>
          ) : null}
        </div>
        {podpis ? (
          <div
            style={{
              fontFamily: SANS,
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: 2,
              color: 'rgba(255,255,255,0.68)',
              textTransform: 'uppercase',
              lineHeight: 1.2,
            }}
          >
            {podpis}
          </div>
        ) : null}
      </div>
    </Ramka>
  );
};

/* ============================================================
   2. nak-pasek: pasek postepu z etykieta i procentem
   ============================================================ */
export const NakPasek: React.FC<{etykieta?: string; kroki?: string[]}> = ({
  etykieta = 'PRACUJE',
  kroki = [],
}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const p = bieg(frame, fps, durationInFrames, 0.15);
  const ktory = Math.min(kroki.length - 1, Math.floor(p * kroki.length));

  return (
    <Ramka>
      <div style={{display: 'flex', alignItems: 'center', gap: 16, marginBottom: kroki.length ? 14 : 0}}>
        <div
          style={{
            fontFamily: MONO,
            fontSize: 22,
            fontWeight: 700,
            color: '#fff',
            background: ORANGE,
            borderRadius: 8,
            padding: '5px 12px',
            letterSpacing: 2,
            flexShrink: 0,
          }}
        >
          {etykieta}
        </div>
        {kroki.length ? (
          <div style={{fontFamily: SANS, fontSize: 30, fontWeight: 700, color: 'rgba(255,255,255,0.9)'}}>
            {kroki[Math.max(0, ktory)]}
          </div>
        ) : null}
        <div style={{marginLeft: 'auto', fontFamily: MONO, fontSize: 26, fontWeight: 700, color: ORANGE}}>
          {Math.round(p * 100)}%
        </div>
      </div>
      <div style={{height: 14, borderRadius: 7, background: 'rgba(255,255,255,0.12)', overflow: 'hidden'}}>
        <div
          style={{
            width: `${p * 100}%`,
            height: '100%',
            borderRadius: 7,
            background: `linear-gradient(90deg, ${AMBER}, ${ORANGE})`,
            boxShadow: `0 0 18px ${ORANGE}88`,
          }}
        />
      </div>
    </Ramka>
  );
};

/* ============================================================
   3. nak-ikony: ikony wlatuja z prawej i ustawiaja sie w rzad
   ============================================================ */
export const NakIkony: React.FC<{ikony?: string[]; podpisy?: string[]}> = ({
  ikony = ['🎬', '✂️', '🎵', '📤'],
  podpisy = [],
}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const lista = ikony.slice(0, 4);

  return (
    <Ramka szerokosc={820}>
      <div style={{display: 'flex', justifyContent: 'space-around', alignItems: 'center'}}>
        {lista.map((ik, i) => {
          const w = spring({
            frame: frame - Math.round(fps * (0.2 + i * 0.22)),
            fps,
            config: {damping: 12, mass: 0.55},
          });
          // Lekkie kolysanie po wladowaniu, zeby rzad nie zamarl.
          const kolysanie = Math.sin(frame / 14 + i) * 4 * w;
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                opacity: w,
                transform: `translateX(${interpolate(w, [0, 1], [140, 0])}px) translateY(${kolysanie}px) scale(${interpolate(
                  w,
                  [0, 1],
                  [0.5, 1]
                )})`,
              }}
            >
              <div style={{fontSize: 62, lineHeight: 1}}>{ik}</div>
              {podpisy[i] ? (
                <div
                  style={{
                    fontFamily: SANS,
                    fontSize: 22,
                    fontWeight: 800,
                    letterSpacing: 1,
                    color: 'rgba(255,255,255,0.8)',
                  }}
                >
                  {podpisy[i]}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </Ramka>
  );
};

/* ============================================================
   4. nak-equalizer: slupki grajace w rytm, na tle nagrania
   ============================================================ */
export const NakEqualizer: React.FC<{podpis?: string}> = ({podpis = ''}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const p = bieg(frame, fps, durationInFrames, 0.1);
  const ILE = 30;

  return (
    <Ramka szerokosc={820}>
      <div style={{display: 'flex', alignItems: 'center', gap: 6, height: 130, justifyContent: 'center'}}>
        {Array.from({length: ILE}).map((_, i) => {
          const faza = i / ILE;
          const h =
            (0.18 + 0.82 * Math.abs(Math.sin(faza * Math.PI * 3 + frame / 6))) *
            (0.35 + p * 0.65) *
            120;
          const w = spring({frame: frame - Math.round(fps * (0.1 + faza * 0.5)), fps, config: {damping: 14}});
          return (
            <div
              key={i}
              style={{
                width: 14,
                height: Math.max(10, h) * w,
                borderRadius: 7,
                background: `linear-gradient(180deg, ${AMBER}, ${ORANGE})`,
                opacity: 0.6 + faza * 0.4,
              }}
            />
          );
        })}
      </div>
      {podpis ? (
        <div
          style={{
            marginTop: 10,
            textAlign: 'center',
            fontFamily: SANS,
            fontSize: 26,
            fontWeight: 800,
            letterSpacing: 2,
            color: 'rgba(255,255,255,0.75)',
            textTransform: 'uppercase',
          }}
        >
          {podpis}
        </div>
      ) : null}
    </Ramka>
  );
};

/* ============================================================
   5. nak-porownanie: dwie wartosci, jedna maleje, druga rosnie
   ============================================================ */
export const NakPorownanie: React.FC<{
  lewaEtykieta?: string;
  lewaWartosc?: string;
  prawaEtykieta?: string;
  prawaWartosc?: string;
}> = ({
  lewaEtykieta = 'RĘCZNIE',
  lewaWartosc = '3 h',
  prawaEtykieta = 'Z AI',
  prawaWartosc = '4 min',
}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const lewa = spring({frame: frame - Math.round(fps * 0.2), fps, config: {damping: 13, mass: 0.6}});
  const prawa = spring({frame: frame - Math.round(fps * 0.75), fps, config: {damping: 13, mass: 0.6}});
  const strzalka = spring({frame: frame - Math.round(fps * 0.55), fps, config: {damping: 11, mass: 0.5}});

  const kolumna = (etykieta: string, wartosc: string, w: number, kolor: string, zLewej: boolean) => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        opacity: w,
        transform: `translateX(${interpolate(w, [0, 1], [zLewej ? -60 : 60, 0])}px)`,
      }}
    >
      <div
        style={{
          fontFamily: SANS,
          fontSize: 22,
          fontWeight: 800,
          letterSpacing: 3,
          color: kolor,
          textTransform: 'uppercase',
        }}
      >
        {etykieta}
      </div>
      <div style={{fontFamily: SANS, fontSize: 58, fontWeight: 900, color: '#fff', lineHeight: 1.1}}>
        {wartosc}
      </div>
    </div>
  );

  return (
    <Ramka szerokosc={760}>
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-around'}}>
        {kolumna(lewaEtykieta, lewaWartosc, lewa, 'rgba(255,255,255,0.5)', true)}
        <div
          style={{
            fontFamily: SANS,
            fontSize: 46,
            fontWeight: 900,
            color: ORANGE,
            opacity: strzalka,
            transform: `translateX(${interpolate(strzalka, [0, 1], [-20, 0])}px)`,
          }}
        >
          {'→'}
        </div>
        {kolumna(prawaEtykieta, prawaWartosc, prawa, ORANGE, false)}
      </div>
    </Ramka>
  );
};
