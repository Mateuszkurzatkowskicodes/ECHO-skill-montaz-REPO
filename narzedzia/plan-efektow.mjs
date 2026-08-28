#!/usr/bin/env node
/**
 * plan-efektow.mjs — układa gęsty i ZA KAŻDYM RAZEM INNY zestaw efektów.
 * Wersja 3 (sierpień 2026): gęściej, mocniejszy hook, mniej pikania w dźwięku,
 * nakładki niepełnoekranowe siadają tam, gdzie mają, a nie przy górnej krawędzi.
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
 *    rolce, dwa efekty z tej samej rodziny nie idą jeden po drugim, a kolejna
 *    rolka startuje od innego zestawu. Muzyka rotuje tak samo.
 *  - DOBÓR DO TREŚCI: liczba w zdaniu dostaje kartę wyniku i dzwonek, kontra
 *    dostaje przekreślenie, wyliczanka dostaje listę z odhaczaniem, końcówka
 *    dostaje mockup komentarza pod CTA.
 *  - HOOK: pierwsze zdanie ZAWSZE dostaje wielki napis. Płaskie pierwsze dwie
 *    sekundy to najczęstszy powód, dla którego dobra rolka nie ma zasięgu.
 *  - DŹWIĘK Z UMIAREM: efekt dźwiękowy idzie na kilka NAJMOCNIEJSZYCH momentów,
 *    a nie na każdą nakładkę. Rolka, w której pika kilkanaście razy, brzmi tanio.
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
const gestosc = Number(wartosc("--gestosc", "2.8"));
const plikPlanu = wartosc("--zapisz", "plan.json");
const remotionKatalog = wartosc("--remotion", "remotion-montaz");
const renderujEfekty = flaga("--renderuj-efekty");

const katalog = path.dirname(path.resolve(plikPlanu));
const PLIK_HISTORII = path.join(katalog, ".echo-historia-efektow.json");

/* ============================ pule efektów ============================
   `rola` mówi, kiedy efekt ma sens. `rodzina` pilnuje, żeby dwa podobne
   wizualnie efekty nie poszły jeden po drugim (widz i tak zobaczy wtedy "to
   samo dwa razy"). `pola` to nazwy propsów, które trzeba wypełnić treścią.
   `sfx` to dopasowany dźwięk, a `mocSfx` decyduje, które momenty dostaną go
   naprawdę, gdy limit dźwięków się kończy. `wys` to wysokość kompozycji
   w Remotion: wszystko poniżej 1920 trzeba położyć w kadrze ręcznie, inaczej
   ffmpeg przykleja to do górnej krawędzi. `dlugosc` w sekundach musi zgadzać
   się z tym, co jest zarejestrowane w Remotion (Root.tsx). */

