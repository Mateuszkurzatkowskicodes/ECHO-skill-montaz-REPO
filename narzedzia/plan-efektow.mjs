#!/usr/bin/env node
/**
 * plan-efektow.mjs — układa gęsty i ZA KAŻDYM RAZEM INNY zestaw efektów.
 *
 * PO CO TO JEST:
 * Dwa najczęstsze grzechy montażu robionego przez AI: efektów jest za mało
 * (rolka wygląda płasko) i za każdym razem są te same trzy (profil wygląda
 * jednostajnie, widz przestaje zauważać). To narzędzie rozwiązuje jedno i drugie:
 *
 *  - GĘSTOŚĆ: rozkłada efekt co kilka sekund, celując w momenty, w których
 *    faktycznie coś się mówi (bierze czasy z gotowych napisów), a nie na slepo.
 *  - RÓŻNORODNOŚĆ: pamięta w pliku, co poszło w poprzednich rolkach, i najpierw
 *    sięga po to, czego dawno nie było. Ten sam efekt nie wraca dwa razy w jednej
 *    rolce, a kolejna rolka startuje od innego zestawu. Muzyka rotuje tak samo.
 *  - DOBÓR DO TREŚCI: liczba w zdaniu dostaje kartę wyniku i dzwonek, kontra
 *    dostaje przekreślenie, wyliczanka dostaje listę z odhaczaniem, końcówka
 *    dostaje mockup komentarza pod CTA.
 *
 * UŻYCIE:
 *   node narzedzia/plan-efektow.mjs nagranie.mp4 --napisy napisy.ass
 *   node narzedzia/plan-efektow.mjs nagranie.mp4 --napisy napisy.ass --muzyka muzyka/
 *   node narzedzia/plan-efektow.mjs nagranie.mp4 --napisy napisy.ass --gestosc 3
 *   node narzedzia/plan-efektow.mjs nagranie.mp4 --napisy napisy.ass --renderuj-efekty
 *
 * Wynik: plan.json gotowy dla buduj-filtr.mjs oraz efekty.json z listą tego,
 * co trzeba wyrenderować w Remotion. Z `--renderuj-efekty` renderuje sam.
 */

import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {dlugoscPliku, tempoKlatek} from "./wspolne.mjs";

/* ============================== argumenty ============================== */

const args = process.argv.slice(2);
const nagranie = args[0];
if (!nagranie || nagranie.startsWith("--")) {
  console.error("Podaj nagranie, np.: node narzedzia/plan-efektow.mjs nagranie.mp4 --napisy napisy.ass");
  process.exit(1);
}
if (!fs.existsSync(nagranie)) {
  console.error(`Nie ma pliku: ${nagranie}`);
  process.exit(1);
}
const wartosc = (n, d = null) => {
  const i = args.indexOf(n);
  return i !== -1 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : d;
};
const flaga = (n) => args.includes(n);

const plikNapisow = wartosc("--napisy");
const folderMuzyki = wartosc("--muzyka");
const folderSfx = wartosc("--sfx", "sfx");
const gestosc = Number(wartosc("--gestosc", "3.5"));
const plikPlanu = wartosc("--zapisz", "plan.json");
const remotionKatalog = wartosc("--remotion", "remotion-montaz");
const renderujEfekty = flaga("--renderuj-efekty");

const katalog = path.dirname(path.resolve(plikPlanu));
const PLIK_HISTORII = path.join(katalog, ".echo-historia-efektow.json");

/* ============================ pule efektów ============================
   `rola` mówi, kiedy efekt ma sens. `pola` to nazwy propsów, które trzeba
   wypełnić treścią. `sfx` to dopasowany dźwięk. `dlugosc` w sekundach musi
   zgadzać się z tym, co jest zarejestrowane w Remotion (Root.tsx). */

