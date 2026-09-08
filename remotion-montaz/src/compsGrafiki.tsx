import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring} from 'remotion';
import {SANS, MONO, zaladujCzcionki} from './czcionki';
import {TloCiemne as TloCiemneECHO, TloJasne as TloJasneECHO, BrandBug} from './budulce';

zaladujCzcionki();

/**
 * GRAFIKI, KTORE ILUSTRUJA.
 *
 * DLACZEGO TEN PLIK POWSTAL (08.09.2026, po zarzucie "to jest po prostu napis"):
 *
 * Wszystko, co automat potrafil do tej pory, sprowadzalo sie do tekstu w ramce.
 * Nawet sekwencje byly listami zdan. Tymczasem najmocniejsze momenty w rolkach
 * autora to nie napisy, tylko RYSUNKI, ktore pokazuja to, o czym mowi:
 *   - pierscien z licznikiem, ktory dobiega do "0:59",
 *   - suwak ze skala 0-48 h i uchwytem jadacym do wartosci,
 *   - mockup konta z awatarem, licznikiem obserwujacych i siatka postow,
 *   - powiadomienia wpadajace jedno po drugim, jak prawdziwe wiadomosci,
 *   - slupki, ktore rosna.
 *
 * Widz nie czyta tego, tylko OGLADA, i dlatego te momenty zatrzymuja kciuk.
 * Kazda grafika tutaj animuje sie od zera do wartosci przez caly swoj czas,
 * wiec nigdy nie stoi nieruchomo.
 */

const ORANGE = '#FF4D2D';
const AMBER = '#FFB13D';
const GREEN = '#4ED47A';
const RED = '#F0453B';
const INK = '#070B11';
const KREM = '#F4F1EA';

/** Postep 0..1 rozlozony na cala kompozycje, z lagodnym startem i koncem. */
function przebieg(frame: number, fps: number, durationInFrames: number) {
  return interpolate(frame, [fps * 0.35, durationInFrames - fps * 0.45], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

const TloJasne: React.FC = () => {
  const frame = useCurrentFrame();
  const d = Math.sin(frame / 44) * 38;
  return (
    <>
      <AbsoluteFill style={{background: `linear-gradient(165deg, #FCFAF7, ${KREM} 58%, #ECE4D8)`}} />
      <AbsoluteFill
        style={{
          background: `radial-gradient(760px 760px at ${820 - d}px ${1520 + d}px, ${ORANGE}20 0%, transparent 70%)`,
        }}
      />
    </>
  );
};

const TloCiemne: React.FC = () => {
  const frame = useCurrentFrame();
  const d = Math.sin(frame / 44) * 50;
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
        style={{background: `radial-gradient(880px 880px at ${260 + d}px ${1420 - d}px, ${ORANGE}2c 0%, transparent 70%)`}}
      />
      <AbsoluteFill
        style={{background: 'radial-gradient(circle at 50% 44%, transparent 46%, rgba(0,0,0,0.66) 100%)'}}
      />
    </>
  );
};

const Nadtytul: React.FC<{tekst?: string; jasne: boolean; post: number}> = ({tekst, jasne, post}) =>
  tekst ? (
    <div
      style={{
        fontFamily: SANS,
        fontStyle: 'italic',
        fontSize: 34,
        fontWeight: 600,
        color: jasne ? 'rgba(40,40,40,0.6)' : 'rgba(255,255,255,0.7)',
        opacity: post,
        transform: `translateY(${interpolate(post, [0, 1], [-18, 0])}px)`,
        marginBottom: 26,
        textAlign: 'center',
      }}
    >
      {tekst}
    </div>
  ) : null;

/** Wspolna ramka: tresc w gornej polowie kadru, bo pod spodem leca napisy. */
const Kadr: React.FC<{jasne: boolean; children: React.ReactNode}> = ({jasne, children}) => (
  <>
    {/* Tla z budulcow: maja ZIARNO (feTurbulence), ktorego brakowalo w zestawie
        i przez ktore gradienty wygladaly jak tapeta z edytora, a nie jak
        material filmowy. Do tego logo w rogu, jak w kazdej rolce autora. */}
    {jasne ? <TloJasneECHO /> : <TloCiemneECHO />}
    <BrandBug jasne={jasne} />
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        padding: 70,
        paddingBottom: 600,
      }}
    >
      {children}
    </AbsoluteFill>
  </>
);