const EFEKTY = [
  // mocne akcenty na zdaniu
  {naNapisach: true, id: "fx-slam", rola: "akcent", rodzina: "napis", pola: ["tekst"], dlugosc: 1.9, sfx: "impact", mocSfx: 9},
  {naNapisach: true, id: "fx-stempel", rola: "akcent", rodzina: "napis", pola: ["tekst"], dlugosc: 1.8, sfx: "impact", mocSfx: 8},
  {naNapisach: true, id: "fx-podkreslenie", rola: "akcent", rodzina: "kreska", pola: ["tekst"], dlugosc: 2.4, sfx: "swipe", mocSfx: 4},
  {naNapisach: true, id: "fx-kolo", rola: "akcent", rodzina: "kreska", pola: ["tekst"], dlugosc: 2.4, sfx: "swipe", mocSfx: 4},
  {naNapisach: true, id: "marker", rola: "akcent", rodzina: "kreska", pola: ["tekst"], dlugosc: 2.6, sfx: "swipe", mocSfx: 3},
  {naNapisach: true, id: "glitch", rola: "akcent", rodzina: "napis", pola: ["tekst"], dlugosc: 1.4, sfx: "click", mocSfx: 6},
  {naNapisach: true, id: "scramble", rola: "akcent", rodzina: "napis", pola: ["tekst"], dlugosc: 2.4, sfx: "typing", mocSfx: 5},

  // liczby i wyniki
  {id: "fx-wynik", rola: "liczba", rodzina: "karta", pola: ["liczba", "podpis"], dlugosc: 2.8, sfx: "ding", mocSfx: 9},
  // UWAGA: `money-counter` i `multi-countup` są CELOWO poza automatem.
  // Oba animują liczbę, która rośnie, więc muszą dostać konkretną wartość.
  // Wzięte z transkrypcji potrafiły zamienić "półtora tysiąca" na "1" albo
  // dorobić podpis z kawałków wyrazów, czyli wstawić do rolki obietnicę,
  // której nikt nie złożył. Zostają w bibliotece do ręcznego użycia wtedy,
  // gdy naprawdę masz liczby do pokazania (opis w SKILL.md).
  {id: "fx-odliczanie", rola: "liczba", rodzina: "karta", pola: ["podpis"], dlugosc: 2.6, sfx: "click", mocSfx: 6},

  // kontrast, "nie tak, a tak"
  {naNapisach: true, id: "fx-przekreslenie", rola: "kontra", rodzina: "kreska", pola: ["tekst"], dlugosc: 2.2, sfx: "swipe", mocSfx: 7},
  {id: "fx-vs", rola: "kontra", rodzina: "karta", pola: ["zle", "dobre"], dlugosc: 3.2, sfx: "whoosh", mocSfx: 9},

  // wyliczanki i procesy
  {id: "fx-lista", rola: "lista", rodzina: "lista", pola: ["punkty"], dlugosc: 3.4, sfx: "pop", mocSfx: 6},
  {id: "fx-etapy", rola: "lista", rodzina: "lista", pola: ["etapy"], dlugosc: 3.2, sfx: "pop", mocSfx: 5},
  {id: "fx-krok", rola: "lista", rodzina: "karta", pola: ["numer", "opis"], dlugosc: 2.6, sfx: "pop", mocSfx: 5},
  {id: "fx-ikony", rola: "lista", rodzina: "lista", pola: [], dlugosc: 3.0, sfx: "pop", mocSfx: 4},

  // pytanie, ciekawostka, oddech
  {id: "fx-pytanie", rola: "pytanie", rodzina: "karta", pola: ["pytanie", "odpowiedz"], dlugosc: 3.0, sfx: "pop", mocSfx: 6},
  {id: "typewriter", rola: "pytanie", rodzina: "karta", pola: ["tekst"], dlugosc: 4.5, sfx: "typing", mocSfx: 4},
  {id: "karta-czasu", rola: "pytanie", rodzina: "karta", pola: ["tekst"], dlugosc: 1.8, sfx: "click", mocSfx: 5},

  // etykiety i tło
  {id: "chapter-label", rola: "etykieta", rodzina: "etykieta", pola: ["numer", "tytul"], dlugosc: 3.0, sfx: "click", mocSfx: 2},
  {id: "badge-2kolory", rola: "etykieta", rodzina: "etykieta", pola: ["tekst"], dlugosc: 3.5, wys: 520, sfx: "pop", mocSfx: 3},
  {id: "fx-ticker", rola: "etykieta", rodzina: "etykieta", pola: ["tekst"], dlugosc: 3.0, sfx: null, mocSfx: 0},
  {id: "strzalka", rola: "etykieta", rodzina: "etykieta", pola: [], dlugosc: 2.2, sfx: "swipe", mocSfx: 2},
  {id: "light-sweep", rola: "etykieta", rodzina: "etykieta", pola: [], dlugosc: 1.6, sfx: null, mocSfx: 0},

  // interludium pełnoekranowe
  {naNapisach: true, id: "fx-cytat", rola: "interludium", rodzina: "karta", pola: ["tekst"], dlugosc: 3.4, sfx: "whoosh", mocSfx: 8},

  // końcówka
  {id: "fx-komentarz", rola: "cta", rodzina: "karta", pola: ["nick", "tresc"], dlugosc: 3.6, sfx: "pop", mocSfx: 9},
  {id: "emoji-burst", rola: "cta", rodzina: "etykieta", pola: [], dlugosc: 2.0, sfx: "pop", mocSfx: 7}
];

/* ============================ OTWARCIE ROLKI ============================
   Nie ma czegos takiego jak "hook to zawsze wielki napis". Dobre otwarcia
   wygladaja roznie i wlasnie na tym polega ich sila: gdy kazda rolka na profilu
   zaczyna sie tak samo, widz przewija ja odruchowo, zanim cokolwiek przeczyta.
   Dlatego otwarcie ROTUJE tak samo jak efekty: zestaw pamieta, czym zaczela sie
   poprzednia rolka, i tym razem siega po co innego. */