const EFEKTY = [
  // mocne akcenty na zdaniu
  {naNapisach: true, id: "fx-slam", rola: "akcent", pola: ["tekst"], dlugosc: 1.9, sfx: "impact"},
  {naNapisach: true, id: "fx-stempel", rola: "akcent", pola: ["tekst"], dlugosc: 1.8, sfx: "impact"},
  {naNapisach: true, id: "fx-podkreslenie", rola: "akcent", pola: ["tekst"], dlugosc: 2.4, sfx: "swipe"},
  {naNapisach: true, id: "fx-kolo", rola: "akcent", pola: ["tekst"], dlugosc: 2.4, sfx: "swipe"},
  {naNapisach: true, id: "marker", rola: "akcent", pola: ["tekst"], dlugosc: 2.6, sfx: "swipe"},
  {naNapisach: true, id: "glitch", rola: "akcent", pola: ["tekst"], dlugosc: 1.4, sfx: "click"},
  {naNapisach: true, id: "scramble", rola: "akcent", pola: ["tekst"], dlugosc: 2.4, sfx: "typing"},

  // liczby i wyniki
  {id: "fx-wynik", rola: "liczba", pola: ["liczba", "podpis"], dlugosc: 2.8, sfx: "ding"},
  {id: "money-counter", rola: "liczba", pola: [], dlugosc: 3.2, sfx: "ding"},
  {id: "multi-countup", rola: "liczba", pola: [], dlugosc: 4.0, sfx: "ding"},
  {id: "fx-odliczanie", rola: "liczba", pola: ["podpis"], dlugosc: 2.6, sfx: "click"},

  // kontrast, "nie tak, a tak"
  {naNapisach: true, id: "fx-przekreslenie", rola: "kontra", pola: ["tekst"], dlugosc: 2.2, sfx: "swipe"},
  {id: "fx-vs", rola: "kontra", pola: ["zle", "dobre"], dlugosc: 3.2, sfx: "whoosh"},

  // wyliczanki i procesy
  {id: "fx-lista", rola: "lista", pola: ["punkty"], dlugosc: 3.4, sfx: "pop"},
  {id: "fx-etapy", rola: "lista", pola: ["etapy"], dlugosc: 3.2, sfx: "pop"},
  {id: "fx-krok", rola: "lista", pola: ["numer", "opis"], dlugosc: 2.6, sfx: "pop"},
  {id: "fx-ikony", rola: "lista", pola: [], dlugosc: 3.0, sfx: "pop"},

  // pytanie, ciekawostka, oddech
  {id: "fx-pytanie", rola: "pytanie", pola: ["pytanie", "odpowiedz"], dlugosc: 3.0, sfx: "pop"},
  {id: "typewriter", rola: "pytanie", pola: ["tekst"], dlugosc: 4.5, sfx: "typing"},
  {id: "karta-czasu", rola: "pytanie", pola: ["tekst"], dlugosc: 1.8, sfx: "click"},

  // etykiety i tło
  {id: "chapter-label", rola: "etykieta", pola: ["numer", "tytul"], dlugosc: 3.0, sfx: "click"},
  {id: "badge-2kolory", rola: "etykieta", pola: ["tekst"], dlugosc: 3.5, sfx: "pop"},
  {id: "fx-ticker", rola: "etykieta", pola: ["tekst"], dlugosc: 3.0, sfx: null},
  {id: "strzalka", rola: "etykieta", pola: [], dlugosc: 2.2, sfx: "swipe"},
  {id: "light-sweep", rola: "etykieta", pola: [], dlugosc: 1.6, sfx: null},

  // interludium pełnoekranowe
  {naNapisach: true, id: "fx-cytat", rola: "interludium", pola: ["tekst"], dlugosc: 3.4, sfx: "whoosh"},

  // końcówka
  {id: "fx-komentarz", rola: "cta", pola: ["nick", "tresc"], dlugosc: 3.6, sfx: "pop"},
  {id: "emoji-burst", rola: "cta", pola: [], dlugosc: 2.0, sfx: "pop"}
];

const SFX_PLIKI = {
  pop: "sfx-pop.wav",
  click: "sfx-click.wav",
  ding: "sfx-ding.wav",
  whoosh: "sfx-whoosh.wav",
  swipe: "sfx-swipe.wav",
  impact: "sfx-impact.wav",
  riser: "sfx-riser.wav",
  typing: "sfx-typing.wav"
};

/* ============================ czytanie napisów ============================ */

function czasZAss(s) {
  const [g, m, sek] = s.split(":");
  return Number(g) * 3600 + Number(m) * 60 + Number(sek);
}

