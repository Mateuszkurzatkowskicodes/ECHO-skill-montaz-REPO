import React from 'react';
import {Composition} from 'remotion';
import {Hook, Interlude1, Interlude2, CtaDm, Badge} from './comps';
import {Hook2, PromptBad, PromptGood, Payoff2, CtaComment} from './comps2';
import {Hook3, WinterPanel, VsSplit, CtaYoutube} from './comps3';
import {EnumInterlude, CoffeePayoff} from './compsKurs';
import {MouseScreen} from './compsKursMouse';
import {FlowCard, StyleCommandsCard, FastCard, ScreenshotTipCard, AskClaudeCard} from './compsKurs3';
import {PainsCut, FeaturesCut, CoffeeCut, CtaShort} from './compsShort1';
import {Pains2Cut, TimeMoneyCut} from './compsShort2';
import {StrataCzasuCut, FolderCut} from './compsShort3';
import {FourMinCut, ToolsSkillsCut, JaTyCut} from './compsShort4';
import {ThumbA, ThumbB, ThumbC} from './compsThumb';
import {Hook5, InterludeStorm, InterludePayoff, Badge5, VsSplit5, CtaDm5} from './compsShort5';
import {Rolka1Fx} from './compsRolka1';
import {Rolka2Fx} from './compsRolka2';
import {Rolka3Fx} from './compsRolka3';
import {Porownanie} from './compsPorownanie';
import {
  ChapterLabel, MultiCountUp, LightSweep, BadgeDwaKolory, KartaCzasu, StrzalkaWskaznik,
  GlitchText, ScrambleText, MarkerHighlight, MoneyCounter, TypewriterCard, EmojiBurst,
} from './compsBiblioteka';
import {
  HookSlam, SlowoBomba, InterludeWymowka, BadgePrawda, VsKlienci,
  InterludeSystem, StrikePolecenia,
} from './compsSezon';
import {
  SlamSlowo, ListaCheck, Przekreslenie, KartaWyniku, KoloZakreslenie, DwieKolumny,
  DymekKomentarza, PasekEtapow, Stempel, CyfraKroku, PodkreslenieReczne,
  PytanieOdpowiedz, Ticker, Odliczanie, TrzyIkony, Cytat,
} from './compsBiblioteka2';
import {
  ScenaTeza, ScenaKontra, ScenaLista, ScenaLiczba,
  ScenaProblem, ScenaKroki, ScenaKomentarz, ScenaCta,
} from './compsSceny';
import {
  KartaTeza, KartaLiczba, PigulkiNie, BadgeIkona, MockupPlik, KartaZamiana, WYS_KARTY,
} from './compsKarty';
import {
  SekwencjaPelna, SekwencjaNakladka, SekwencjaChecklista, SekwencjaTerminal,
} from './compsSekwencje';
import {
  GrafPierscien, GrafSuwak, GrafSlupki, GrafPowiadomienia, GrafKonto,
} from './compsGrafiki';

const FPS = 60;