const OTWARCIA = [
  {
    id: "slowo",
    opis: "wielkie slowo w kadrze",
    rodziny: ["napis"],
    sila: 0.09
  },
  {
    id: "kreska",
    opis: "zakreslenie albo podkreslenie na napisie",
    rodziny: ["kreska"],
    sila: 0.08
  },
  {
    id: "plansza",
    opis: "pelnoekranowa plansza z pierwszym zdaniem",
    rodziny: ["karta"],
    role: ["interludium", "pytanie"],
    sila: 0.07
  },
  {
    id: "etykieta",
    opis: "mala etykieta w kadrze, twarz zostaje na wierzchu",
    rodziny: ["etykieta"],
    role: ["etykieta"],
    sila: 0.10
  },
  {
    // Czasem najmocniejsze otwarcie to sama twarz i jedno zdanie. Wtedy zamiast
    // nakladki dostajemy mocniejszy najazd, a pierwszy efekt wchodzi dopiero,
    // gdy zdanie sie skonczy. Bez tego wariantu profil wyglada jak szablon.
    id: "czysty",
    opis: "sama twarz i mocny najazd, pierwszy efekt dopiero po hooku",
    rodziny: null,
    sila: 0.14,
    pusteSekundy: 2.4
  }
];

/** Otwarcie, ktorego najdawniej nie bylo. */
/** Cokolwiek z zadanych rodzin, gdy rola pierwszego zdania nie ma tam nic. */
function wybierzZRodzin(rodziny, uzyteTeraz) {
  if (!rodziny) return null;
  const kandydaci = EFEKTY.filter(
    (e) => rodziny.includes(e.rodzina) && !uzyteTeraz.has(e.id) && !(e.wymagaLiczb || 0)
  );
  if (!kandydaci.length) return null;
  kandydaci.sort((a, b) => (historia.efekty[a.id] || 0) - (historia.efekty[b.id] || 0));
  const pula = kandydaci.slice(0, Math.min(3, kandydaci.length));
  return pula[Math.floor(Math.random() * pula.length)];
}

/**
 * Otwarcie, ktorego najdawniej nie bylo.
 * Bierzemy WYLACZNIE te o najmniejszym numerze uzycia, a losujemy dopiero
 * miedzy remisami. Losowanie z szerszej puli potrafilo powtorzyc otwarcie
 * z poprzedniej rolki, czyli dokladnie to, czemu ta rotacja ma zapobiegac.
 */
function wybierzOtwarcie() {
  const h = historia.otwarcia || {};
  const najmniej = Math.min(...OTWARCIA.map((o) => h[o.id] || 0));
  const pula = OTWARCIA.filter((o) => (h[o.id] || 0) === najmniej);
  return pula[Math.floor(Math.random() * pula.length)];
}

/* Ile efektów dźwiękowych wolno wpuścić do jednej rolki.
   Sprawdzone w praktyce: przy kilkunastu "popach" rolka brzmi jak automat
   z nagrodami. Kilka trafionych uderzeń robi wrażenie dowalonego montażu,
   kilkanaście robi hałas. */
const MAKS_SFX = 6;
/* Minimalny odstęp między dwoma dźwiękami. Dwa pop-y obok siebie zlewają się
   w jeden brudny trzask. */
const MIN_ODSTEP_SFX = 1.6;

const SFX_PLIKI = {
  pop: "sfx-pop.wav",
  click: "sfx-click.wav",
  ding: "sfx-ding.wav",
  whoosh: "sfx-whoosh.wav",
  swipe: "sfx-swipe.wav",
  impact: "sfx-impact.wav",
  riser: "sfx-riser.wav",
  "sub-drop": "sfx-sub-drop.wav",
  typing: "sfx-typing.wav"
};

/* Kadr rolki. Nakładka niższa niż kadr musi dostać własne `y`, inaczej ffmpeg
   przykleja ją do góry ekranu, czyli zwykle na czoło mówiącego. Kładziemy ją
   nad napisami karaoke, na wysokości klatki piersiowej. */
const WYSOKOSC_KADRU = 1920;
const NAD_NAPISAMI = 740;

function pozycjaY(efekt) {
  const wys = efekt.wys || WYSOKOSC_KADRU;
  if (wys >= WYSOKOSC_KADRU) return 0;
  return Math.max(0, WYSOKOSC_KADRU - wys - NAD_NAPISAMI);
}

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
 * `uzyteTeraz` pilnuje, żeby w jednej rolce nie powtórzyć tego samego efektu,
 * a `ostatniaRodzina` żeby dwa podobne wizualnie nie poszły jeden po drugim
 * (dwa zakreślenia pod rząd widz czyta jako "znowu to samo").
 */