/** Linijki napisów: { od, do, tekst } — bez znaczników karaoke. */
function czytajNapisy(plik) {
  if (!plik || !fs.existsSync(plik)) return [];
  const linie = fs.readFileSync(plik, "utf8").split("\n");
  const wynik = [];
  for (const l of linie) {
    if (!l.startsWith("Dialogue:")) continue;
    const czesci = l.slice("Dialogue:".length).split(",");
    if (czesci.length < 10) continue;
    const od = czasZAss(czesci[1].trim());
    const doK = czasZAss(czesci[2].trim());
    const tekst = czesci
      .slice(9)
      .join(",")
      .replace(/\{[^}]*\}/g, "")   // znaczniki karaoke i kolorów
      .replace(/\\N/g, " ")
      .trim();
    if (tekst) wynik.push({od, do: doK, tekst});
  }
  return wynik;
}

/* ============================ historia doboru ============================ */

function czytajHistorie() {
  try {
    return JSON.parse(fs.readFileSync(PLIK_HISTORII, "utf8"));
  } catch {
    return {efekty: {}, muzyka: {}, rolek: 0};
  }
}

function zapiszHistorie(h) {
  fs.writeFileSync(PLIK_HISTORII, JSON.stringify(h, null, 2), "utf8");
}

const historia = czytajHistorie();

/**
 * Wybiera efekt danej roli, którego najdawniej nie było.
 * `uzyteTeraz` pilnuje, żeby w jednej rolce nie powtórzyć tego samego.
 */
function wybierzEfekt(rola, uzyteTeraz) {
  const kandydaci = EFEKTY.filter((e) => e.rola === rola && !uzyteTeraz.has(e.id));
  if (!kandydaci.length) return null;
  // im mniejszy numer ostatniego użycia, tym dawniej był użyty
  kandydaci.sort((a, b) => (historia.efekty[a.id] || 0) - (historia.efekty[b.id] || 0));
  // z trzech najdawniejszych bierzemy losowy, żeby kolejność nie była mechaniczna
  const pula = kandydaci.slice(0, Math.min(3, kandydaci.length));
  return pula[Math.floor(Math.random() * pula.length)];
}

/* ======================= rozpoznanie treści linijki ======================= */

const SLOWA_KONTRA = ["nie", "zamiast", "bez", "myślisz", "wydaje", "ale", "błąd", "źle", "przestań", "przestaniesz"];
const SLOWA_LISTA = ["pierwsze", "drugie", "trzecie", "krok", "najpierw", "potem", "kolejno", "etap"];
const SLOWA_CTA = ["komentarz", "komentarzu", "napisz", "wyślę", "wyśle", "dm", "wiadomość", "obserwuj", "link", "zapisz"];

/** Dopasowanie po całych słowach, nie po fragmentach (inaczej "nie" łapie się
    w środku "niedziela", a "komentarz" nie łapie się w "komentarzu"). */
function maSlowo(tekst, lista) {
  const slowa = tekst
    .toLowerCase()
    .split(/[^a-ząćęłńóśźż]+/)
    .filter(Boolean);
  return lista.some((s) => slowa.some((w) => w === s || w.startsWith(s)));
}

function rolaDlaLinijki(tekst, ktora, ile) {
  const naKoncu = ktora >= ile - 4;
  if (naKoncu && maSlowo(tekst, SLOWA_CTA)) return "cta";
  if (/\d/.test(tekst)) return "liczba";
  if (tekst.includes("?")) return "pytanie";
  if (maSlowo(tekst, SLOWA_KONTRA)) return "kontra";
  if (maSlowo(tekst, SLOWA_LISTA)) return "lista";
  return "akcent";
}

/**
 * Skleja kolejne linijki napisów w jedną frazę o sensownej długości.
 * Linijka napisu to 2-3 słowa, więc sam jej tekst dawał na ekranie urwańce
 * w stylu "TWOJE REKLAMY NIE". Frazę ucinamy na interpunkcji, bo tam kończy
 * się myśl.
 */
function fraza(napisy, od, maksZnakow = 26) {
  let wynik = "";
  for (let i = od; i < napisy.length; i++) {
    const kolejny = napisy[i].tekst.trim();
    if (!kolejny) continue;
    if (wynik && (wynik + " " + kolejny).length > maksZnakow) break;
    wynik = wynik ? wynik + " " + kolejny : kolejny;
    if (/[.!?]$/.test(kolejny)) break;
  }
  // fraza nie może kończyć się na słówku funkcyjnym ("...BO MÓWISZ DO"),
  // bo na ekranie wygląda jak urwane w połowie zdania
  const ogony = ["do", "w", "z", "na", "i", "a", "o", "bo", "że", "ze", "od", "po", "za", "u", "to", "jak", "co", "by", "aby", "lub"];
  let slowa = wynik.replace(/[.,!?:]+$/, "").trim().split(/\s+/);
  while (slowa.length > 1 && ogony.includes(slowa[slowa.length - 1].toLowerCase().replace(/[.,!?:]/g, ""))) {
    slowa.pop();
  }
  return slowa.join(" ");
}

