import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Easing} from 'remotion';

/**
 * Efekty pisane pod KONKRETNA rolke "sezon" (fachowcy, wymowka sezonowa).
 * Zgodnie ze SKILL.md kazdy efekt siedzi na swoim momencie nagrania,
 * nie jest wyciagniety z szablonu.
 */

const AMBER = '#FFB13D';
const ORANGE = '#FF4A2D';
const DEEP = '#E0290F';
const GREEN = '#5CCB6A';
const RED = '#F03B3B';
const SANS = "'Arial Black','Segoe UI',Arial,sans-serif";
const SERIF = "Georgia,'Times New Roman',serif";
const OGIEN = `linear-gradient(150deg, ${AMBER}, ${ORANGE} 55%, ${DEEP})`;

/* ================= wspolne tla ================= */

const Ziarno: React.FC<{sila?: number}> = ({sila = 0.06}) => {
  const f = useCurrentFrame();
  const x = (f * 37) % 100;
  const y = (f * 61) % 100;
  return (
    <AbsoluteFill
      style={{
        opacity: sila,
        backgroundImage:
          'radial-gradient(circle at 20% 30%, #fff 0.5px, transparent 1px), radial-gradient(circle at 70% 60%, #fff 0.5px, transparent 1px), radial-gradient(circle at 40% 80%, #fff 0.5px, transparent 1px)',
        backgroundSize: '7px 7px, 11px 11px, 13px 13px',
        backgroundPosition: `${x}px ${y}px, ${-y}px ${x}px, ${x}px ${-x}px`,
      }}
    />
  );
};

const TloEcho: React.FC<{poswiata?: string}> = ({poswiata = ORANGE}) => {
  const f = useCurrentFrame();
  const dryf = Math.sin(f / 90) * 70;
  return (
    <AbsoluteFill style={{backgroundColor: '#0A0F16'}}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(900px 900px at ${240 + dryf}px ${1500 - dryf}px, ${poswiata}30 0%, transparent 70%), radial-gradient(760px 760px at ${880 - dryf}px ${330 + dryf}px, #38B6D822 0%, transparent 70%)`,
        }}
      />
      <AbsoluteFill
        style={{
          opacity: 0.07,
          backgroundImage:
            'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '92px 92px',
        }}
      />
      <Ziarno />
    </AbsoluteFill>
  );
};

/* ============ 1. HOOK: slam + wybuch czastek ============
   Idzie na sam poczatek, nad glowa. Czastki rozchodza sie na wysokosci
   klatki piersiowej, nie na twarzy. */
export const HookSlam: React.FC<{tekst?: string}> = ({tekst = 'MNIEJ TELEFONÓW?'}) => {
  const f = useCurrentFrame();
  const {fps, width} = useVideoConfig();
  const wjazd = spring({frame: f, fps, config: {damping: 9, mass: 0.55, stiffness: 190}});
  const skala = interpolate(wjazd, [0, 1], [2.2, 1]);
  const krycie = interpolate(f, [0, 4], [0, 1], {extrapolateRight: 'clamp'});
  const blysk = interpolate(f, [0, 3, 8], [0.85, 0.35, 0], {extrapolateRight: 'clamp'});

  return (
    <AbsoluteFill>
      {/* bialy blysk na wejsciu */}
      <AbsoluteFill style={{backgroundColor: `rgba(255,255,255,${blysk})`}} />

      {/* wybuch czastek na wysokosci klatki piersiowej */}
      {Array.from({length: 26}).map((_, i) => {
        const kat = (i / 26) * Math.PI * 2;
        const p = spring({frame: f - (i % 4), fps, config: {damping: 16, mass: 0.7}});
        const r = interpolate(p, [0, 1], [0, 300 + (i % 5) * 110]);
        const kr = interpolate(p, [0, 0.55, 1], [0, 1, 0]);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: width / 2 + Math.cos(kat) * r,
              top: 1180 + Math.sin(kat) * r * 0.62,
              width: 10 + (i % 3) * 6,
              height: 10 + (i % 3) * 6,
              borderRadius: '50%',
              background: i % 3 === 0 ? AMBER : ORANGE,
              opacity: kr,
              filter: 'blur(0.4px)',
            }}
          />
        );
      })}

      <div
        style={{
          position: 'absolute',
          top: 190,
          left: 0,
          right: 0,
          textAlign: 'center',
          padding: '0 56px',
          transform: `scale(${skala})`,
          opacity: krycie,
        }}
      >
        <div
          style={{
            fontFamily: SANS,
            fontSize: 118,
            fontWeight: 900,
            letterSpacing: -4,
            lineHeight: 0.96,
            color: '#fff',
            textShadow: '0 10px 44px rgba(0,0,0,.7)',
          }}
        >
          {tekst}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ============ 2. SLOWO-BOMBA ============ */