export const Root: React.FC = () => {
  return (
    <>
      <Composition id="hook" component={Hook} durationInFrames={Math.round(3.3 * FPS)} fps={FPS} width={1080} height={1920} />
      <Composition id="interlude1" component={Interlude1} durationInFrames={Math.round(3.5 * FPS)} fps={FPS} width={1080} height={1920} />
      <Composition id="interlude2" component={Interlude2} durationInFrames={Math.round(6.95 * FPS)} fps={FPS} width={1080} height={1920} />
      <Composition id="ctadm" component={CtaDm} durationInFrames={Math.round(5.9 * FPS)} fps={FPS} width={1080} height={760} />
      <Composition
        id="badge1"
        component={Badge}
        durationInFrames={Math.round(2.4 * FPS)}
        fps={FPS}
        width={1080}
        height={320}
        defaultProps={{icon: '👥', text: 'KLIENCI WCIĄŻ SĄ'}}
      />
      <Composition
        id="badge2"
        component={Badge}
        durationInFrames={Math.round(2.48 * FPS)}
        fps={FPS}
        width={1080}
        height={320}
        defaultProps={{icon: '⚠️', text: 'SAME POLECENIA TO RYZYKO'}}
      />
      {/* --- montaz 2 (AI zdjęcia) --- */}
      <Composition id="hook2" component={Hook2} durationInFrames={Math.round(6.9 * FPS)} fps={FPS} width={1080} height={1920} />
      <Composition id="promptbad" component={PromptBad} durationInFrames={Math.round(7.1 * FPS)} fps={FPS} width={1080} height={1920} />
      <Composition id="promptgood" component={PromptGood} durationInFrames={Math.round(11.0 * FPS)} fps={FPS} width={1080} height={900} />
      <Composition id="payoff2" component={Payoff2} durationInFrames={Math.round(5.9 * FPS)} fps={FPS} width={1080} height={1920} />
      <Composition id="ctacomment" component={CtaComment} durationInFrames={Math.round(5.6 * FPS)} fps={FPS} width={1080} height={400} />
      <Composition
        id="badge3"
        component={Badge}
        durationInFrames={Math.round(3.0 * FPS)}
        fps={FPS}
        width={1080}
        height={320}
        defaultProps={{icon: '💡', text: 'ZADBAJ O OŚWIETLENIE'}}
      />
      <Composition
        id="badge4"
        component={Badge}
        durationInFrames={Math.round(2.4 * FPS)}
        fps={FPS}
        width={1080}
        height={320}
        defaultProps={{icon: '🤖', text: 'WEJDŹ W SENSOWNE AI'}}
      />
      <Composition
        id="badge5"
        component={Badge}
        durationInFrames={Math.round(3.0 * FPS)}
        fps={FPS}
        width={1080}
        height={320}
        defaultProps={{icon: '⚙️', text: 'AI ROBI CAŁĄ ROBOTĘ'}}
      />
      <Composition
        id="badge6"
        component={Badge}
        durationInFrames={Math.round(2.8 * FPS)}
        fps={FPS}
        width={1080}
        height={320}
        defaultProps={{icon: '📷', text: 'BAZA MUSI BYĆ NIEZŁA'}}
      />
      {/* --- montaz 3 (piec latem nie zimą) --- */}
      <Composition id="hook3" component={Hook3} durationInFrames={Math.round(3.4 * FPS)} fps={FPS} width={1080} height={1920} />
      <Composition id="winterpanel" component={WinterPanel} durationInFrames={Math.round(4.2 * FPS)} fps={FPS} width={1080} height={1920} />
      <Composition id="vssplit" component={VsSplit} durationInFrames={Math.round(3.0 * FPS)} fps={FPS} width={1080} height={1920} />
      <Composition id="ctayt" component={CtaYoutube} durationInFrames={Math.round(7.4 * FPS)} fps={FPS} width={1080} height={500} />
      <Composition id="bkonk" component={Badge} durationInFrames={Math.round(2.8 * FPS)} fps={FPS} width={1080} height={320} defaultProps={{icon: '🔥', text: 'WSZYSCY SIĘ REKLAMUJĄ'}} />
      <Composition id="bzero" component={Badge} durationInFrames={Math.round(2.6 * FPS)} fps={FPS} width={1080} height={320} defaultProps={{icon: '☀️', text: 'ZERO KONKURENCJI'}} />
      <Composition id="bklient" component={Badge} durationInFrames={Math.round(2.8 * FPS)} fps={FPS} width={1080} height={320} defaultProps={{icon: '🧠', text: 'SENSOWNY KLIENT'}} />
      <Composition id="blampka" component={Badge} durationInFrames={Math.round(3.0 * FPS)} fps={FPS} width={1080} height={320} defaultProps={{icon: '💡', text: 'SAM CHCE WYMIENIĆ PIEC'}} />
      {/* --- KURS long-form (16:9) --- */}
      <Composition id="enuminterlude" component={EnumInterlude} durationInFrames={Math.round(22.5 * FPS)} fps={FPS} width={1920} height={1080} />
      <Composition id="coffeepayoff" component={CoffeePayoff} durationInFrames={Math.round(11 * FPS)} fps={FPS} width={1920} height={1080} />
      {/* --- KURS: sceny VS Code z animowaną myszką (16:9) --- */}
      <Composition
        id="vscodeext"
        component={MouseScreen}
        durationInFrames={Math.round(12 * FPS)}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{
          src: 'vscode-ext.png',
          zoomTo: {x: 200, y: 240, scale: 1.14},
          waypoints: [
            {x: 1000, y: 620, t: 0},
            {x: 34, y: 316, t: 150, click: true},
            {x: 195, y: 205, t: 245, click: true},
            {x: 195, y: 205, t: 720},
          ],
          highlights: [
            {x: 58, y: 168, w: 286, h: 92, from: 245, to: 720, label: 'WTYCZKA CLAUDE'},
          ],
        }}
      />
      <Composition
        id="vscodeopen"
        component={MouseScreen}
        durationInFrames={Math.round(5.5 * FPS)}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{
          src: 'vscode-open.png',
          zoomTo: {x: 1520, y: 640, scale: 1.08},
          command: {text: '/init', from: 24, kicker: 'WPISZ TĘ KOMENDĘ', y: 330},
          waypoints: [
            {x: 900, y: 600, t: 0},
            {x: 1520, y: 905, t: 120, click: true},
            {x: 1520, y: 905, t: 330},
          ],
          highlights: [
            {x: 1150, y: 872, w: 730, h: 74, from: 120, to: 330, label: 'GDZIE WPISAĆ', labelSide: 'top'},
          ],
        }}
      />
      {/* --- KURS: karty sekcji Narzędzia (16:9) --- */}
      {/* --- KURS część 2 --- */}
      <Composition
        id="cmdgithub"
        component={MouseScreen}
        durationInFrames={Math.round(8.7 * FPS)}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{
          src: 'vscode-open.png',
          zoomTo: {x: 1520, y: 640, scale: 1.06},
          command: {text: 'git clone https://github.com/[...]', from: 30, kicker: 'WKLEJ DO CLAUDE', y: 320},
          waypoints: [
            {x: 900, y: 600, t: 0},
            {x: 1520, y: 905, t: 170, click: true},
            {x: 1520, y: 905, t: 522},
          ],
          highlights: [
            {x: 1150, y: 872, w: 730, h: 74, from: 170, to: 522, label: 'WKLEJ TUTAJ', labelSide: 'top'},
          ],
        }}
      />
      {/* --- KURS część 3 --- */}
      <Composition id="flowcard" component={FlowCard} durationInFrames={Math.round(11 * FPS)} fps={FPS} width={1920} height={1080} />
      <Composition id="askclaude" component={AskClaudeCard} durationInFrames={Math.round(9 * FPS)} fps={FPS} width={1920} height={1080} />
      <Composition id="stylecmds" component={StyleCommandsCard} durationInFrames={Math.round(8.5 * FPS)} fps={FPS} width={1920} height={1080} />
      <Composition id="fastcard" component={FastCard} durationInFrames={Math.round(8.5 * FPS)} fps={FPS} width={1920} height={1080} />
      <Composition id="shottip" component={ScreenshotTipCard} durationInFrames={Math.round(7 * FPS)} fps={FPS} width={1920} height={1080} />
      {/* --- SHORT 1 (reklama pionowa 9:16) --- */}
      <Composition id="s1pains" component={PainsCut} durationInFrames={Math.round(6 * FPS)} fps={FPS} width={1080} height={1920} />
      <Composition id="s1feat" component={FeaturesCut} durationInFrames={Math.round(2.6 * FPS)} fps={FPS} width={1080} height={1920} />
      <Composition id="s1coffee" component={CoffeeCut} durationInFrames={Math.round(2.6 * FPS)} fps={FPS} width={1080} height={1920} />
      <Composition id="s1cta" component={CtaShort} durationInFrames={Math.round(2.5 * FPS)} fps={FPS} width={1080} height={1920} />
      {/* --- SHORT 2 --- */}
      <Composition id="s2pains" component={Pains2Cut} durationInFrames={Math.round(4.2 * FPS)} fps={FPS} width={1080} height={1920} />
      <Composition id="s2money" component={TimeMoneyCut} durationInFrames={Math.round(6 * FPS)} fps={FPS} width={1080} height={1920} />
      <Composition id="s2coffee" component={CoffeeCut} durationInFrames={Math.round(4.6 * FPS)} fps={FPS} width={1080} height={1920} />
      <Composition id="s2cta" component={CtaShort} durationInFrames={Math.round(3 * FPS)} fps={FPS} width={1080} height={1920} />
      {/* --- SHORT 3 --- */}
      <Composition id="s3strata" component={StrataCzasuCut} durationInFrames={Math.round(6.2 * FPS)} fps={FPS} width={1080} height={1920} />
      <Composition id="s3style" component={FeaturesCut} durationInFrames={Math.round(7.2 * FPS)} fps={FPS} width={1080} height={1920} />
      <Composition id="s3pains" component={Pains2Cut} durationInFrames={Math.round(5.7 * FPS)} fps={FPS} width={1080} height={1920} />
      <Composition id="s3folder" component={FolderCut} durationInFrames={Math.round(7.2 * FPS)} fps={FPS} width={1080} height={1920} />
      <Composition id="s3coffee" component={CoffeeCut} durationInFrames={Math.round(4 * FPS)} fps={FPS} width={1080} height={1920} />
      <Composition id="s3cta" component={CtaShort} durationInFrames={Math.round(2.8 * FPS)} fps={FPS} width={1080} height={1920} />
      {/* --- SHORT 4 --- */}
      <Composition id="s4four" component={FourMinCut} durationInFrames={Math.round(5.6 * FPS)} fps={FPS} width={1080} height={1920} />
      <Composition id="s4coffee" component={CoffeeCut} durationInFrames={Math.round(4.8 * FPS)} fps={FPS} width={1080} height={1920} />
      <Composition id="s4tools" component={ToolsSkillsCut} durationInFrames={Math.round(5.7 * FPS)} fps={FPS} width={1080} height={1920} />
      <Composition id="s4jaty" component={JaTyCut} durationInFrames={Math.round(6.7 * FPS)} fps={FPS} width={1080} height={1920} />
      <Composition id="s4cta" component={CtaShort} durationInFrames={Math.round(4.7 * FPS)} fps={FPS} width={1080} height={1920} />
      {/* --- VSL na stronę kursu (16:9) --- */}
      <Composition id="thumbA" component={ThumbA} durationInFrames={1} fps={FPS} width={1280} height={720} />
      <Composition id="thumbB" component={ThumbB} durationInFrames={1} fps={FPS} width={1280} height={720} />
      <Composition id="thumbC" component={ThumbC} durationInFrames={1} fps={FPS} width={1280} height={720} />
      {/* --- KURS część 4 (koniec) --- */}
      {/* --- SHORT 5 (20.07 social media) --- */}
      <Composition id="s5hook" component={Hook5} durationInFrames={Math.round(2.3 * FPS)} fps={FPS} width={1080} height={1920} />
      <Composition id="s5storm" component={InterludeStorm} durationInFrames={Math.round(4.4 * FPS)} fps={FPS} width={1080} height={1920} />
      <Composition id="s5payoff" component={InterludePayoff} durationInFrames={Math.round(3.6 * FPS)} fps={FPS} width={1080} height={1920} />
      <Composition id="s5vs" component={VsSplit5} durationInFrames={Math.round(3.2 * FPS)} fps={FPS} width={1080} height={1920} />
      <Composition id="s5cta" component={CtaDm5} durationInFrames={Math.round(3.4 * FPS)} fps={FPS} width={1080} height={760} />
      <Composition
        id="s5badge"
        component={Badge5}
        durationInFrames={Math.round(2.4 * FPS)}
        fps={FPS}
        width={1080}
        height={320}
        defaultProps={{icon: '📱', text: 'DZIECI ROSNĄ W SOCIAL MEDIA'}}
      />
      <Composition
        id="s5badgeplan"
        component={Badge5}
        durationInFrames={Math.round(2.3 * FPS)}
        fps={FPS}
        width={1080}
        height={320}
        defaultProps={{icon: '🛡️', text: 'MASZ PLAN B?'}}
      />
      <Composition
        id="s5badgetech"
        component={Badge5}
        durationInFrames={Math.round(2.3 * FPS)}
        fps={FPS}
        width={1080}
        height={320}
        defaultProps={{icon: '⚙️', text: 'TECHNOLOGIA IDZIE DO PRZODU'}}
      />
      <Composition
        id="s5badgehard"
        component={Badge5}
        durationInFrames={Math.round(1.9 * FPS)}
        fps={FPS}
        width={1080}
        height={320}
        defaultProps={{icon: '⚠️', text: 'BEZ TEGO BĘDZIE CIĘŻKO'}}
      />
      {/* --- rolka 1 (montaz AI): pelna sciezka efektow z alfa --- */}
      <Composition
        id="rolka1fx"
        component={Rolka1Fx}
        durationInFrames={Math.round(59.6 * FPS)}
        fps={FPS}
        width={1080}
        height={1920}
      />
      {/* --- rolka 2 (jak montuje AI): split-screen + animowane UI --- */}
      <Composition
        id="rolka2fx"
        component={Rolka2Fx}
        durationInFrames={Math.round(87.55 * FPS)}
        fps={FPS}
        width={1080}
        height={1920}
      />
      {/* --- rolka 3 (hook 31s "widzisz te rolki u gory") --- */}
      <Composition
        id="rolka3fx"
        component={Rolka3Fx}
        durationInFrames={Math.round(31.06 * FPS)}
        fps={FPS}
        width={1080}
        height={1920}
      />
      {/* --- porownanie surowy vs AI (31s, audio z wersji AI) --- */}
      <Composition
        id="porownanie"
        component={Porownanie}
        durationInFrames={Math.round(31.06 * FPS)}
        fps={FPS}
        width={1080}
        height={1920}
      />
      {/* --- porownanie promujace kurs (zwykly vs po kursie) --- */}

      {/* ============ BIBLIOTEKA OGOLNA (sterowana propsami) ============
          Podmiana tresci bez pisania nowego komponentu:
            npx remotion render src/index.ts marker out.mov --props='{"tekst":"HASLO"}'
      */}
      <Composition id="chapter-label" component={ChapterLabel} durationInFrames={Math.round(3.0 * FPS)} fps={FPS} width={1080} height={1920} />
      <Composition id="multi-countup" component={MultiCountUp} durationInFrames={Math.round(4.0 * FPS)} fps={FPS} width={1080} height={1920} />
      <Composition id="light-sweep" component={LightSweep} durationInFrames={Math.round(1.6 * FPS)} fps={FPS} width={1080} height={1920} />
      <Composition id="badge-2kolory" component={BadgeDwaKolory} durationInFrames={Math.round(3.5 * FPS)} fps={FPS} width={1080} height={520} />
      <Composition id="karta-czasu" component={KartaCzasu} durationInFrames={Math.round(1.8 * FPS)} fps={FPS} width={1080} height={1920} />
      <Composition id="strzalka" component={StrzalkaWskaznik} durationInFrames={Math.round(2.2 * FPS)} fps={FPS} width={1080} height={1920} />
      <Composition id="glitch" component={GlitchText} durationInFrames={Math.round(1.4 * FPS)} fps={FPS} width={1080} height={1920} />
      <Composition id="scramble" component={ScrambleText} durationInFrames={Math.round(2.4 * FPS)} fps={FPS} width={1080} height={1920} />
      <Composition id="marker" component={MarkerHighlight} durationInFrames={Math.round(2.6 * FPS)} fps={FPS} width={1080} height={1920} />
      <Composition id="money-counter" component={MoneyCounter} durationInFrames={Math.round(3.2 * FPS)} fps={FPS} width={1080} height={1920} />
      <Composition id="typewriter" component={TypewriterCard} durationInFrames={Math.round(4.5 * FPS)} fps={FPS} width={1080} height={1920} />
      <Composition id="emoji-burst" component={EmojiBurst} durationInFrames={Math.round(2.0 * FPS)} fps={FPS} width={1080} height={1920} />

      {/* ==== WZORZEC: efekty pisane pod KONKRETNA rolke (patrz compsSezon.tsx) ==== */}
      <Composition id="sz-hook" component={HookSlam} durationInFrames={Math.round(2.6 * FPS)} fps={FPS} width={1080} height={1920} />
      <Composition id="sz-bomba" component={SlowoBomba} durationInFrames={Math.round(1.6 * FPS)} fps={FPS} width={1080} height={1920} />
      <Composition id="sz-wymowka" component={InterludeWymowka} durationInFrames={Math.round(3.2 * FPS)} fps={FPS} width={1080} height={1920} />
      <Composition id="sz-prawda" component={BadgePrawda} durationInFrames={Math.round(2.9 * FPS)} fps={FPS} width={1080} height={1920} />
      <Composition id="sz-vs" component={VsKlienci} durationInFrames={Math.round(3.6 * FPS)} fps={FPS} width={1080} height={1920} />
      <Composition id="sz-strike" component={StrikePolecenia} durationInFrames={Math.round(2.6 * FPS)} fps={FPS} width={1080} height={1920} />
      <Composition id="sz-system" component={InterludeSystem} durationInFrames={Math.round(4.4 * FPS)} fps={FPS} width={1080} height={1920} />

      {/* ==== BIBLIOTEKA 2: efekty dobierane automatycznie przez plan-efektow.mjs ====
           Wszystkie sterowane propsami, wszystkie same ustawiaja sie w kadrze tak,
           zeby nie wejsc na twarz. Renderuj z --props='{"tekst":"..."}'. */}
      <Composition id="fx-slam" component={SlamSlowo} durationInFrames={Math.round(1.9 * FPS)} fps={FPS} width={1080} height={1920} defaultProps={{tekst: 'BEZ KOMBINOWANIA'}} />
      <Composition id="fx-lista" component={ListaCheck} durationInFrames={Math.round(3.4 * FPS)} fps={FPS} width={1080} height={1920} defaultProps={{punkty: ['NAGRYWASZ', 'WRZUCASZ PLIK', 'GOTOWE']}} />
      <Composition id="fx-przekreslenie" component={Przekreslenie} durationInFrames={Math.round(2.2 * FPS)} fps={FPS} width={1080} height={1920} defaultProps={{tekst: 'DROGI MONTAŻYSTA'}} />
      <Composition id="fx-wynik" component={KartaWyniku} durationInFrames={Math.round(2.8 * FPS)} fps={FPS} width={1080} height={1920} defaultProps={{liczba: '24 ZŁ', podpis: 'KOSZT JEDNEGO LEADA'}} />
      <Composition id="fx-kolo" component={KoloZakreslenie} durationInFrames={Math.round(2.4 * FPS)} fps={FPS} width={1080} height={1920} defaultProps={{tekst: 'DARMOWE', pozycja: 'dol'}} />
      <Composition id="fx-vs" component={DwieKolumny} durationInFrames={Math.round(3.2 * FPS)} fps={FPS} width={1080} height={1920} defaultProps={{zle: '3 GODZINY', dobre: '4 MINUTY'}} />
      <Composition id="fx-komentarz" component={DymekKomentarza} durationInFrames={Math.round(3.6 * FPS)} fps={FPS} width={1080} height={1920} defaultProps={{nick: 'karol.hvac', tresc: 'MONTAŻ'}} />
      <Composition id="fx-etapy" component={PasekEtapow} durationInFrames={Math.round(3.2 * FPS)} fps={FPS} width={1080} height={1920} defaultProps={{etapy: ['NAGRANIE', 'MONTAŻ', 'PUBLIKACJA']}} />
      <Composition id="fx-stempel" component={Stempel} durationInFrames={Math.round(1.8 * FPS)} fps={FPS} width={1080} height={1920} defaultProps={{tekst: 'FAKT', pozycja: 'dol'}} />
      <Composition id="fx-krok" component={CyfraKroku} durationInFrames={Math.round(2.6 * FPS)} fps={FPS} width={1080} height={1920} defaultProps={{numer: '1', opis: 'WRZUCASZ NAGRANIE'}} />
      <Composition id="fx-podkreslenie" component={PodkreslenieReczne} durationInFrames={Math.round(2.4 * FPS)} fps={FPS} width={1080} height={1920} defaultProps={{tekst: 'JEDNA KOMENDA', pozycja: 'dol'}} />
      <Composition id="fx-pytanie" component={PytanieOdpowiedz} durationInFrames={Math.round(3.0 * FPS)} fps={FPS} width={1080} height={1920} defaultProps={{pytanie: 'ILE TO ZAJMUJE?', odpowiedz: '4 MINUTY'}} />
      <Composition id="fx-ticker" component={Ticker} durationInFrames={Math.round(3.0 * FPS)} fps={FPS} width={1080} height={1920} defaultProps={{tekst: 'MONTAŻ Z AI • BEZ KOMBINOWANIA • '}} />
      <Composition id="fx-odliczanie" component={Odliczanie} durationInFrames={Math.round(2.6 * FPS)} fps={FPS} width={1080} height={1920} defaultProps={{od: 3, podpis: 'TYLE TO ZAJMUJE'}} />
      <Composition id="fx-ikony" component={TrzyIkony} durationInFrames={Math.round(3.0 * FPS)} fps={FPS} width={1080} height={1920} />
      <Composition id="fx-cytat" component={Cytat} durationInFrames={Math.round(3.4 * FPS)} fps={FPS} width={1080} height={1920} defaultProps={{tekst: 'NIE MUSISZ TAŃCZYĆ, ŻEBY MIEĆ ZASIĘGI'}} />

      {/* SCENY PELNOEKRANOWE (cutawaye). Wypelniaja caly kadr i zaslaniaja nagranie.
          To one robia roznice miedzy "nagraniem z napisami" a zmontowana rolka.
          Automat przeplata ciemne z jasnymi. Szczegoly: src/compsSceny.tsx */}
      <Composition id="scena-teza" component={ScenaTeza} durationInFrames={Math.round(3.2 * FPS)} fps={FPS} width={1080} height={1920} defaultProps={{tekst: 'TO JEST NAJWAŻNIEJSZE ZDANIE', etykieta: 'zapamiętaj', klucz: ''}} />
      <Composition id="scena-kontra" component={ScenaKontra} durationInFrames={Math.round(3.6 * FPS)} fps={FPS} width={1080} height={1920} defaultProps={{zleTytul: 'RĘCZNIE', zlePunkty: ['godziny pracy', 'ciągłe poprawki'], dobreTytul: 'Z AI', dobrePunkty: ['kilka minut', 'jedna komenda']}} />
      <Composition id="scena-lista" component={ScenaLista} durationInFrames={Math.round(3.8 * FPS)} fps={FPS} width={1080} height={1920} defaultProps={{punkty: ['nagrywasz', 'wrzucasz plik', 'gotowe'], etykieta: 'jak to działa'}} />
      <Composition id="scena-liczba" component={ScenaLiczba} durationInFrames={Math.round(3.0 * FPS)} fps={FPS} width={1080} height={1920} defaultProps={{liczba: '4 MINUTY', podpis: 'tyle to zajmuje', etykieta: ''}} />
      <Composition id="scena-problem" component={ScenaProblem} durationInFrames={Math.round(3.8 * FPS)} fps={FPS} width={1080} height={1920} defaultProps={{punkty: ['ręczne cięcie', 'szukanie muzyki', 'poprawki w kółko'], etykieta: 'koniec z tym'}} />
      <Composition id="scena-kroki" component={ScenaKroki} durationInFrames={Math.round(3.8 * FPS)} fps={FPS} width={1080} height={1920} defaultProps={{kroki: ['wrzucasz nagranie', 'wpisujesz komendę', 'odbierasz gotowe'], etykieta: 'trzy kroki'}} />
      <Composition id="scena-komentarz" component={ScenaKomentarz} durationInFrames={Math.round(3.4 * FPS)} fps={FPS} width={1080} height={1920} defaultProps={{nick: 'ktos_z_komentarzy', tresc: 'napisz w komentarzu', etykieta: ''}} />
      <Composition id="scena-cta" component={ScenaCta} durationInFrames={Math.round(3.2 * FPS)} fps={FPS} width={1080} height={1920} defaultProps={{haslo: 'ZRÓB TO DZISIAJ', podpis: 'napisz w komentarzu'}} />

      {/* KARTY NAD NAPISAMI. Niska kompozycja (620 px), ktora plan klaadzie nad
          napisami karaoke, wiec napisy NIE musza znikac na czas efektu.
          To jest forma, ktora dominuje w rolkach uznanych za dobre: mala karta
          z ramka, ikona i wlasnym haslem, a nie cytat wielka czcionka.
          Szczegoly: src/compsKarty.tsx */}
      <Composition id="karta-teza" component={KartaTeza} durationInFrames={Math.round(2.8 * FPS)} fps={FPS} width={1080} height={WYS_KARTY} defaultProps={{nadtytul: 'ta rolka, którą oglądasz', tekst: 'ZMONTOWANA PRZEZ AI'}} />
      <Composition id="karta-liczba" component={KartaLiczba} durationInFrames={Math.round(2.8 * FPS)} fps={FPS} width={1080} height={WYS_KARTY} defaultProps={{ikona: '⏳', liczba: '2h+', podpis: 'DZIENNIE NA MONTAŻ'}} />
      <Composition id="pigulki-nie" component={PigulkiNie} durationInFrames={Math.round(3.0 * FPS)} fps={FPS} width={1080} height={WYS_KARTY} defaultProps={{punkty: ['bez cięcia', 'bez efektów'], nadtytul: ''}} />
      <Composition id="badge-ikona" component={BadgeIkona} durationInFrames={Math.round(2.6 * FPS)} fps={FPS} width={1080} height={WYS_KARTY} defaultProps={{ikona: '🚫', tekst: 'NIE MUSISZ SIĘ UCZYĆ'}} />
      <Composition id="mockup-plik" component={MockupPlik} durationInFrames={Math.round(3.4 * FPS)} fps={FPS} width={1080} height={WYS_KARTY} defaultProps={{nazwa: 'nagranie-surowe.mp4', podpis: 'bez cięcia · bez efektów', etykieta: 'montuję...'}} />
      <Composition id="karta-zamiana" component={KartaZamiana} durationInFrames={Math.round(3.4 * FPS)} fps={FPS} width={1080} height={WYS_KARTY} defaultProps={{nadtytul: 'montażysta co miesiąc', stare: 'TYSIĄCE ZŁ', nowe: '0 ZŁ', podpis: ''}} />

      {/* Warianty kart zbudowane z komponentow, ktore juz byly w bibliotece,
          ale wisialy na pelnym kadrze i przez to ladowaly na wysokosci napisow.
          Tutaj dostaja niska kompozycje i pozycje 'srodek', wiec plan kladzie
          je co do piksela w pasie miedzy broda a napisami. Powod dolozenia:
          przy szesciu kartach automat wyczerpywal pule w polowie rolki
          i powtarzal ten sam efekt. Dwa kolejne warianty (k-pytanie, k-krok)
          zostaly odrzucone: w niskiej kompozycji renderowaly sie puste. */}
      <Composition id="k-wynik" component={KartaWyniku} durationInFrames={Math.round(2.8 * FPS)} fps={FPS} width={1080} height={WYS_KARTY} defaultProps={{liczba: '24 ZŁ', podpis: 'KOSZT JEDNEGO LEADA', pozycja: 'srodek'}} />
      <Composition id="k-lista" component={ListaCheck} durationInFrames={Math.round(3.4 * FPS)} fps={FPS} width={1080} height={WYS_KARTY} defaultProps={{punkty: ['NAGRYWASZ', 'GOTOWE'], pozycja: 'srodek'}} />
      <Composition id="k-komentarz" component={DymekKomentarza} durationInFrames={Math.round(3.4 * FPS)} fps={FPS} width={1080} height={WYS_KARTY} defaultProps={{nick: 'twoj.profil', tresc: 'NAPISZ', pozycja: 'srodek'}} />

      {/* SEKWENCJE: efekty, ktore NARASTAJA przez 5-7 sekund, dokladajac
          elementy w rytm mowy. To jest forma, ktora dominuje w rolkach uznanych
          przez autora za dobre, i ktorej automat w ogole nie mial. Szczegoly
          i przyklady z gotowych rolek: src/compsSekwencje.tsx */}
      <Composition id="sekw-pelna" component={SekwencjaPelna} durationInFrames={Math.round(6.0 * FPS)} fps={FPS} width={1080} height={1920} defaultProps={{etykieta: 'ręcznie = strata', pozycje: [{ikona: '⏰', tekst: 'dużo czasu'}, {ikona: '💸', tekst: 'sporo kasy'}], puenta: '', jasne: true}} />
      <Composition id="sekw-przekreslona" component={SekwencjaPelna} durationInFrames={Math.round(6.0 * FPS)} fps={FPS} width={1080} height={1920} defaultProps={{etykieta: 'koniec z tym', pozycje: [{ikona: '🎓', tekst: 'uczenia się montażu', przekreslone: true}, {ikona: '🎬', tekst: 'robienia efektów', przekreslone: true}], puenta: '', jasne: true}} />
      <Composition id="sekw-checklista" component={SekwencjaChecklista} durationInFrames={Math.round(6.5 * FPS)} fps={FPS} width={1080} height={1920} defaultProps={{etykieta: 'co robię', punkty: ['CIĘCIA', 'EFEKTY', 'ANIMACJE', 'MUZYKA'], jasne: false}} />
      <Composition id="sekw-nakladka" component={SekwencjaNakladka} durationInFrames={Math.round(4.0 * FPS)} fps={FPS} width={1080} height={300} defaultProps={{pozycje: [{ikona: '✅', tekst: 'montaż to dobra umiejętność'}, {ikona: '⏳', tekst: 'ale nie za cenę 3 godzin'}], etykieta: ''}} />
      <Composition id="sekw-terminal" component={SekwencjaTerminal} durationInFrames={Math.round(4.4 * FPS)} fps={FPS} width={1080} height={300} defaultProps={{tytul: 'AI MONTUJE', kroki: ['analizuję nagranie', 'wycinam ciszę i wpadki', 'dokładam napisy']}} />

      {/* GRAFIKI, KTORE ILUSTRUJA. Nie tekst w ramce, tylko rysunek pokazujacy
          to, o czym mowi mowiacy: pierscien dobiegajacy do wartosci, suwak na
          skali, rosnace slupki, wpadajace wiadomosci, mockup konta.
          Szczegoly: src/compsGrafiki.tsx */}
      <Composition id="graf-pierscien" component={GrafPierscien} durationInFrames={Math.round(4.2 * FPS)} fps={FPS} width={1080} height={1920} defaultProps={{nadtytul: 'cały montaż zajmuje', wartosc: '4 MIN', podpis: '', jasne: false}} />
      <Composition id="graf-suwak" component={GrafSuwak} durationInFrames={Math.round(4.2 * FPS)} fps={FPS} width={1080} height={1920} defaultProps={{nadtytul: 'czas realizacji', wartosc: '48 H', opis: 'maksymalnie', skala: ['0 h', '12 h', '24 h', '36 h', '48 h'], jasne: true}} />
      <Composition id="graf-slupki" component={GrafSlupki} durationInFrames={Math.round(4.6 * FPS)} fps={FPS} width={1080} height={1920} defaultProps={{nadtytul: 'zasięgi miesiąc po miesiącu', jasne: false}} />
      <Composition id="graf-powiadomienia" component={GrafPowiadomienia} durationInFrames={Math.round(4.6 * FPS)} fps={FPS} width={1080} height={1920} defaultProps={{nadtytul: 'a potem to wygląda tak', jasne: false}} />
      <Composition id="graf-konto" component={GrafKonto} durationInFrames={Math.round(4.4 * FPS)} fps={FPS} width={1080} height={1920} defaultProps={{nadtytul: 'twoje konto', nick: 'twoja.firma', obserwujacy: 4870, jasne: true}} />
    </>
  );
};