/* ============================================================
   1. graf-pierscien: pierscien wypelnia sie do wartosci
   ============================================================ */
export const GrafPierscien: React.FC<{
  nadtytul?: string;
  wartosc?: string;
  podpis?: string;
  jasne?: boolean;
}> = ({nadtytul = 'cały montaż zajmuje', wartosc = '4 MIN', podpis = '', jasne = false}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const p = przebieg(frame, fps, durationInFrames);
  const post = spring({frame, fps, config: {damping: 200}});
  const wyj = interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const R = 190;
  const obwod = 2 * Math.PI * R;

  return (
    <AbsoluteFill style={{opacity: wyj}}>
      <Kadr jasne={jasne}>
        <Nadtytul tekst={nadtytul} jasne={jasne} post={post} />
        <div style={{position: 'relative', width: R * 2 + 40, height: R * 2 + 40}}>
          <svg width={R * 2 + 40} height={R * 2 + 40} style={{transform: 'rotate(-90deg)'}}>
            <circle
              cx={R + 20}
              cy={R + 20}
              r={R}
              fill="none"
              stroke={jasne ? 'rgba(40,40,40,0.10)' : 'rgba(255,255,255,0.12)'}
              strokeWidth={22}
            />
            <circle
              cx={R + 20}
              cy={R + 20}
              r={R}
              fill="none"
              stroke={ORANGE}
              strokeWidth={22}
              strokeLinecap="round"
              strokeDasharray={obwod}
              strokeDashoffset={obwod * (1 - p)}
            />
          </svg>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <div
              style={{
                fontFamily: SANS,
                fontSize: 86,
                fontWeight: 900,
                color: jasne ? '#22201D' : '#fff',
                letterSpacing: -2,
              }}
            >
              {wartosc}
            </div>
            {podpis ? (
              <div
                style={{
                  fontFamily: SANS,
                  fontSize: 26,
                  fontWeight: 800,
                  letterSpacing: 3,
                  color: jasne ? 'rgba(40,40,40,0.55)' : 'rgba(255,255,255,0.6)',
                  textTransform: 'uppercase',
                }}
              >
                {podpis}
              </div>
            ) : null}
          </div>
        </div>
      </Kadr>
    </AbsoluteFill>
  );
};

/* ============================================================
   2. graf-suwak: skala z uchwytem jadacym do wartosci
   ============================================================ */
export const GrafSuwak: React.FC<{
  nadtytul?: string;
  wartosc?: string;
  opis?: string;
  skala?: string[];
  jasne?: boolean;
}> = ({
  nadtytul = 'czas realizacji',
  wartosc = '48 H',
  opis = 'maksymalnie',
  skala = ['0 h', '12 h', '24 h', '36 h', '48 h'],
  jasne = true,
}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const p = przebieg(frame, fps, durationInFrames);
  const post = spring({frame, fps, config: {damping: 200}});
  const wyj = interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const SZER = 760;

  return (
    <AbsoluteFill style={{opacity: wyj}}>
      <Kadr jasne={jasne}>
        <Nadtytul tekst={nadtytul} jasne={jasne} post={post} />
        <div
          style={{
            fontFamily: SANS,
            fontSize: 120,
            fontWeight: 900,
            color: jasne ? '#22201D' : '#fff',
            letterSpacing: -3,
            marginBottom: 6,
          }}
        >
          {wartosc.split(' ')[0]}
          <span style={{color: ORANGE}}> {wartosc.split(' ').slice(1).join(' ')}</span>
        </div>
        <div
          style={{
            fontFamily: SANS,
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: 4,
            color: jasne ? 'rgba(40,40,40,0.5)' : 'rgba(255,255,255,0.6)',
            textTransform: 'uppercase',
            marginBottom: 40,
          }}
        >
          {opis}
        </div>
        <div style={{width: SZER, position: 'relative'}}>
          <div
            style={{
              height: 12,
              borderRadius: 6,
              background: jasne ? 'rgba(40,40,40,0.12)' : 'rgba(255,255,255,0.14)',
            }}
          >
            <div
              style={{
                width: `${p * 100}%`,
                height: '100%',
                borderRadius: 6,
                background: `linear-gradient(90deg, ${AMBER}, ${ORANGE})`,
              }}
            />
          </div>
          {/* Uchwyt jedzie razem z wypelnieniem. */}
          <div
            style={{
              position: 'absolute',
              top: -12,
              left: `calc(${p * 100}% - 18px)`,
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: '#fff',
              border: `4px solid ${ORANGE}`,
              boxShadow: `0 8px 22px rgba(0,0,0,0.25), 0 0 22px ${ORANGE}55`,
            }}
          />
          <div style={{display: 'flex', justifyContent: 'space-between', marginTop: 18}}>
            {skala.map((z, i) => (
              <div
                key={i}
                style={{
                  fontFamily: MONO,
                  fontSize: 22,
                  fontWeight: 700,
                  color: jasne ? 'rgba(40,40,40,0.45)' : 'rgba(255,255,255,0.45)',
                }}
              >
                {z}
              </div>
            ))}
          </div>
        </div>
      </Kadr>
    </AbsoluteFill>
  );
};

