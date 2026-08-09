#!/usr/bin/env node
/**
 * buduj-filtr.mjs — z krótkiego planu JSON składa i renderuje cały montaż.
 *
 * PO CO TO JEST:
 * Bez tego narzędzia AI musi przy KAŻDYM montażu wypisać od zera kilkaset linii
 * `-filter_complex` i za każdym razem od nowa pamiętać o wszystkich pułapkach
 * ffmpeg. To kosztuje mnóstwo tokenów i co jakiś czas kończy się błędem.
 * Tutaj AI pisze tylko krótki plan, a reszta powstaje sama, z wbudowanymi
 * zabezpieczeniami przed błędami, które kosztowały realne godziny:
 *
 *  - zoom przez `zoompan` (a nie `scale` z wyrażeniem czasowym, które segfaultuje)
 *  - `zoompan` zaczepiony na środku kadru (bez tego obraz zjeżdża w prawo w dół)
 *  - `enable=` na KAŻDEJ nakładce (bez tego element zostaje na ekranie do końca)
 *  - `split` przed każdym rozgałęzieniem (dwa odczyty tego samego labela po cichu
 *    wyłączają inny filtr, np. napisy, na CAŁYM materiale)
 *  - napisy POD cutawayami, żeby pełnoekranowe interludia je zakrywały
 *  - zoom liczony z zapasem i zejście lanczosem, żeby obraz był ostry
 *  - jeden wspólny format audio przed miksem (inaczej mono SFX + stereo muzyka
 *    wywalają `amix` albo dają dźwięk tylko w jednym kanale)
 *  - ducking muzyki pod głosem, limiter i loudness -14 LUFS (poziom pod IG/TT/YT)
 *  - fps i długość brane Z NAGRANIA, nie zgadywane (nagranie 60 fps zmontowane
 *    w 30 fps traci płynność, po której poznaje się dobrą rolkę)
 *
 * UŻYCIE:
 *   node narzedzia/buduj-filtr.mjs plan.json --renderuj          <- zalecane
 *   node narzedzia/buduj-filtr.mjs plan.json                     -> tylko pokaż
 *   node narzedzia/buduj-filtr.mjs plan.json --zapisz montaz     -> montaz.sh + filtr.txt
 *   node narzedzia/buduj-filtr.mjs plan.json --renderuj --szybko -> szybki podgląd
 *
 * `--renderuj` odpala ffmpeg sam, bez skryptu bash. To jedyny wariant, który
 * działa identycznie na Windows bez Git Basha, na macOS i na Linuksie.
 */

import fs from "node:fs";
import path from "node:path";
import {execFileSync, spawnSync} from "node:child_process";
import {stanCzasu} from "./wspolne.mjs";

/* ============================== argumenty ============================== */

const args = process.argv.slice(2);
const planPath = args[0];
if (!planPath || planPath.startsWith("--")) {
  console.error("Podaj plik planu, np.: node narzedzia/buduj-filtr.mjs plan.json --renderuj");
  process.exit(1);
}
const flaga = (n) => args.includes(n);
const wartosc = (n) => {
  const i = args.indexOf(n);
  return i !== -1 ? args[i + 1] : null;
};
const zapiszNazwa = wartosc("--zapisz");
const renderuj = flaga("--renderuj");
const szybko = flaga("--szybko");

if (!fs.existsSync(planPath)) {
  console.error(`Nie ma pliku planu: ${planPath}`);
  process.exit(1);
}

let plan;
try {
  plan = JSON.parse(fs.readFileSync(planPath, "utf8"));
} catch (e) {
  console.error("Plan nie jest poprawnym JSON-em: " + e.message);
  console.error("Najczęstsze przyczyny: przecinek po ostatnim elemencie, brak cudzysłowu przy nazwie pola.");
  process.exit(1);
}

/* ======================= walidacja planu (twarda) =======================
   Literówka w nazwie pola była do tej pory ignorowana po cichu: plan z
   "cutaways" zamiast "cutawaye" renderował się bez ANI JEDNEGO cutawaya
   i nikt nie wiedział dlaczego. Teraz to błąd z podpowiedzią. */