/** Wypełnia propsy efektu treścią z napisów. */
function trescDlaEfektu(efekt, linijka, nastepna, napisy, indeks) {
  const tekst = napisy && napisy.length ? fraza(napisy, indeks) : linijka.tekst.replace(/[.,!?:]+$/, "");
  const dalej = napisy && napisy.length
    ? fraza(napisy, Math.min(napisy.length - 1, indeks + 2))
    : (nastepna ? nastepna.tekst : "").replace(/[.,!?:]+$/, "");
  const liczba = (tekst.match(/\d[\d\s.,]*\s*(zł|zl|%|min|minut|godzin|h|k|tys)?/i) || [tekst])[0].trim();

  switch (efekt.id) {
    case "fx-wynik":
      return {liczba: liczba.toUpperCase(), podpis: tekst.replace(liczba, "").trim().toUpperCase() || "TYLE TO KOSZTUJE"};
    case "fx-vs":
      return {zle: tekst.toUpperCase(), dobre: dalej.toUpperCase() || "TAK JEST LEPIEJ"};
    case "fx-pytanie":
      return {pytanie: tekst.toUpperCase(), odpowiedz: dalej.toUpperCase() || "TAK"};
    case "fx-lista":
      return {punkty: [tekst.toUpperCase(), dalej.toUpperCase() || "..."].filter(Boolean)};
    case "fx-etapy":
      return {etapy: [tekst.toUpperCase(), dalej.toUpperCase() || "...", "GOTOWE"]};
    case "fx-krok":
      return {numer: (liczba.match(/\d+/) || ["1"])[0], opis: tekst.toUpperCase()};
    case "fx-komentarz":
      return {nick: "twoj.profil", tresc: tekst.split(" ").slice(-1)[0].toUpperCase()};
    case "chapter-label":
      return {numer: "01", tytul: tekst.split(" ").slice(0, 2).join(" ").toUpperCase()};
    case "fx-odliczanie":
      return {od: 3, podpis: tekst.toUpperCase()};
    default:
      // większość efektów bierze jedno pole tekstowe
      if (efekt.pola.includes("tekst")) return {tekst: tekst.toUpperCase()};
      return {};
  }
}

/* ============================== układanie ============================== */

const dlugosc = dlugoscPliku(nagranie);
const fps = Math.round(tempoKlatek(nagranie) || 60);
const napisy = czytajNapisy(plikNapisow);

if (!napisy.length) {
  console.log("Nie mam napisów, więc rozłożę efekty równo w czasie.");
  console.log("Lepszy wynik: najpierw zrób napisy narzędziem transkrypcja.py, potem uruchom to jeszcze raz.\n");
}

// Kandydaci na momenty: początki linijek napisów, a bez napisów równy rytm.
const kandydaci = napisy.length
  ? napisy.map((l, i) => ({t: l.od, linijka: l, nastepna: napisy[i + 1], i}))
  : Array.from({length: Math.max(1, Math.floor(dlugosc / gestosc))}, (_, i) => ({
      t: (i + 0.5) * gestosc,
      linijka: {od: (i + 0.5) * gestosc, do: (i + 0.5) * gestosc + 2, tekst: ""},
      nastepna: null,
      i
    }));

const ileEfektow = Math.max(3, Math.round(dlugosc / gestosc));
const uzyteTeraz = new Set();
const napisyPrzerwy = [];
const nakladki = [];
const sfx = [];
const doRenderu = [];

let ostatniKoniec = -99;
let policzone = 0;