export const SlowoBomba: React.FC<{tekst?: string; kolor?: string}> = ({
  tekst = 'SEZON',
  kolor = ORANGE,
}) => {
  const f = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const p = spring({frame: f, fps, config: {damping: 10, mass: 0.5, stiffness: 210}});
  const wyjscie = interpolate(f, [durationInFrames - 7, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
  });
  const drgania = Math.sin(f / 2.2) * 3;

  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          top: 210,
          left: 0,
          right: 0,
          textAlign: 'center',
          transform: `scale(${interpolate(p, [0, 1], [0.3, 1])}) rotate(${drgania * 0.12}deg)`,
          opacity: Math.min(p, wyjscie),
        }}
      >
        <div
          style={{
            fontFamily: SANS,
            fontSize: 176,
            fontWeight: 900,
            letterSpacing: -7,
            background: OGIEN,
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: `drop-shadow(0 12px 40px ${kolor}70)`,
          }}
        >
          {tekst}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ============ 3. INTERLUDIUM: WYMOWKA (pelny ekran) ============
   Trzy wymowki wjezdzaja jedna po drugiej i zostaja przekreslone. */
export const InterludeWymowka: React.FC = () => {
  const f = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const pozycje = ['MNIEJ TELEFONÓW', 'MNIEJ ZLECEŃ', 'TAKI OKRES'];
  const wejscie = interpolate(f, [0, 7], [0, 1], {extrapolateRight: 'clamp'});
  const wyjscie = interpolate(f, [durationInFrames - 8, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
  });
  const kr = Math.min(wejscie, wyjscie);

  return (
    <AbsoluteFill style={{opacity: kr}}>
      <TloEcho />
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', padding: '0 80px'}}>
        <div
          style={{
            fontFamily: SERIF,
            fontStyle: 'italic',
            fontSize: 46,
            color: '#93A3B8',
            marginBottom: 54,
            letterSpacing: 2,
          }}
        >
          co sobie mówisz
        </div>

        {pozycje.map((t, i) => {
          const start = 10 + i * 16;
          const p = spring({frame: f - start, fps, config: {damping: 200}});
          const przekreslenie = spring({frame: f - (start + 14), fps, config: {damping: 200}});
          return (
            <div key={i} style={{position: 'relative', marginBottom: 34, opacity: p}}>
              <div
                style={{
                  fontFamily: SANS,
                  fontSize: 84,
                  fontWeight: 900,
                  letterSpacing: -2.5,
                  color: '#EEF3F9',
                  transform: `translateX(${interpolate(p, [0, 1], [-70, 0])}px)`,
                }}
              >
                {t}
              </div>
              <div
                style={{
                  position: 'absolute',
                  left: -10,
                  right: -10,
                  top: '52%',
                  height: 9,
                  background: RED,
                  borderRadius: 5,
                  transformOrigin: 'left center',
                  transform: `scaleX(${przekreslenie})`,
                  boxShadow: `0 0 24px ${RED}90`,
                }}
              />
            </div>
          );
        })}

        <div
          style={{
            marginTop: 46,
            padding: '16px 34px',
            borderRadius: 999,
            background: OGIEN,
            color: '#160604',
            fontFamily: SANS,
            fontSize: 44,
            fontWeight: 900,
            opacity: spring({frame: f - 66, fps, config: {damping: 200}}),
          }}
        >
          WYMÓWKA
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ============ 4. BADGE "PRAWDA" ============ */
export const BadgePrawda: React.FC<{tekst?: string}> = ({tekst = 'KLIENCI SĄ. CAŁY ROK.'}) => {
  const f = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const p = spring({frame: f, fps, config: {damping: 13, mass: 0.6}});
  const wyj = interpolate(f, [durationInFrames - 8, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
  });
  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          top: 250,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          opacity: Math.min(p, wyj),
          transform: `translateY(${interpolate(p, [0, 1], [-60, 0])}px)`,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            padding: '22px 40px',
            borderRadius: 26,
            background: 'rgba(10,15,22,.88)',
            border: `3px solid ${GREEN}`,
            boxShadow: `0 20px 60px rgba(0,0,0,.6), 0 0 50px ${GREEN}33`,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: GREEN,
              color: '#06210b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 34,
              fontWeight: 900,
              fontFamily: SANS,
            }}
          >
            ✓
          </div>
          <div style={{fontFamily: SANS, fontSize: 52, fontWeight: 900, color: '#fff', letterSpacing: -1.5}}>
            {tekst}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ============ 5. VS: DO CIEBIE czy DO KONKURENCJI ============ */
export const VsKlienci: React.FC = () => {
  const f = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const lewa = spring({frame: f - 2, fps, config: {damping: 200}});
  const prawa = spring({frame: f - 12, fps, config: {damping: 200}});
  const wyj = interpolate(f, [durationInFrames - 8, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
  });

  const karta = (
    tytul: string,
    kolor: string,
    p: number,
    kierunek: number
  ): React.CSSProperties => ({
    flex: 1,
    padding: '30px 22px',
    borderRadius: 24,
    background: 'rgba(10,15,22,.9)',
    border: `3px solid ${kolor}`,
    textAlign: 'center',
    opacity: p,
    transform: `translateX(${interpolate(p, [0, 1], [kierunek * 120, 0])}px)`,
    boxShadow: `0 18px 50px rgba(0,0,0,.55), 0 0 40px ${kolor}2e`,
  });

  return (
    <AbsoluteFill style={{opacity: wyj}}>
      <div
        style={{
          position: 'absolute',
          top: 210,
          left: 50,
          right: 50,
          display: 'flex',
          alignItems: 'stretch',
          gap: 18,
        }}
      >
        <div style={karta('', GREEN, lewa, -1)}>
          <div style={{fontSize: 54, marginBottom: 8}}>👉</div>
          <div style={{fontFamily: SANS, fontSize: 46, fontWeight: 900, color: GREEN, letterSpacing: -1}}>
            DO CIEBIE
          </div>
        </div>
        <div
          style={{
            alignSelf: 'center',
            fontFamily: SANS,
            fontSize: 38,
            fontWeight: 900,
            color: '#fff',
            background: 'rgba(10,15,22,.92)',
            border: '2px solid rgba(255,255,255,.22)',
            borderRadius: 999,
            padding: '10px 16px',
            boxShadow: '0 10px 30px rgba(0,0,0,.6)',
          }}
        >
          czy
        </div>
        <div style={karta('', RED, prawa, 1)}>
          <div style={{fontSize: 54, marginBottom: 8}}>💸</div>
          <div style={{fontFamily: SANS, fontSize: 46, fontWeight: 900, color: RED, letterSpacing: -1}}>
            DO KONKURENCJI
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ============ 6. INTERLUDIUM: SYSTEM (pelny ekran, animowany wykres) ============ */
export const InterludeSystem: React.FC = () => {
  const f = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const wejscie = interpolate(f, [0, 7], [0, 1], {extrapolateRight: 'clamp'});
  const wyjscie = interpolate(f, [durationInFrames - 8, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
  });
  const kr = Math.min(wejscie, wyjscie);
  const rysuj = interpolate(f, [12, 58], [0, 1], {
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.ease),
  });
  const etykieta = spring({frame: f - 52, fps, config: {damping: 200}});

  return (
    <AbsoluteFill style={{opacity: kr}}>
      <TloEcho poswiata={AMBER} />
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', padding: '0 70px'}}>
        <div
          style={{
            fontFamily: SANS,
            fontSize: 74,
            fontWeight: 900,
            letterSpacing: -2.5,
            color: '#fff',
            textAlign: 'center',
            lineHeight: 1.06,
            marginBottom: 50,
          }}
        >
          PRZEWIDYWALNY
          <br />
          <span
            style={{
              background: OGIEN,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            SYSTEM
          </span>
        </div>

        {/* wykres: rowna, rosnaca linia zamiast sezonowej sinusoidy */}
        <svg width="860" height="330" viewBox="0 0 860 330">
          <defs>
            <linearGradient id="lg" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor={AMBER} />
              <stop offset="1" stopColor={ORANGE} />
            </linearGradient>
          </defs>
          {[0, 1, 2, 3].map((i) => (
            <line key={i} x1="0" y1={40 + i * 80} x2="860" y2={40 + i * 80} stroke="#ffffff14" strokeWidth="2" />
          ))}
          {/* sezonowa hustawka, blada */}
          <path
            d="M20 250 C 130 90, 220 300, 330 150 C 440 20, 530 290, 640 190 C 730 110, 790 270, 840 210"
            stroke="#ffffff22"
            strokeWidth="7"
            fill="none"
            strokeLinecap="round"
          />
          {/* nasza linia, rysowana */}
          <path
            d="M20 280 L 200 235 L 380 185 L 560 130 L 740 78 L 840 55"
            stroke="url(#lg)"
            strokeWidth="11"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="1100"
            strokeDashoffset={1100 - rysuj * 1100}
            filter="drop-shadow(0 0 16px #FF4A2D80)"
          />
          <circle cx={20 + rysuj * 820} cy={280 - rysuj * 225} r="14" fill="#fff" opacity={rysuj > 0.05 ? 1 : 0} />
        </svg>

        <div
          style={{
            marginTop: 40,
            fontFamily: SANS,
            fontSize: 46,
            fontWeight: 900,
            color: '#fff',
            opacity: etykieta,
            transform: `translateY(${interpolate(etykieta, [0, 1], [24, 0])}px)`,
            textAlign: 'center',
          }}
        >
          SEZON CZY NIE SEZON
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ============ 7. PRZEKRESLENIE "POLECENIA" ============ */
export const StrikePolecenia: React.FC<{tekst?: string}> = ({tekst = 'TYLKO POLECENIA'}) => {
  const f = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const p = spring({frame: f, fps, config: {damping: 200}});
  const kreska = spring({frame: f - 16, fps, config: {damping: 200}});
  const wyj = interpolate(f, [durationInFrames - 7, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
  });
  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          top: 250,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          opacity: Math.min(p, wyj),
        }}
      >
        <div style={{position: 'relative', padding: '0 14px'}}>
          <div
            style={{
              fontFamily: SANS,
              fontSize: 92,
              fontWeight: 900,
              letterSpacing: -3,
              color: '#EEF3F9',
              textShadow: '0 8px 34px rgba(0,0,0,.65)',
              transform: `scale(${interpolate(p, [0, 1], [0.8, 1])})`,
            }}
          >
            {tekst}
          </div>
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: '52%',
              height: 11,
              background: RED,
              borderRadius: 6,
              transformOrigin: 'left center',
              transform: `scaleX(${kreska})`,
              boxShadow: `0 0 26px ${RED}aa`,
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};