const POLA = {
  glowne: [
    "wejscie", "wyjscie", "dlugosc", "fps", "szerokosc", "wysokosc",
    "napisy", "napisyPrzerwy", "muzyka", "sfx", "zoom", "hook", "punche", "cutawaye",
    "nakladki", "splitscreen", "logo", "glos", "loudness", "notatka"
  ],
  muzyka: ["plik", "glosnosc", "ducking", "fadeIn", "fadeOut", "od"],
  sfx: ["plik", "t", "glosnosc"],
  zoom: ["amplituda", "okres", "wylaczony"],
  hook: ["sila", "czas"],
  punche: ["t", "sila", "czas"],
  cutawaye: ["plik", "od", "do", "audio", "glosnosc"],
  nakladki: ["plik", "od", "do", "x", "y", "szerokosc"],
  splitscreen: ["plik", "od", "do", "panel", "szew"],
  logo: ["plik", "szerokosc", "pozycja", "margines", "od", "do"]
};

function odleglosc(a, b) {
  const m = Array.from({length: a.length + 1}, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) m[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      m[i][j] = Math.min(
        m[i - 1][j] + 1,
        m[i][j - 1] + 1,
        m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
  return m[a.length][b.length];
}

const bledy = [];

function sprawdzKlucze(obiekt, dozwolone, gdzie) {
  for (const k of Object.keys(obiekt)) {
    if (dozwolone.includes(k)) continue;
    const blisko = dozwolone
      .map((d) => [d, odleglosc(k.toLowerCase(), d.toLowerCase())])
      .sort((a, b) => a[1] - b[1])[0];
    const podpowiedz = blisko && blisko[1] <= 4 ? ` Chodziło o "${blisko[0]}"?` : "";
    bledy.push(`Nieznane pole "${k}" w ${gdzie}.${podpowiedz}`);
  }
}

sprawdzKlucze(plan, POLA.glowne, "planie");
if (plan.muzyka) sprawdzKlucze(plan.muzyka, POLA.muzyka, '"muzyka"');
if (plan.zoom) sprawdzKlucze(plan.zoom, POLA.zoom, '"zoom"');
if (plan.hook) sprawdzKlucze(plan.hook, POLA.hook, '"hook"');
if (plan.logo) sprawdzKlucze(plan.logo, POLA.logo, '"logo"');
for (const [nazwa, lista] of [
  ["sfx", plan.sfx], ["punche", plan.punche], ["cutawaye", plan.cutawaye],
  ["nakladki", plan.nakladki], ["splitscreen", plan.splitscreen]
]) {
  if (!lista) continue;
  if (!Array.isArray(lista)) {
    bledy.push(`Pole "${nazwa}" musi być listą (w nawiasach kwadratowych).`);
    continue;
  }
  lista.forEach((el, i) => sprawdzKlucze(el, POLA[nazwa], `"${nazwa}"[${i}]`));
}

if (!plan.wejscie) bledy.push('Brak pola "wejscie" (plik nagrania).');
if (plan.wejscie && !fs.existsSync(plan.wejscie)) bledy.push(`Nie ma pliku wejściowego: ${plan.wejscie}`);
if (plan.napisy && !fs.existsSync(plan.napisy)) bledy.push(`Nie ma pliku napisów: ${plan.napisy}`);
for (const nazwa of ["cutawaye", "nakladki", "sfx", "splitscreen"]) {
  (plan[nazwa] || []).forEach((el, i) => {
    if (el.plik && !fs.existsSync(el.plik)) bledy.push(`Nie ma pliku ${nazwa}[${i}]: ${el.plik}`);
    if (nazwa !== "sfx" && el.od !== undefined && el.do !== undefined && el.do <= el.od)
      bledy.push(`${nazwa}[${i}]: "do" (${el.do}) musi być większe od "od" (${el.od}).`);
  });
}
if (plan.muzyka && plan.muzyka.plik && !fs.existsSync(plan.muzyka.plik))
  bledy.push(`Nie ma pliku muzyki: ${plan.muzyka.plik}`);
if (plan.logo && plan.logo.plik && !fs.existsSync(plan.logo.plik))
  bledy.push(`Nie ma pliku logo: ${plan.logo.plik}`);

if (bledy.length) {
  console.error("PLAN DO POPRAWY:\n");
  bledy.forEach((b) => console.error("  - " + b));
  console.error("\nNic nie renderuję, bo wyszłoby wideo bez części efektów.");
  process.exit(1);
}

/* ==================== co naprawdę jest w nagraniu ====================
   Wcześniej fps brało się z planu (domyślnie 30) i długość też. Nagranie
   z telefonu ma zwykle 60 fps, a zmontowane w 30 wygląda wyraźnie gorzej.
   Nagranie bez ścieżki audio wywalało render błędem "matches no streams".
   Teraz jedno i drugie sprawdzamy w pliku. */

function ffprobe(pytanie, plik) {
  try {
    return execFileSync(
      "ffprobe",
      ["-v", "error", "-of", "default=nw=1:nk=1", ...pytanie, plik],
      {encoding: "utf8"}
    ).trim();
  } catch {
    return "";
  }
}

/* ============ nagranie z nierównym czasem = montaż na chybił trafił ============
   Materiał, który przychodzi od użytkownika, to zwykle kilka dubli sklejonych
   w prostym edytorze albo eksport z telefonu ze zmiennym tempem klatek (VFR).
   Taki plik ma poprzestawiane znaczniki czasu, a wtedy:
     - `enable='between(t,od,do)'` na cutawayach i nakładkach wchodzi w losowym
       momencie albo nie wchodzi wcale,
     - filtr `fps` wyrzuca klatki i gotowe wideo jest krótsze od nagrania.
   Objaw jest cichy: render kończy się bez błędu, tylko efekty są nie tam, gdzie
   powinny. Zmierzone na sklejce zrobionej przez `concat -c copy`: klatka 100
   dostawała czas 3,30 s, klatka 200 dostawała 0,70 s, klatka 300 dostawała
   4,03 s. Dlatego sprawdzamy to z góry i w razie potrzeby przekodowujemy
   nagranie na równe tempo klatek, zanim cokolwiek zaczniemy montować. */

const czas = stanCzasu(plan.wejscie);
if (!czas.zdrowe) {
  const naprawiony = plan.wejscie.replace(/\.[^.]+$/, "") + "-rowne.mp4";
  console.log(`Nagranie jest sklejone tak, że filtry widzą tylko ${czas.widzianyCzas.toFixed(2)} s z ${czas.dlugosc.toFixed(2)} s.`);
  console.log("Efekty trafiałyby w losowe momenty, więc najpierw wyrównuję czas: " + path.basename(naprawiony));
  const r = spawnSync(
    "ffmpeg",
    ["-y", "-hide_banner", "-v", "error", "-fflags", "+genpts", "-i", plan.wejscie,
     "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p",
     "-fps_mode", "cfr", "-c:a", "aac", "-b:a", "192k", naprawiony],
    {stdio: ["ignore", "inherit", "inherit"]}
  );
  if (r.status === 0 && fs.existsSync(naprawiony)) {
    plan.wejscie = naprawiony;
    console.log("Czas wyrównany, montuję z tego pliku.\n");
  } else {
    console.log("Nie udało się wyrównać, montuję z oryginału. Jeśli efekty wypadną nie tam,");
    console.log("gdzie mają, przekoduj nagranie ręcznie i spróbuj jeszcze raz.\n");
  }
}

const maWejscieAudio = ffprobe(["-select_streams", "a:0", "-show_entries", "stream=codec_type"], plan.wejscie) !== "";
const fpsZrodla = (() => {
  const s = ffprobe(["-select_streams", "v:0", "-show_entries", "stream=r_frame_rate"], plan.wejscie);
  if (!s || !s.includes("/")) return null;
  const [a, b] = s.split("/").map(Number);
  return b ? Math.round((a / b) * 100) / 100 : null;
})();
const dlugoscZrodla = Number(ffprobe(["-show_entries", "format=duration"], plan.wejscie)) || null;

/* ---------- domyślne wartości: styl ECHO ---------- */
const D = {
  szerokosc: 1080,
  wysokosc: 1920,
  fps: 60,              // rolki robimy w 60 fps, chyba że nagranie ma mniej
  glos: 1.35,           // wzmocnienie głosu, sprawdzone na realnych rolkach
  muzykaGlosnosc: 0.17,
  sfxGlosnosc: 0.42,
  zoomAmplituda: 0.014, // "oddychający" zoom, ma być ledwo wyczuwalny
  zoomOkres: 7,         // sekundy pełnego cyklu
  hookSila: 0.09,       // mocny najazd na pierwszym zdaniu
  hookCzas: 0.55,
  punchSila: 0.055,     // zoom-punch NA SKLEJCE (nie na akcentach zdań!)
  punchCzas: 0.32,
  szew: 1010,           // granica split-screenu: panel u góry, twarz pod nim
  logoSzerokosc: 150,
  logoMargines: 48
};

const W = plan.szerokosc || D.szerokosc;
const H = plan.wysokosc || D.wysokosc;
// fps: z planu, inaczej z nagrania (ale nie więcej niż 60), inaczej 60.
const FPS = plan.fps || (fpsZrodla ? Math.min(60, Math.max(24, Math.round(fpsZrodla))) : D.fps);
const DL = plan.dlugosc || dlugoscZrodla || 60;
if (!plan.dlugosc && dlugoscZrodla) {
  console.log(`Długość wzięta z nagrania: ${DL.toFixed(2)} s`);
}
if (!plan.fps && fpsZrodla) {
  console.log(`Fps wzięty z nagrania: ${FPS}`);
}
if (!maWejscieAudio) {
  console.log("UWAGA: nagranie nie ma ścieżki dźwiękowej. Podkładam ciszę, żeby render nie padł.");
}

/** Ścieżka bezpieczna dla parsera filtrów ffmpeg (dwukropek dysku na Windows). */
function sciezkaDlaFiltra(p) {
  return "'" + String(p).replace(/\\/g, "/").replace(/:/g, "\\:").replace(/'/g, "\\'") + "'";
}

const katalogRoboczy = path.dirname(path.resolve(zapiszNazwa || planPath));
const czesci = [];
const wejscia = [];      // { plik, przed: [...flagi przed -i] }
function dodajWejscie(plik, przed = []) {
  wejscia.push({plik, przed});
  return wejscia.length - 1;
}
dodajWejscie(plan.wejscie);

const czyObrazek = (p) => /\.(png|jpg|jpeg|webp|bmp)$/i.test(String(p));
/** Flagi wejścia dla nieruchomego obrazu: zapętlony, w docelowym tempie klatek. */
let flagiObrazka = () => ["-framerate", String(FPS), "-loop", "1"];

/**
 * Przesunięcie warstwy w czasie.
 * NIE przez `setpts=PTS+od/TB`: tak przesunięty strumień nie ma żadnej klatki
 * przed czasem `od`, a `overlay` czeka wtedy na pierwszą klatkę drugiego
 * wejścia i cała nakładka potrafi się nie pojawić w ogóle (tak zniknął
 * split-screen w testach). `tpad` dokłada puste klatki na początku, więc
 * strumień istnieje od zera i `overlay` ma z czym pracować od razu.
 * Obrazki wchodzą z `-loop 1`, są nieskończone i nie wymagają przesuwania.
 */
function przesun(plik, od, przezroczyste = false) {
  if (czyObrazek(plik) || !od) return "";
  return `tpad=start_duration=${od}:start_mode=add:color=${przezroczyste ? "black@0" : "black"},`;
}

/* ================== 1. baza: zoom oddychający + snap + punche ==================
   JAKOŚĆ: zoompan powiększa obraz, więc gdyby najpierw zejść do docelowych
   1080x1920, zoom rozciągałby już zmniejszony materiał i obraz byłby miękki.
   Dlatego pracujemy z zapasem 1.5x i schodzimy na końcu filtrem lanczos. */

let zoomWyr = "1.0";
const z = plan.zoom || {};
const amp = z.amplituda !== undefined ? z.amplituda : D.zoomAmplituda;
const okres = z.okres || D.zoomOkres;
if (z.wylaczony !== true) {
  // UWAGA: zmienna nazywa się `time`, nie `t`. Z `t` ffmpeg 8.x pada.
  zoomWyr += `+${amp}*sin(2*PI*time/${okres})`;
}

// Hook: mocny najazd na pierwszym zdaniu, wygasający. Bez tego początek rolki
// jest "płaski" i pierwsze sekundy nie trzymają.
if (plan.hook !== false) {
  const h = plan.hook || {};
  const hs = h.sila !== undefined ? h.sila : D.hookSila;
  const hc = h.czas !== undefined ? h.czas : D.hookCzas;
  if (hs > 0) zoomWyr += `+if(lt(time,${hc * 3}),${hs}*exp(-time/${(hc / 3).toFixed(3)}),0)`;
}

// Punche stawiamy WYŁĄCZNIE tam, gdzie realnie sklejone są dwa ujęcia.
// Listę wygeneruj narzędziem: node narzedzia/wykryj-ciecia.mjs nagranie.mp4
for (const p of plan.punche || []) {
  const sila = p.sila !== undefined ? p.sila : D.punchSila;
  const czas = p.czas !== undefined ? p.czas : D.punchCzas;
  zoomWyr += `+if(between(time,${p.t},${p.t + czas}),${sila}*exp(-(time-${p.t})*${(3 / czas).toFixed(2)}),0)`;
}

const WP = Math.round((W * 1.5) / 2) * 2;
const HP = Math.round((H * 1.5) / 2) * 2;

// ZACZEPIENIE ZOOMU: bez jawnych x/y zoompan powiększa od LEWEGO GÓRNEGO ROGU,
// przez co przy każdym najeździe obraz zjeżdża w dół i w prawo. Wygląda to jak
// dziwne szarpnięcie ekranu. Te dwa wyrażenia trzymają zoom na środku kadru.
const zX = `iw/2-(iw/zoom/2)`;
const zY = `ih/2-(ih/zoom/2)`;

czesci.push(
  `[0:v]scale=${WP}:${HP}:force_original_aspect_ratio=increase:flags=lanczos,` +
  `crop=${WP}:${HP},` +
  `zoompan=z='${zoomWyr}':x='${zX}':y='${zY}':d=1:s=${WP}x${HP}:fps=${FPS},` +
  `scale=${W}:${H}:flags=lanczos,setsar=1[baza]`
);
let biezacy = "baza";

/* ==================== 2. napisy (POD interludiami) ====================
   Napisy idą zaraz po bazie, żeby pełnoekranowe interludium je zakryło.
   Tak wymaga styl: pod slamami i w interludiach napisów nie ma.

   `napisyPrzerwy` to okna, w których napis MUSI zniknąć, bo w tym miejscu
   wjeżdża wielki napis-efekt (slam, przekreślenie, zakreślenie). Bez tego
   dwa teksty leżą jeden na drugim i kadr wygląda jak wypadek. Zamiast
   kombinować z włączaniem filtra w czasie, po prostu odsiewamy kolidujące
   linijki do kopii pliku napisów — działa pewnie w każdej wersji ffmpeg. */
if (plan.napisy) {
  let plikNapisow = plan.napisy;
  const przerwy = plan.napisyPrzerwy || [];
  if (przerwy.length) {
    const czasNaSekundy = (t) => {
      const [g, m, sek] = t.split(":");
      return Number(g) * 3600 + Number(m) * 60 + Number(sek);
    };
    const zrodlo = fs.readFileSync(plikNapisow, "utf8").split(/\r?\n/);
    let wyciete = 0;
    const wynik = zrodlo.filter((linia) => {
      if (!linia.startsWith("Dialogue:")) return true;
      const czesci = linia.slice("Dialogue:".length).split(",");
      if (czesci.length < 3) return true;
      const od = czasNaSekundy(czesci[1].trim());
      const doK = czasNaSekundy(czesci[2].trim());
      const koliduje = przerwy.some((p) => doK > p.od + 0.05 && od < p.do - 0.05);
      if (koliduje) wyciete++;
      return !koliduje;
    });
    plikNapisow = path.join(katalogRoboczy, "napisy-bez-kolizji.ass");
    fs.writeFileSync(plikNapisow, wynik.join("\n"), "utf8");
    console.log(`Napisy: wyciąłem ${wyciete} linijek pod wielkimi napisami-efektami.`);
  }
  czesci.push(`[${biezacy}]ass=${sciezkaDlaFiltra(plikNapisow)}[z_napisami]`);
  biezacy = "z_napisami";
}

/* ==================== 3. split-screen: dowód u góry, twarz pod nim ====================
   Najsilniejszy wzorzec z analizy cudzych rolek: górna część kadru to CIĄGLE
   grający dowód (zrzut ekranu, panel, wykres), dolna to twarz. Nie 2-sekundowy
   cutaway, a kilkanaście sekund równolegle.
   UWAGA na `split`: bez niego ten sam label czytany dwa razy potrafi po cichu
   wyłączyć napisy na CAŁYM materiale. */
(plan.splitscreen || []).forEach((s, i) => {
  const idx = dodajWejscie(s.plik, czyObrazek(s.plik) ? flagiObrazka() : []);
  const szew = s.szew || D.szew;
  const hTwarz = H - szew;
  const et = `ss${i}`;
  czesci.push(`[${biezacy}]split=2[${et}_pod][${et}_gora]`);
  // twarz: zjeżdża w dolną część kadru, kadrowana na środku (nie od góry)
  czesci.push(
    `[${et}_gora]crop=iw:ih*0.62:0:ih*0.30,scale=${W}:${hTwarz},` +
    `pad=${W}:${H}:0:${szew}:color=black[${et}_twarz]`
  );
  czesci.push(
    `[${idx}:v]scale=${W}:${szew}:force_original_aspect_ratio=increase,crop=${W}:${szew},` +
    `fps=${FPS},${przesun(s.plik, s.od)}setsar=1[${et}_panel]`
  );
  czesci.push(`[${et}_twarz][${et}_panel]overlay=0:0:eof_action=repeat[${et}_pelny]`);
  czesci.push(
    `[${et}_pod][${et}_pelny]overlay=0:0:enable='between(t,${s.od},${s.do})':eof_action=pass[po_${et}]`
  );
  biezacy = `po_${et}`;
});

/* ==================== 4. cutawaye pełnoekranowe ==================== */
const cutAudio = [];
(plan.cutawaye || []).forEach((c, i) => {
  const idx = dodajWejscie(c.plik);
  const et = `cut${i}`;
  czesci.push(
    `[${idx}:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},fps=${FPS},` +
    `${przesun(c.plik, c.od)}setsar=1[${et}]`
  );
  czesci.push(
    `[${biezacy}][${et}]overlay=0:0:enable='between(t,${c.od},${c.do})':eof_action=pass[po_${et}]`
  );
  biezacy = `po_${et}`;
  // Cutaway z własnym dźwiękiem (np. fragment nagrania ekranu) — wcześniej
  // dźwięk cutawaya ginął bez śladu.
  if (c.audio) cutAudio.push({idx, od: c.od, glosnosc: c.glosnosc !== undefined ? c.glosnosc : 0.9});
});

/* ==================== 5. nakładki z alfą (Remotion), na wierzchu ====================
   `format=yuva420p` + `fps` na nakładce: bez tego ProRes 4444 wchodzący w
   overlay przy innym fps niż baza gubi klatki albo miga. */
(plan.nakladki || []).forEach((n, i) => {
  const idx = dodajWejscie(n.plik, czyObrazek(n.plik) ? flagiObrazka() : []);
  const et = `nak${i}`;
  const x = n.x !== undefined ? n.x : 0;
  const y = n.y !== undefined ? n.y : 0;
  // -2 zamiast -1: nieparzysta wysokość psuje część koderów
  const skala = n.szerokosc ? `scale=${n.szerokosc}:-2,` : "";
  // przesunięcie przezroczyste, żeby doklejone klatki nie były czarnym prostokątem
  czesci.push(`[${idx}:v]${skala}format=yuva420p,fps=${FPS},${przesun(n.plik, n.od, true)}setsar=1[${et}]`);
  // enable na KAŻDEJ nakładce, inaczej zostaje do końca materiału
  czesci.push(
    `[${biezacy}][${et}]overlay=${x}:${y}:enable='between(t,${n.od},${n.do})':eof_action=pass[po_${et}]`
  );
  biezacy = `po_${et}`;
});

/* ==================== 6. logo w rogu (brand bug) ==================== */
if (plan.logo && plan.logo.plik) {
  const l = plan.logo;
  const idx = dodajWejscie(l.plik, flagiObrazka());
  const sz = l.szerokosc || D.logoSzerokosc;
  const m = l.margines !== undefined ? l.margines : D.logoMargines;
  const poz = {
    "prawy-gorny": [`W-w-${m}`, `${m}`],
    "lewy-gorny": [`${m}`, `${m}`],
    "prawy-dolny": [`W-w-${m}`, `H-h-${m}`],
    "lewy-dolny": [`${m}`, `H-h-${m}`]
  }[l.pozycja || "prawy-gorny"] || [`W-w-${m}`, `${m}`];
  czesci.push(`[${idx}:v]scale=${sz}:-2,format=yuva420p,fps=${FPS}[logo]`);
  const okno = l.od !== undefined || l.do !== undefined
    ? `:enable='between(t,${l.od || 0},${l.do || DL})'`
    : "";
  czesci.push(`[${biezacy}][logo]overlay=${poz[0]}:${poz[1]}${okno}:eof_action=repeat[po_logo]`);
  biezacy = "po_logo";
}

/* ==================== 7. wyjście wideo ====================
   `fps` na samym końcu, a NIE `-r` przy zapisie pliku. Każda nakładka wnosi
   własne tempo klatek i `overlay` wypuszcza klatkę przy zdarzeniu na dowolnym
   wejściu, więc strumień wychodzi gęstszy niż docelowy. `-r` przy zapisie
   ratował się wtedy wyrzucaniem klatek (`drop=145` w logu) i wideo robiło się
   dwa razy krótsze niż nagranie. `fps` w filtrze porządkuje to bez gubienia. */
czesci.push(`[${biezacy}]fps=${FPS}[wyj_v]`);

/* ==================== 8. audio: głos + muzyka z duckingiem + SFX ====================
   Jeden wspólny format przed miksem. Bez tego mono SFX 44.1 kHz + stereo muzyka
   48 kHz + nagranie z telefonu wywalają `amix` albo dają dźwięk w jednym kanale. */

const FORMAT_AUDIO = "aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo";
const glos = plan.glos !== undefined ? plan.glos : D.glos;
const doMiksu = [];
const zDuckingiem = !!(plan.muzyka && plan.muzyka.plik && plan.muzyka.ducking !== false);

// głos (albo cisza, jeśli nagranie nie ma dźwięku).
// Kopia głosu (`gl_duck`) powstaje TYLKO wtedy, gdy jest czym duckować —
// nieużyty label to błąd renderu.
const zrodloGlosu = maWejscieAudio
  ? "0"
  : String(dodajWejscie("anullsrc=channel_layout=stereo:sample_rate=48000", ["-f", "lavfi"]));
// UWAGA, pułapka: `asetpts=PTS-STARTPTS` PO zmianie próbkowania rozjeżdża zegar
// audio (nagranie 44,1 kHz przeliczane na 48 kHz) i dźwięk urywa się w połowie
// rolki, przy poprawnie długim obrazie. Nie ma tu ani `atrim`, ani `asetpts`:
// długość pilnuje `-t` przy zapisie, a `amix` kończy razem z głosem.
czesci.push(
  `[${zrodloGlosu}:a]${FORMAT_AUDIO}` + (zDuckingiem ? `,asplit=2[gl_a][gl_duck]` : `[gl_a]`)
);
czesci.push(`[gl_a]volume=${glos}[glos]`);
doMiksu.push("glos");

// muzyka: zapętlona (krótki utwór pod dłuższą rolkę to inaczej cisza w drugiej
// połowie), przyciszona, z wejściem i zejściem, schowana pod głosem duckingiem
if (plan.muzyka && plan.muzyka.plik) {
  const m = plan.muzyka;
  const idx = dodajWejscie(m.plik, ["-stream_loop", "-1"]);
  const vol = m.glosnosc !== undefined ? m.glosnosc : D.muzykaGlosnosc;
  const fIn = m.fadeIn !== undefined ? m.fadeIn : 1.2;
  const fOut = m.fadeOut !== undefined ? m.fadeOut : 1.3;
  const stOut = Math.max(0, DL - fOut);
  // wejście od wybranej sekundy utworu: `asetpts` MUSI iść przed zmianą
  // próbkowania, inaczej rozjeżdża zegar (patrz uwaga przy głosie)
  const start = m.od ? `atrim=start=${m.od},asetpts=PTS-STARTPTS,` : "";
  czesci.push(
    `[${idx}:a]${start}${FORMAT_AUDIO},volume=${vol},` +
    `afade=t=in:st=0:d=${fIn},afade=t=out:st=${stOut.toFixed(2)}:d=${fOut}[muz_surowa]`
  );
  if (zDuckingiem) {
    czesci.push(
      `[muz_surowa][gl_duck]sidechaincompress=threshold=0.045:ratio=6:attack=5:release=280[muzyka]`
    );
  } else {
    czesci.push(`[muz_surowa]anull[muzyka]`);
  }
  doMiksu.push("muzyka");
}

// SFX: pop/ding/whoosh na akcentach. To one dają wrażenie "dowalonego" montażu.
// Ten sam plik jest rozdzielany na tyle kopii, ile jest trafień.
const sfx = plan.sfx || [];
if (sfx.length) {
  const poPliku = new Map();
  sfx.forEach((s) => {
    if (!poPliku.has(s.plik)) poPliku.set(s.plik, []);
    poPliku.get(s.plik).push(s);
  });
  let licznik = 0;
  for (const [plik, trafienia] of poPliku) {
    const idx = dodajWejscie(plik);
    const etykiety = trafienia.map(() => `sx${licznik++}`);
    czesci.push(
      `[${idx}:a]${FORMAT_AUDIO}` +
      (etykiety.length > 1 ? `,asplit=${etykiety.length}` : "") +
      etykiety.map((e) => `[${e}_pre]`).join("")
    );
    trafienia.forEach((s, i) => {
      const ms = Math.max(0, Math.round(s.t * 1000));
      const v = s.glosnosc !== undefined ? s.glosnosc : D.sfxGlosnosc;
      czesci.push(`[${etykiety[i]}_pre]adelay=${ms}|${ms},volume=${v}[${etykiety[i]}]`);
      doMiksu.push(etykiety[i]);
    });
  }
}

// dźwięk z cutawayów
cutAudio.forEach((c, i) => {
  const ms = Math.max(0, Math.round(c.od * 1000));
  czesci.push(`[${c.idx}:a]${FORMAT_AUDIO},adelay=${ms}|${ms},volume=${c.glosnosc}[cua${i}]`);
  doMiksu.push(`cua${i}`);
});

// miks + limiter + wyrównanie głośności do poziomu platform (-14 LUFS).
// Bez tego jedna rolka jest cicha, druga przesterowana, a Instagram i tak
// podciąga własnym normalizatorem i wychodzi bałagan.
const loud = plan.loudness === false ? "" : ",loudnorm=I=-14:TP=-1.5:LRA=11";
if (doMiksu.length === 1) {
  czesci.push(`[${doMiksu[0]}]alimiter=limit=0.97${loud}[wyj_a]`);
} else {
  czesci.push(
    `[${doMiksu.map((d) => `${d}`).join("][")}]` +
    `amix=inputs=${doMiksu.length}:duration=first:normalize=0,alimiter=limit=0.97${loud}[wyj_a]`
  );
}

/* ==================== złożenie polecenia ==================== */

const filtr = czesci.join(";\n") + "\n";
const wyjscie = plan.wyjscie || "gotowe.mp4";

// Wysoka jakość: crf 15 plus sufit bitrate'u, żeby szybkie ruchy i ziarno
// nie rozsypywały się w bloki po kompresji Instagrama.
const jakosc = szybko
  ? ["-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p"]
  : ["-c:v", "libx264", "-preset", "slow", "-crf", "15", "-maxrate", "18M", "-bufsize", "36M",
     "-profile:v", "high", "-level", "4.2", "-pix_fmt", "yuv420p", "-movflags", "+faststart"];

const plikFiltra = path.join(katalogRoboczy, "filtr.txt");

function argumentyFfmpeg(sciezkaFiltra) {
  const a = ["-y", "-hide_banner"];
  for (const w of wejscia) a.push(...w.przed, "-i", w.plik);
  a.push("-filter_complex_script", sciezkaFiltra);
  a.push("-map", "[wyj_v]", "-map", "[wyj_a]");
  a.push(...jakosc, "-c:a", "aac", "-b:a", "192k", "-t", String(DL));
  a.push(wyjscie);
  return a;
}

if (renderuj) {
  fs.writeFileSync(plikFiltra, filtr, "utf8");
  const a = argumentyFfmpeg(plikFiltra);
  console.log(`Renderuję: ${wyjscie}  (${DL.toFixed(2)} s, ${FPS} fps${szybko ? ", tryb szybki" : ""})`);
  const r = spawnSync("ffmpeg", a, {stdio: ["ignore", "inherit", "inherit"]});
  if (r.error) {
    console.error("Nie udało się uruchomić ffmpeg: " + r.error.message);
    process.exit(1);
  }
  if (r.status !== 0) {
    console.error(`\nffmpeg zakończył się błędem (kod ${r.status}). Filtr został zapisany w ${plikFiltra}.`);
    process.exit(r.status || 1);
  }
  console.log("\nGotowe: " + wyjscie);
  console.log("Sprawdź efekt: node narzedzia/sprawdz.mjs " + wyjscie);
} else if (zapiszNazwa) {
  fs.writeFileSync(plikFiltra, filtr, "utf8");
  const nazwaSh = zapiszNazwa.endsWith(".sh") ? zapiszNazwa : zapiszNazwa + ".sh";
  const wejsciaArg = wejscia.map((w) => [...w.przed, `-i "${w.plik}"`].join(" ")).join(" ");
  const polecenie =
    `ffmpeg -y -hide_banner ${wejsciaArg} \\\n` +
    `  -filter_complex_script filtr.txt \\\n` +
    `  -map "[wyj_v]" -map "[wyj_a]" \\\n` +
    `  ${jakosc.join(" ")} -c:a aac -b:a 192k -t ${DL} \\\n` +
    `  "${wyjscie}"`;
  fs.writeFileSync(
    nazwaSh,
    "#!/bin/bash\nset -e\nexport MSYS2_ARG_CONV_EXCL=\"*\"\n" + polecenie + "\n",
    "utf8"
  );
  console.log("Zapisane: filtr.txt oraz " + nazwaSh);
  console.log("Uwaga: skrypt .sh wymaga Basha. Pewniejsze na każdym systemie: --renderuj");
} else {
  console.log("=== filtr.txt ===");
  console.log(filtr);
  console.log("=== polecenie ===");
  console.log("ffmpeg " + argumentyFfmpeg("filtr.txt").join(" "));
  console.log("\nDodaj --renderuj, żeby od razu zrenderować.");
}