/* ============================================================
   3. graf-slupki: slupki rosna jeden po drugim
   ============================================================ */
export const GrafSlupki: React.FC<{
  nadtytul?: string;
  slupki?: {etykieta: string; wysokosc: number; wyroznij?: boolean}[];
  jasne?: boolean;
}> = ({
  nadtytul = 'zasięgi miesiąc po miesiącu',
  slupki = [
    {etykieta: 'I', wysokosc: 0.25},
    {etykieta: 'II', wysokosc: 0.45},
    {etykieta: 'III', wysokosc: 0.7},
    {etykieta: 'IV', wysokosc: 1, wyroznij: true},
  ],
  jasne = false,
}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const post = spring({frame, fps, config: {damping: 200}});
  const wyj = interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const MAX = 420;

  return (
    <AbsoluteFill style={{opacity: wyj}}>
      <Kadr jasne={jasne}>
        <Nadtytul tekst={nadtytul} jasne={jasne} post={post} />
        <div style={{display: 'flex', alignItems: 'flex-end', gap: 26, height: MAX + 60}}>
          {slupki.slice(0, 5).map((s, i) => {
            const w = spring({
              frame: frame - Math.round(fps * (0.4 + i * 0.28)),
              fps,
              config: {damping: 14, mass: 0.7},
            });
            const h = MAX * s.wysokosc * w;
            return (
              <div key={i} style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12}}>
                <div
                  style={{
                    width: 92,
                    height: h,
                    borderRadius: 14,
                    background: s.wyroznij
                      ? `linear-gradient(180deg, ${AMBER}, ${ORANGE})`
                      : jasne
                      ? 'rgba(40,40,40,0.16)'
                      : 'rgba(255,255,255,0.16)',
                    boxShadow: s.wyroznij ? `0 12px 34px ${ORANGE}55` : 'none',
                  }}
                />
                <div
                  style={{
                    fontFamily: SANS,
                    fontSize: 26,
                    fontWeight: 800,
                    color: jasne ? 'rgba(40,40,40,0.6)' : 'rgba(255,255,255,0.6)',
                  }}
                >
                  {s.etykieta}
                </div>
              </div>
            );
          })}
        </div>
      </Kadr>
    </AbsoluteFill>
  );
};

/* ============================================================
   4. graf-powiadomienia: wiadomosci wpadaja jedna po drugiej
   ============================================================ */