for (const k of kandydaci) {
  if (policzone >= ileEfektow) break;
  // nie kładziemy efektów jeden na drugim ani gęściej, niż zakłada rytm
  if (k.t < ostatniKoniec + 0.6) continue;
  if (k.t > dlugosc - 1.2) break;

  // rolę liczymy z całej frazy, nie z pojedynczej linijki: linijka napisu ma
  // 2-3 słowa i sama rzadko wystarcza, żeby rozpoznać kontrę albo CTA
  const trescMomentu = napisy.length ? fraza(napisy, k.i, 44) : "";
  const rola = napisy.length ? rolaDlaLinijki(trescMomentu, k.i, kandydaci.length) : "akcent";
  let efekt = wybierzEfekt(rola, uzyteTeraz);
  // rola wyczerpana w tej rolce: bierzemy cokolwiek, czego jeszcze nie było
  if (!efekt) efekt = wybierzEfekt("akcent", uzyteTeraz) || wybierzEfekt("etykieta", uzyteTeraz);
  if (!efekt) break;

  const trwanie = Math.min(efekt.dlugosc, dlugosc - k.t - 0.2);
  if (trwanie < 1) continue;

  const plikEfektu = path.join("efekty", `${String(policzone + 1).padStart(2, "0")}-${efekt.id}.mov`);
  const props = trescDlaEfektu(efekt, k.linijka, k.nastepna, napisy, k.i);

  const od = Number(k.t.toFixed(2));
  const doK = Number((k.t + trwanie).toFixed(2));
  nakladki.push({plik: plikEfektu, od, do: doK, x: 0, y: 0});
  // Wielki napis-efekt siada dokładnie tam, gdzie napisy karaoke. Zgłaszamy
  // okno, w którym napis ma zniknąć, inaczej dwa teksty leżą na sobie.
  if (efekt.naNapisach) napisyPrzerwy.push({od, do: doK});
  doRenderu.push({id: efekt.id, plik: plikEfektu, props, dlugoscSekund: Number(trwanie.toFixed(2))});
  if (efekt.sfx) {
    sfx.push({plik: path.join(folderSfx, SFX_PLIKI[efekt.sfx]), t: Number(k.t.toFixed(2))});
  }

  uzyteTeraz.add(efekt.id);
  historia.efekty[efekt.id] = (historia.rolek || 0) + 1;
  ostatniKoniec = k.t + trwanie;
  policzone++;
}

/* -------------------- sklejki: punche tylko tam -------------------- */
let punche = [];
const katalogNarzedzi = path.dirname(fileURLToPath(import.meta.url));
const wykryj = spawnSync("node", [path.join(katalogNarzedzi, "wykryj-ciecia.mjs"), nagranie], {
  encoding: "utf8"
});
const wyjscieWykrywania = (wykryj.stdout || "") + (wykryj.stderr || "");
const znalezione = /Znalezione sklejki: (\d+)\n([\d., ]+)/.exec(wyjscieWykrywania);
if (znalezione) {
  punche = znalezione[2]
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0.3 && n < dlugosc - 0.3)
    .map((t) => ({t}));
}

/* -------------------- muzyka: inna niż ostatnio -------------------- */
let muzyka = null;
if (folderMuzyki && fs.existsSync(folderMuzyki)) {
  const utwory = fs
    .readdirSync(folderMuzyki)
    .filter((f) => /\.(mp3|wav|m4a|aac|ogg)$/i.test(f))
    .map((f) => path.join(folderMuzyki, f));
  if (utwory.length) {
    utwory.sort((a, b) => (historia.muzyka[a] || 0) - (historia.muzyka[b] || 0));
    const wybrany = utwory[0];
    historia.muzyka[wybrany] = (historia.rolek || 0) + 1;
    muzyka = {plik: wybrany, glosnosc: 0.17};
  }
}

/* -------------------- zapis planu i listy efektów -------------------- */

const plan = {
  wejscie: nagranie,
  wyjscie: "gotowe.mp4",
  fps,
  ...(plikNapisow ? {napisy: plikNapisow} : {}),
  ...(napisyPrzerwy.length ? {napisyPrzerwy} : {}),
  ...(muzyka ? {muzyka} : {}),
  hook: {sila: 0.09},
  punche,
  nakladki,
  sfx: fs.existsSync(folderSfx) ? sfx : [],
  notatka:
    "Plan ułożony przez plan-efektow.mjs. Przejrzyj treść efektów w efekty.json, " +
    "popraw teksty tam, gdzie automat wziął zbyt dosłownie to, co padło w nagraniu."
};

fs.writeFileSync(plikPlanu, JSON.stringify(plan, null, 2), "utf8");
const plikEfektow = path.join(katalog, "efekty.json");
fs.writeFileSync(plikEfektow, JSON.stringify(doRenderu, null, 2), "utf8");

historia.rolek = (historia.rolek || 0) + 1;
zapiszHistorie(historia);

/* -------------------- podsumowanie -------------------- */