function wybierzEfekt(rola, uzyteTeraz, ostatniaRodzina = null, tylkoRodziny = null, iloscLiczb = 0) {
  const pasuje = (e) =>
    e.rola === rola &&
    !uzyteTeraz.has(e.id) &&
    (e.wymagaLiczb || 0) <= iloscLiczb &&
    (!tylkoRodziny || tylkoRodziny.includes(e.rodzina));

  // najpierw próbujemy z innej rodziny niż poprzedni efekt
  let kandydaci = EFEKTY.filter((e) => pasuje(e) && e.rodzina !== ostatniaRodzina);
  if (!kandydaci.length) kandydaci = EFEKTY.filter(pasuje);
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
    // Kropka kończy myśl, ale nie wtedy, gdy złapaliśmy dopiero jedno krótkie
    // słowo: na ekranie wychodziło wielkie "TĘ" i nikt nie wiedział, o co chodzi.
    if (/[.!?]$/.test(kolejny) && wynik.length >= 8) break;
  }
  // fraza nie może kończyć się na słówku funkcyjnym ("...BO MÓWISZ DO"),
  // bo na ekranie wygląda jak urwane w połowie zdania
  const ogony = ["do", "w", "z", "na", "i", "a", "o", "bo", "że", "ze", "od", "po", "za", "u", "to", "jak", "co", "by", "aby", "lub"];
  let slowa = wynik.replace(/[.,!?:]+$/, "").trim().split(/\s+/);
  while (slowa.length > 1 && ogony.includes(slowa[slowa.length - 1].toLowerCase().replace(/[.,!?:]/g, ""))) {
    slowa.pop();
  }
  // napisy karaoke rozbijają liczbę na osobne słowa i wychodzi "1 ,5 TYS"
  return slowa.join(" ").replace(/\s+([.,])/g, "$1");
}