export const GrafPowiadomienia: React.FC<{
  nadtytul?: string;
  wiadomosci?: {nick: string; tresc: string}[];
  jasne?: boolean;
}> = ({
  nadtytul = 'a potem to wygląda tak',
  wiadomosci = [
    {nick: 'karol_hvac', tresc: 'Chcę zamówić 🔥'},
    {nick: 'ania.studio', tresc: 'Ile to kosztuje?'},
    {nick: 'marek_pl', tresc: 'Jest jeszcze termin?'},
  ],
  jasne = false,
}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const post = spring({frame, fps, config: {damping: 200}});
  const wyj = interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{opacity: wyj}}>
      <Kadr jasne={jasne}>
        <Nadtytul tekst={nadtytul} jasne={jasne} post={post} />
        <div style={{display: 'flex', flexDirection: 'column', gap: 16, width: 860}}>
          {wiadomosci.slice(0, 3).map((w, i) => {
            const s = spring({
              frame: frame - Math.round(fps * (0.45 + i * 0.55)),
              fps,
              config: {damping: 13, mass: 0.6},
            });
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 20,
                  background: '#fff',
                  borderRadius: 22,
                  padding: '20px 26px',
                  boxShadow: '0 18px 44px rgba(0,0,0,0.28)',
                  opacity: s,
                  transform: `translateX(${interpolate(s, [0, 1], [120, 0])}px) scale(${interpolate(
                    s,
                    [0, 1],
                    [0.92, 1]
                  )})`,
                }}
              >
                <div
                  style={{
                    width: 62,
                    height: 62,
                    borderRadius: '50%',
                    background: `linear-gradient(140deg, ${AMBER}, ${ORANGE})`,
                    flexShrink: 0,
                  }}
                />
                <div style={{display: 'flex', flexDirection: 'column', gap: 4, flex: 1}}>
                  <div style={{fontFamily: MONO, fontSize: 22, fontWeight: 700, color: '#8A8A8A'}}>
                    {w.nick}
                  </div>
                  <div style={{fontFamily: SANS, fontSize: 34, fontWeight: 800, color: '#1A1A1A'}}>
                    {w.tresc}
                  </div>
                </div>
                <div style={{width: 12, height: 12, borderRadius: '50%', background: ORANGE, flexShrink: 0}} />
              </div>
            );
          })}
        </div>
      </Kadr>
    </AbsoluteFill>
  );
};

/* ============================================================
   5. graf-konto: mockup profilu z licznikiem obserwujacych
   ============================================================ */
export const GrafKonto: React.FC<{
  nadtytul?: string;
  nick?: string;
  obserwujacy?: number;
  jasne?: boolean;
}> = ({nadtytul = 'twoje konto', nick = 'twoja.firma', obserwujacy = 4870, jasne = true}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const p = przebieg(frame, fps, durationInFrames);
  const post = spring({frame, fps, config: {damping: 200}});
  const wyj = interpolate(frame, [durationInFrames - 10, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const licznik = Math.round(obserwujacy * p);

  return (
    <AbsoluteFill style={{opacity: wyj}}>
      <Kadr jasne={jasne}>
        <Nadtytul tekst={nadtytul} jasne={jasne} post={post} />
        <div
          style={{
            width: 720,
            background: '#fff',
            borderRadius: 30,
            padding: 30,
            boxShadow: '0 26px 66px rgba(0,0,0,0.22)',
            transform: `scale(${interpolate(post, [0, 1], [0.9, 1])})`,
          }}
        >
          <div style={{display: 'flex', alignItems: 'center', gap: 22, marginBottom: 24}}>
            <div
              style={{
                width: 108,
                height: 108,
                borderRadius: '50%',
                background: `linear-gradient(140deg, ${AMBER}, ${ORANGE})`,
                flexShrink: 0,
              }}
            />
            <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
              <div style={{fontFamily: SANS, fontSize: 34, fontWeight: 900, color: '#1A1A1A'}}>{nick}</div>
              <div style={{display: 'flex', gap: 8, alignItems: 'baseline'}}>
                <span style={{fontFamily: SANS, fontSize: 40, fontWeight: 900, color: ORANGE}}>
                  {licznik.toLocaleString('pl-PL')}
                </span>
                <span style={{fontFamily: SANS, fontSize: 24, fontWeight: 700, color: '#8A8A8A'}}>
                  obserwujących
                </span>
              </div>
            </div>
          </div>
          {/* Siatka postow: kafelki wskakuja po kolei. */}
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10}}>
            {Array.from({length: 6}).map((_, i) => {
              const s = spring({
                frame: frame - Math.round(fps * (0.5 + i * 0.12)),
                fps,
                config: {damping: 14, mass: 0.6},
              });
              return (
                <div
                  key={i}
                  style={{
                    paddingTop: '100%',
                    borderRadius: 12,
                    background: i % 3 === 0 ? `${ORANGE}22` : 'rgba(40,40,40,0.08)',
                    transform: `scale(${s})`,
                  }}
                />
              );
            })}
          </div>
        </div>
      </Kadr>
    </AbsoluteFill>
  );
};