console.log(`Nagranie:    ${path.basename(nagranie)}  (${dlugosc.toFixed(1)} s, ${fps} fps)`);
console.log(`Napisy:      ${napisy.length ? napisy.length + " linijek" : "brak"}`);
console.log(`Sklejki:     ${punche.length} (tylko tam idą zoom-punche)`);
console.log(`Muzyka:      ${muzyka ? path.basename(muzyka.plik) : "brak (podaj --muzyka folder)"}`);
console.log(`Efekty:      ${doRenderu.length} różnych, średnio co ${(dlugosc / Math.max(1, doRenderu.length)).toFixed(1)} s`);
console.log(`Przerwy w napisach: ${napisyPrzerwy.length} (tam wjeżdża wielki napis-efekt)`);
console.log(`SFX:         ${plan.sfx.length}${plan.sfx.length ? "" : "  (uruchom: node narzedzia/zrob-sfx.mjs)"}`);
console.log("");
doRenderu.forEach((e, i) => {
  const opis = Object.values(e.props).flat().join(" / ").slice(0, 46);
  console.log(`  ${String(i + 1).padStart(2)}. ${String(nakladki[i].od).padStart(6)} s  ${e.id.padEnd(17)} ${opis}`);
});
console.log(`\nZapisane: ${plikPlanu} oraz ${plikEfektow}`);

/* -------------------- render efektów -------------------- */

/* Remotion odpalamy bezposrednio przez `node`, a nie przez `npx`.
   Powod: Node 20+ na Windows odmawia uruchomienia plikow .cmd bez powloki
   (blad EINVAL), a wlaczenie powloki psuje argument --props, bo JSON ma
   w sobie cudzyslowy. Wskazanie pliku .js Node uruchamia wszedzie tak samo. */
function sciezkaCli(folderRemotion) {
  // Uwaga: `dist/index.js` to biblioteka, nie CLI. Wejsciem jest `remotion-cli.js`
  // wskazane w polu `bin` pakietu @remotion/cli.
  const kandydaci = [
    path.join(folderRemotion, "node_modules", "@remotion", "cli", "remotion-cli.js"),
    path.join(folderRemotion, "node_modules", "remotion", "node_modules", "@remotion", "cli", "remotion-cli.js")
  ];
  return kandydaci.find((k) => fs.existsSync(k)) || null;
}

const cliRemotion = sciezkaCli(path.resolve(remotionKatalog));
const polecenia = doRenderu.map((e) => {
  const klatki = Math.round(e.dlugoscSekund * fps);
  return [
    "node", cliRemotion || "MUSISZ-NAJPIERW-ZROBIC-NPM-INSTALL",
    "render", "src/index.ts", e.id, path.resolve(katalog, e.plik),
    `--props=${JSON.stringify(e.props)}`,
    `--frames=0-${Math.max(1, klatki - 1)}`,
    "--codec=prores", "--prores-profile=4444",
    "--pixel-format=yuva444p10le", "--image-format=png"
  ];
});

if (renderujEfekty) {
  const remotion = path.resolve(remotionKatalog);
  if (!fs.existsSync(remotion)) {
    console.error(`\nNie ma folderu Remotion: ${remotion}. Podaj go przez --remotion.`);
    process.exit(1);
  }
  fs.mkdirSync(path.resolve(katalog, "efekty"), {recursive: true});
  console.log("\nRenderuję efekty (pierwszy raz trwa dłużej, Remotion się rozgrzewa)...");
  let zrobione = 0;
  polecenia.forEach((p, i) => {
    const r = spawnSync(p[0], p.slice(1), {cwd: remotion, stdio: ["ignore", "ignore", "inherit"]});
    if (r.status === 0) {
      zrobione++;
      console.log(`  ${i + 1}/${polecenia.length}  ${doRenderu[i].id}`);
    } else {
      console.log(`  ${i + 1}/${polecenia.length}  NIE UDAŁO SIĘ: ${doRenderu[i].id}`);
    }
  });
  console.log(`\nGotowe ${zrobione}/${polecenia.length}. Teraz: node narzedzia/buduj-filtr.mjs ${plikPlanu} --renderuj`);
} else {
  console.log("\nŻeby wyrenderować efekty, dodaj --renderuj-efekty albo odpal to ręcznie w folderze Remotion:");
  polecenia.slice(0, 2).forEach((p) => console.log("  " + p.join(" ")));
  if (polecenia.length > 2) console.log(`  ... (${polecenia.length - 2} więcej, pełna lista w efekty.json)`);
}