/** Wypełnia propsy efektu treścią z napisów. */
function trescDlaEfektu(efekt, linijka, nastepna, napisy, indeks, numerRozdzialu = 1, szeroki = "") {
  const tekst = napisy && napisy.length ? fraza(napisy, indeks) : linijka.tekst.replace(/[.,!?:]+$/, "");
  const dalej = napisy && napisy.length
    ? fraza(napisy, Math.min(napisy.length - 1, indeks + 2))
    : (nastepna ? nastepna.tekst : "").replace(/[.,!?:]+$/, "");
  // "1 ,5 TYS" bierze się stąd, że napisy karaoke rozbijają liczbę na osobne
  // słowa. Bez tego sklejenia karta wyniku pokazywała liczbę z odstępem przed
  // przecinkiem, a podpis obok był urwany w połowie wyrazu.
  const scalone = (szeroki || tekst).replace(/\s+([.,])/g, "$1").replace(/\s{2,}/g, " ").trim();
  const liczba = (scalone.match(/\d[\d\s.,]*\s*(zł|zl|%|min|minut|godzin|h|k|tys)?/i) || [tekst])[0].replace(/\s+([.,])/g, "$1").trim();

  switch (efekt.id) {
    case "fx-wynik": {
      // podpis: same słowa bez cyfr, żeby nie wychodziły kawałki wyrazów
      const podpis = scalone
        .split(/\s+/)
        .filter((w) => !/\d/.test(w) && w.replace(/[^a-ząćęłńóśźż]/gi, "").length > 2)
        .join(" ")
        .toUpperCase()
        .slice(0, 26)
        .trim();
      return {liczba: liczba.toUpperCase(), podpis: podpis || "TYLE TO KOSZTUJE"};
    }
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
    case "fx-komentarz": {
      // w mockupie komentarza ma stać SŁOWO-KLUCZ z CTA, a nie ostatni wyraz
      // zdania, którym często jest spójnik albo "to"
      const slowa = tekst.split(/\s+/).filter((w) => w.replace(/[^a-ząćęłńóśźż]/gi, "").length > 3);
      const klucz = slowa.length ? slowa[slowa.length - 1] : tekst.split(/\s+/).slice(-1)[0] || "MONTAŻ";
      return {nick: "twoj.profil", tresc: klucz.replace(/[.,!?:]+$/, "").toUpperCase()};
    }
    case "chapter-label":
      return {
        numer: String(numerRozdzialu).padStart(2, "0"),
        tytul: tekst.split(" ").slice(0, 2).join(" ").toUpperCase()
      };
    case "fx-odliczanie": {
      const podpis = scalone
        .split(/\s+/)
        .filter((w) => !/\d/.test(w) && w.replace(/[^a-ząćęłńóśźż]/gi, "").length > 2)
        .slice(0, 3)
        .join(" ")
        .toUpperCase()
        .slice(0, 22);
      return {od: 3, podpis: podpis || "TYLE TO ZAJMUJE"};
    }
    case "money-counter": {
      // liczba MUSI pochodzić z tego, co padło w nagraniu
      const zrodlo = szeroki || tekst;
      const n = Number((zrodlo.match(/\d[\d\s]*/) || ["0"])[0].replace(/\s/g, "")) || 0;
      const waluta = /z[łl]/i.test(zrodlo) ? "zł" : /%/.test(zrodlo) ? "%" : "";
      return {do: n, waluta, podpis: (tekst.replace(/\d[\d\s]*/, "").trim() || "TYLE TO JEST").toUpperCase().slice(0, 22)};
    }
    case "multi-countup": {
      const zrodlo = szeroki || tekst;
      const liczby = (zrodlo.match(/\d[\d\s]*/g) || []).slice(0, 3).map((x) => Number(x.replace(/\s/g, "")) || 0);
      const etykiety = zrodlo
        .split(/\s+/)
        .filter((w) => w.replace(/[^a-ząćęłńóśźż]/gi, "").length > 3)
        .slice(0, liczby.length);
      return {
        pozycje: liczby.map((n, i) => ({etykieta: (etykiety[i] || "ILE").toUpperCase().slice(0, 12), do: n}))
      };
    }
    case "fx-ikony": {
      const zrodlo = (szeroki || tekst).split(/\s+/)
        .map((w) => w.replace(/[.,!?:]+$/, ""))
        .filter((w) => w.replace(/[^a-ząćęłńóśźż]/gi, "").length > 3)
        .slice(0, 3);
      const ikony = ["⚡", "🎯", "✅"];
      if (zrodlo.length < 3) return {};
      return {pozycje: zrodlo.map((w, i) => ({ikona: ikony[i], podpis: w.toUpperCase().slice(0, 14)}))};
    }
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

const ileEfektow = Math.max(4, Math.round(dlugosc / gestosc));
const uzyteTeraz = new Set();
const napisyPrzerwy = [];
const nakladki = [];
const sfxKandydaci = [];
const doRenderu = [];

const otwarcie = wybierzOtwarcie();
// Otwarcie "czyste" nie ma nakladki: przez pierwsze sekundy jest sama twarz
// i mocniejszy najazd, a efekty zaczynaja sie dopiero po pierwszym zdaniu.
const startEfektow = otwarcie.pusteSekundy || 0;

/* RYTM: efekty NIE moga byc rozlozone rowno jak metronom, bo wtedy montaz
   wyglada na wygenerowany. Prawdziwy montaz oddycha: gesto na otwarciu, luzniej
   w srodku, gdy cos tlumaczysz, i znowu gesto na koncowce, gdzie siedzi puenta
   i CTA. Ta funkcja mowi, ile sekund ma minac od poprzedniego efektu. */
function odstepDla(t) {
  const p = dlugosc > 0 ? t / dlugosc : 0;
  if (p < 0.22) return gestosc * 0.78;
  if (p > 0.72) return gestosc * 0.85;
  return gestosc * 1.18;
}

let ostatniKoniec = -99;
let ostatniStart = -99;
let ostatniaRodzina = null;
let policzone = 0;
let licznikRozdzialow = 0;

for (const k of kandydaci) {
  if (policzone >= ileEfektow) break;
  if (k.t < startEfektow) continue;
  // nie kładziemy efektów jeden na drugim ani gęściej, niż zakłada rytm
  if (k.t < ostatniKoniec + 0.4) continue;
  if (policzone && k.t < ostatniStart + odstepDla(k.t)) continue;
  if (k.t > dlugosc - 1.2) break;

  // rolę liczymy z całej frazy, nie z pojedynczej linijki: linijka napisu ma
  // 2-3 słowa i sama rzadko wystarcza, żeby rozpoznać kontrę albo CTA
  const trescMomentu = napisy.length ? fraza(napisy, k.i, 44) : "";
  // Pierwszy efekt w rolce dostaje forme wylosowanego otwarcia, a nie sztywno
  // wielki napis. Otwarcia rotuja miedzy rolkami, patrz OTWARCIA wyzej.
  const naHooku = policzone === 0 && k.t < startEfektow + 3.0;
  const rolaZTresci = napisy.length ? rolaDlaLinijki(trescMomentu, k.i, kandydaci.length) : "akcent";
  const rolaOtwarcia = naHooku && otwarcie.role
    ? otwarcie.role[Math.floor(Math.random() * otwarcie.role.length)]
    : null;
  const rola = rolaOtwarcia || rolaZTresci;
  const iloscLiczb = (trescMomentu.match(/\d+/g) || []).length;
  let efekt = wybierzEfekt(rola, uzyteTeraz, ostatniaRodzina, naHooku ? otwarcie.rodziny : null, iloscLiczb);
  if (!efekt && naHooku) efekt = wybierzEfekt(rolaZTresci, uzyteTeraz, ostatniaRodzina, otwarcie.rodziny, iloscLiczb);
  // Forma otwarcia jest wazniejsza niz dopasowanie roli do tresci: rolka ma
  // zaczynac sie inaczej niz poprzednia, nawet jesli w pierwszym zdaniu padla
  // liczba albo pytanie. Bez tego otwarcie po cichu wracalo do wielkiego napisu.
  if (!efekt && naHooku) efekt = wybierzZRodzin(otwarcie.rodziny, uzyteTeraz);
  // rola wyczerpana w tej rolce: bierzemy cokolwiek, czego jeszcze nie było
  if (!efekt) efekt = wybierzEfekt("akcent", uzyteTeraz, ostatniaRodzina, null, iloscLiczb) || wybierzEfekt("etykieta", uzyteTeraz, ostatniaRodzina, null, iloscLiczb);
  // cała pula wyczerpana (długie nagranie, gęsty rytm): zaczynamy drugą turę,
  // bo lepszy powtórzony efekt po trzydziestu sekundach niż płaski kawałek rolki
  if (!efekt) {
    uzyteTeraz.clear();
    efekt = wybierzEfekt(rola, uzyteTeraz, ostatniaRodzina, null, iloscLiczb) || wybierzEfekt("akcent", uzyteTeraz, ostatniaRodzina, null, iloscLiczb);
  }
  if (!efekt) break;

  const trwanie = Math.min(efekt.dlugosc, dlugosc - k.t - 0.2);
  if (trwanie < 1) continue;

  const plikEfektu = path.join("efekty", `${String(policzone + 1).padStart(2, "0")}-${efekt.id}.mov`);
  if (efekt.id === "chapter-label") licznikRozdzialow++;
  const props = trescDlaEfektu(efekt, k.linijka, k.nastepna, napisy, k.i, licznikRozdzialow, trescMomentu);

  const od = Number(k.t.toFixed(2));
  const doK = Number((k.t + trwanie).toFixed(2));
  // `y`: kompozycja niższa niż kadr musi dostać własną wysokość, inaczej ffmpeg
  // przykleja ją do górnej krawędzi, czyli zwykle na czoło mówiącego
  nakladki.push({plik: plikEfektu, od, do: doK, x: 0, y: pozycjaY(efekt)});
  // Wielki napis-efekt siada dokładnie tam, gdzie napisy karaoke. Zgłaszamy
  // okno, w którym napis ma zniknąć, inaczej dwa teksty leżą na sobie.
  if (efekt.naNapisach) napisyPrzerwy.push({od, do: doK});
  doRenderu.push({id: efekt.id, plik: plikEfektu, props, dlugoscSekund: Number(trwanie.toFixed(2))});
  if (efekt.sfx) {
    // dźwięki zbieramy jako kandydatów; które faktycznie wejdą, decyduje się
    // niżej, po całej rolce, żeby nie pikało kilkanaście razy
    sfxKandydaci.push({
      rodzaj: efekt.sfx,
      t: Number(k.t.toFixed(2)),
      moc: (efekt.mocSfx || 0) + (naHooku ? 5 : 0)
    });
  }

  uzyteTeraz.add(efekt.id);
  ostatniaRodzina = efekt.rodzina || null;
  historia.efekty[efekt.id] = (historia.rolek || 0) + 1;
  ostatniKoniec = k.t + trwanie;
  ostatniStart = k.t;
  policzone++;
}

/* -------------------- koncowka musi byc domknieta --------------------
   Ostatnie sekundy to puenta i CTA, czyli jedyny moment, w ktorym widz ma cos
   zrobic. Rolka, ktora w tym miejscu jest pusta, konczy sie tak, jakby urwalo
   jej sie zdanie. Jesli rytm nie postawil tam nic sam, dokladamy jeden efekt. */
if (napisy.length && dlugosc > 8) {
  const koniecOstatniego = nakladki.length ? Math.max(...nakladki.map((n) => n.do)) : 0;
  const oknoKoncowki = dlugosc - 5.5;
  if (koniecOstatniego < oknoKoncowki) {
    // szukamy ostatniej linijki, ktora zdazy sie zmiescic w calosci
    const kandydat = [...kandydaci].reverse().find((k) => k.t > oknoKoncowki && k.t < dlugosc - 2.2);
    if (kandydat) {
      const efekt =
        wybierzEfekt("cta", uzyteTeraz, ostatniaRodzina) ||
        wybierzEfekt("akcent", uzyteTeraz, ostatniaRodzina) ||
        wybierzEfekt("etykieta", uzyteTeraz, ostatniaRodzina);
      if (efekt) {
        const trwanie = Math.min(efekt.dlugosc, dlugosc - kandydat.t - 0.2);
        if (trwanie >= 1) {
          const trescMomentu = fraza(napisy, kandydat.i, 44);
          const plikEfektu = path.join("efekty", `${String(policzone + 1).padStart(2, "0")}-${efekt.id}.mov`);
          const od = Number(kandydat.t.toFixed(2));
          const doK = Number((kandydat.t + trwanie).toFixed(2));
          nakladki.push({plik: plikEfektu, od, do: doK, x: 0, y: pozycjaY(efekt)});
          if (efekt.naNapisach) napisyPrzerwy.push({od, do: doK});
          doRenderu.push({
            id: efekt.id,
            plik: plikEfektu,
            props: trescDlaEfektu(efekt, kandydat.linijka, kandydat.nastepna, napisy, kandydat.i, licznikRozdzialow, trescMomentu),
            dlugoscSekund: Number(trwanie.toFixed(2))
          });
          if (efekt.sfx) sfxKandydaci.push({rodzaj: efekt.sfx, t: od, moc: (efekt.mocSfx || 0) + 3});
          uzyteTeraz.add(efekt.id);
          historia.efekty[efekt.id] = (historia.rolek || 0) + 1;
          policzone++;
        }
      }
    }
  }
}

/* -------------------- dźwięk: kilka uderzeń, nie kanonada --------------------
   Wcześniej każdy efekt dostawał swój dźwięk i przy gęstym montażu rolka pikała
   kilkanaście razy. Brzmi to jak automat z nagrodami, a nie jak montaż. Bierzemy
   najmocniejsze momenty (hook, liczba, kontra, CTA), pilnujemy odstępu i tego,
   żeby ten sam dźwięk nie poszedł dwa razy pod rząd. */
const sfx = [];
{
  const wybrane = [];
  const posilne = [...sfxKandydaci].sort((a, b) => b.moc - a.moc || a.t - b.t);
  for (const kand of posilne) {
    if (wybrane.length >= MAKS_SFX) break;
    if (wybrane.some((w) => Math.abs(w.t - kand.t) < MIN_ODSTEP_SFX)) continue;
    wybrane.push(kand);
  }
  wybrane.sort((a, b) => a.t - b.t);
  // ten sam dźwięk dwa razy pod rząd brzmi jak zacinająca się płyta
  for (let i = 1; i < wybrane.length; i++) {
    if (wybrane[i].rodzaj !== wybrane[i - 1].rodzaj) continue;
    const zamiennik = {pop: "click", click: "pop", ding: "pop", whoosh: "swipe", swipe: "whoosh", impact: "sub-drop", typing: "click"}[wybrane[i].rodzaj];
    if (zamiennik) wybrane[i].rodzaj = zamiennik;
  }
  wybrane.forEach((w) => {
    sfx.push({plik: path.join(folderSfx, SFX_PLIKI[w.rodzaj]), t: w.t});
  });
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

/* -------------------- logo w rogu (brand bug) --------------------
   Znak w rogu kadru robi robotę: rolka udostępniona dalej albo podkradziona
   nadal mówi, czyj to materiał. Wchodzi sam, jeśli w folderze montażowym leży
   plik z logo. Ma to być PLIK, nie nazwa wpisana czcionką: napis wystukany
   w efekcie wygląda jak podpis, logo wygląda jak marka. */
let logo = null;
for (const nazwa of ["logo.png", "brand-bug.png", "logo.jpg"]) {
  const kandydat = path.join(katalog, nazwa);
  if (fs.existsSync(kandydat)) {
    logo = {plik: kandydat, szerokosc: 150, pozycja: "prawy-gorny"};
    break;
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
  hook: {sila: otwarcie.sila},
  punche,
  nakladki,
  ...(logo ? {logo} : {}),
  sfx: fs.existsSync(folderSfx) ? sfx : [],
  notatka:
    "Plan ułożony przez plan-efektow.mjs. Przejrzyj treść efektów w efekty.json, " +
    "popraw teksty tam, gdzie automat wziął zbyt dosłownie to, co padło w nagraniu."
};

fs.writeFileSync(plikPlanu, JSON.stringify(plan, null, 2), "utf8");
const plikEfektow = path.join(katalog, "efekty.json");
fs.writeFileSync(plikEfektow, JSON.stringify(doRenderu, null, 2), "utf8");

historia.otwarcia = historia.otwarcia || {};
historia.otwarcia[otwarcie.id] = (historia.rolek || 0) + 1;
historia.rolek = (historia.rolek || 0) + 1;
zapiszHistorie(historia);

/* -------------------- podsumowanie -------------------- */

console.log(`Nagranie:    ${path.basename(nagranie)}  (${dlugosc.toFixed(1)} s, ${fps} fps)`);
console.log(`Napisy:      ${napisy.length ? napisy.length + " linijek" : "brak"}`);
console.log(`Sklejki:     ${punche.length} (tylko tam idą zoom-punche)`);
console.log(`Muzyka:      ${muzyka ? path.basename(muzyka.plik) : "brak (podaj --muzyka folder)"}`);
console.log(`Otwarcie:    ${otwarcie.opis} (rotuje miedzy rolkami)`);
const coIle = dlugosc / Math.max(1, doRenderu.length);
console.log(`Efekty:      ${doRenderu.length} różnych, średnio co ${coIle.toFixed(1)} s`);
console.log(`Przerwy w napisach: ${napisyPrzerwy.length} (tam wjeżdża wielki napis-efekt)`);
console.log(`SFX:         ${plan.sfx.length} z ${sfxKandydaci.length} możliwych (limit ${MAKS_SFX}, żeby nie pikało bez przerwy)`);
console.log(`Logo:        ${logo ? path.basename(logo.plik) + " w prawym górnym rogu" : "brak (wrzuć logo.png do folderu montażowego)"}`);
if (!plan.sfx.length && !fs.existsSync(folderSfx)) {
  console.log("             Nie ma folderu sfx. Zrób go raz: node narzedzia/zrob-sfx.mjs sfx");
}
if (coIle > 5) {
  console.log(`\nUWAGA: efekt średnio co ${coIle.toFixed(1)} s to jak na rolkę mało. Najczęstsza przyczyna:`);
  console.log("nagranie nie ma napisów (zrób je najpierw) albo mówisz wolno i linijek jest niewiele.");
  console.log("Możesz zagęścić: --gestosc 2.5");
}
console.log("");
doRenderu.forEach((e, i) => {
  const opis = Object.values(e.props)
    .flat()
    .map((v) => (v && typeof v === "object" ? Object.values(v).join(" ") : String(v)))
    .join(" / ")
    .slice(0, 46);
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

/**
 * Gdzie leży silnik efektów. Wcześniej brany był wyłącznie z bieżącego folderu,
 * więc montaż uruchomiony gdziekolwiek indziej niż w katalogu z repo kończył się
 * komunikatem "MUSISZ-NAJPIERW-ZROBIC-NPM-INSTALL", mimo że wszystko było
 * zainstalowane. Teraz szukamy też obok samych narzędzi, czyli w repo.
 */
function znajdzRemotion(podany) {
  const korzenRepo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const kandydaci = [
    path.resolve(podany),
    path.join(korzenRepo, "remotion-montaz"),
    path.resolve(katalog, "remotion-montaz"),
    path.resolve(katalog, "..", "remotion-montaz")
  ];
  return kandydaci.find((k) => fs.existsSync(path.join(k, "package.json"))) || path.resolve(podany);
}

const folderRemotion = znajdzRemotion(remotionKatalog);
const cliRemotion = sciezkaCli(folderRemotion);
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
  const remotion = folderRemotion;
  if (!cliRemotion) {
    console.error(`\nSilnik efektów jest niegotowy. Wejdź do ${remotion} i uruchom: npm install`);
    process.exit(1);
  }
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
