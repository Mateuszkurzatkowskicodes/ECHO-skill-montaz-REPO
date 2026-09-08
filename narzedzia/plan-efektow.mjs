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
/* Odstep miedzy POCZATKAMI efektow. Wieksza wartosc niz kiedys (2.6),
   bo sekwencje trwaja 5-6 s: przy starej gestosci wchodzilyby jedna na druga. */
const gestosc = Number(wartosc("--gestosc", "2.9"));
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

/* KARTY NAD NAPISAMI zamiast wielkich napisow-cytatow (zmiana 08.09.2026).
   Wczesniej rola "akcent" oznaczala: wez fraze z transkrypcji i pokaz ja wielka
   czcionka na wysokosci napisow, a napisy na ten czas wytnij. Dawalo to jedno
   zdanie pokazane dwa razy, raz male i raz duze, urwane w losowym miejscu
   ("WLASCIWIE NO DARMOWA"), przy migajacych napisach. W rolkach uznanych za
   dobre tak to nie wyglada: napisy leca caly czas, a nad nimi siedzi mala karta
   z ramka, ikona i wlasnym haslem. `wys` ponizej 1920 sprawia, ze plan sam
   kladzie efekt nad napisami. Gole napisy-slamy zostaja w bibliotece do recznego
   uzycia, patrz SKILL.md. */
const EFEKTY = [
  /* PULA AUTOMATU: tylko karty nad napisami i sceny pelnoekranowe.
     08.09.2026 wypadly z niej WSZYSTKIE pelnokadrowe efekty tekstowe
     (fx-slam, fx-stempel, fx-podkreslenie, fx-kolo, fx-przekreslenie, glitch,
     scramble, marker, fx-cytat, typewriter, fx-ticker, strzalka, light-sweep,
     emoji-burst i reszta). Powod jest dwojaki i oba widac na klatkach:
       1. To sa cytaty z transkrypcji pokazane wielka czcionka, czyli to samo
          zdanie drugi raz, urwane w losowym miejscu.
       2. Ich pozycje ustala sam komponent, wiec plan nie moze ich odsunac od
          twarzy. "POSLUCHAJ" ladowalo na ustach mowiacego.
     Karty maja wlasna wysokosc (`wys`), wiec plan kladzie je co do piksela:
     ponizej twarzy i nad napisami. Reszta zostaje w bibliotece do RECZNEGO
     uzycia, gdy sam wybierzesz moment i napiszesz haslo. */

  /* SEKWENCJE. Podstawowa forma efektu w rolkach autora: nie jedna karta na
     2,8 s, tylko cos, co narasta przez 5-6 sekund i dokłada elementy w rytm
     mowy. Dlatego stoja na poczatku puli i maja najdluzszy czas trwania.
     Statyczne karty nizej sa uzupelnieniem, nie trzonem. */
  {id: "sekw-terminal", rola: "lista", rodzina: "sekwencja", pola: ["kroki"], dlugosc: 3.2, wys: 300, sfx: "click", mocSfx: 8},
  {scena: true, tlo: "jasne", id: "sekw-pelna", rola: "kontra", rodzina: "sekwencja", pola: ["pozycje"], dlugosc: 3.0, sfx: "whoosh", mocSfx: 9},
  {scena: true, tlo: "jasne", id: "sekw-przekreslona", rola: "kontra", rodzina: "sekwencja", pola: ["pozycje"], dlugosc: 3.0, sfx: "swipe", mocSfx: 9},
  {scena: true, tlo: "ciemne", id: "sekw-checklista", rola: "lista", rodzina: "sekwencja", pola: ["punkty"], dlugosc: 3.4, sfx: "pop", mocSfx: 8},

  // akcent: podstawowa forma efektu

  // liczby i wyniki

  // kontrast, "nie tak, a tak"

  // proces: pokazuje, zamiast opisywac

  /* Warianty zbudowane ze starych komponentow biblioteki, osadzone w niskiej
     kompozycji. Bez nich automat wyczerpywal pule w polowie rolki i powtarzal
     ten sam efekt dwa razy. */

  /* NAKLADKI, KTORE GRAJA NA NAGRANIU. To jest TRZON rolki: mowiacy jest
     widoczny, napisy leca, a nad nimi cos sie dzieje. Pelnoekranowe plansze
     wchodza rzadko, dla odetchniecia. Gdy zostaly same plansze, rolka miala
     rytm "mowiacy, czarna plansza, mowiacy, czarna plansza" i autor odrzucil
     to od razu. Wszystkie sa animacjami, nie ramkami z napisem: licznik
     przewija sie, pasek rosnie, ikony wlatuja, equalizer gra. */
  {id: "nak-licznik", rola: "liczba", rodzina: "nakladka", pola: ["do"], dlugosc: 2.4, wys: 300, wymagaLiczb: 1, sfx: "ding", mocSfx: 9},
  {id: "nak-pasek", rola: "lista", rodzina: "nakladka", pola: ["kroki"], dlugosc: 2.6, wys: 300, sfx: "click", mocSfx: 7},
  {id: "nak-ikony", rola: "akcent", rodzina: "nakladka", pola: ["ikony"], dlugosc: 2.6, wys: 300, sfx: "pop", mocSfx: 7},
  {id: "nak-equalizer", rola: "cta", rodzina: "nakladka", pola: [], dlugosc: 2.4, wys: 300, sfx: "riser", mocSfx: 8},
  {id: "nak-porownanie", rola: "kontra", rodzina: "nakladka", pola: ["lewaWartosc", "prawaWartosc"], dlugosc: 2.6, wys: 300, sfx: "whoosh", mocSfx: 9},

  /* ANIMOWANE ILUSTRACJE. Trzon zestawu od 08.09.2026: rysuja to, o czym mowi
     mowiacy, i sa w ruchu przez caly swoj czas. Wszystkie "ramki z napisem"
     wylecialy z puli, bo autor odrzucal je konsekwentnie: "takie cos zrobi
     kazdy w Canvie". `wymagaLiczb` nie jest tu potrzebne, bo zaden z tych
     efektow nie cytuje liczby, tylko pokazuje zjawisko. */
  {scena: true, tlo: "ciemne", id: "anim-wykres", rola: "kontra", rodzina: "animacja", pola: ["podpis"], dlugosc: 2.8, sfx: "sub-drop", mocSfx: 9},
  {scena: true, tlo: "ciemne", id: "anim-wzrost", rola: "lista", rodzina: "animacja", pola: ["podpis"], dlugosc: 2.8, sfx: "riser", mocSfx: 9},
  {scena: true, tlo: "ciemne", id: "anim-kalendarz", rola: "akcent", rodzina: "animacja", pola: ["podpis"], dlugosc: 3.0, sfx: "swipe", mocSfx: 8},
  {scena: true, tlo: "ciemne", id: "anim-zegar", rola: "liczba", rodzina: "animacja", pola: ["podpis"], dlugosc: 2.8, sfx: "click", mocSfx: 8},
  {scena: true, tlo: "ciemne", id: "anim-timeline", rola: "lista", rodzina: "animacja", pola: ["podpis"], dlugosc: 3.2, sfx: "click", mocSfx: 8},
  {scena: true, tlo: "ciemne", id: "anim-orbita", rola: "kontra", rodzina: "animacja", pola: ["podpis"], dlugosc: 3.2, sfx: "whoosh", mocSfx: 9},
  {scena: true, tlo: "ciemne", id: "anim-fala", rola: "cta", rodzina: "animacja", pola: ["podpis"], dlugosc: 3.0, sfx: "riser", mocSfx: 9},

  /* GRAFIKI, KTORE ILUSTRUJA. Najmocniejsze momenty w rolkach autora nie sa
     napisami, tylko rysunkami: pierscien dobiegajacy do wartosci, suwak na
     skali, rosnace slupki, wpadajace wiadomosci, mockup konta. Widz ich nie
     czyta, tylko oglada. `wymagaLiczb` przy pierscieniu i suwaku pilnuje, zeby
     nie wchodzily tam, gdzie nie padla zadna liczba. */
  {scena: true, tlo: "ciemne", id: "graf-pierscien", rola: "liczba", rodzina: "grafika", pola: ["wartosc"], dlugosc: 3.0, wymagaLiczb: 1, sfx: "ding", mocSfx: 9},
  {scena: true, tlo: "jasne", id: "graf-suwak", rola: "liczba", rodzina: "grafika", pola: ["wartosc"], dlugosc: 3.0, wymagaLiczb: 1, sfx: "click", mocSfx: 8},
  {scena: true, tlo: "ciemne", id: "graf-slupki", rola: "lista", rodzina: "grafika", pola: [], dlugosc: 3.4, sfx: "pop", mocSfx: 8},
  {scena: true, tlo: "ciemne", id: "graf-powiadomienia", rola: "cta", rodzina: "grafika", pola: [], dlugosc: 3.4, sfx: "pop", mocSfx: 9},
  {scena: true, tlo: "jasne", id: "graf-konto", rola: "akcent", rodzina: "grafika", pola: [], dlugosc: 3.2, sfx: "whoosh", mocSfx: 8},

  /* SCENY PELNOEKRANOWE. Jedyne, co ma prawo zaslonic napisy i twarz, bo
     zmieniaja caly kadr i maja wlasny tekst. Automat przeplata ciemne z jasnymi. */
  {scena: true, tlo: "ciemne", id: "scena-teza", rola: "akcent", rodzina: "scena", pola: ["tekst"], dlugosc: 2.4, sfx: "impact", mocSfx: 9},
  {scena: true, tlo: "jasne", id: "scena-lista", rola: "lista", rodzina: "scena", pola: ["punkty"], dlugosc: 2.6, sfx: "pop", mocSfx: 7},
  {scena: true, tlo: "ciemne", id: "scena-liczba", rola: "liczba", rodzina: "scena", pola: ["liczba", "podpis"], dlugosc: 2.4, sfx: "ding", mocSfx: 9},
  {scena: true, tlo: "jasne", id: "scena-problem", rola: "kontra", rodzina: "scena", pola: ["punkty"], dlugosc: 2.6, sfx: "swipe", mocSfx: 8},
  {scena: true, tlo: "ciemne", id: "scena-kroki", rola: "lista", rodzina: "scena", pola: ["kroki"], dlugosc: 2.6, sfx: "pop", mocSfx: 7},
  {scena: true, tlo: "jasne", id: "scena-komentarz", rola: "cta", rodzina: "scena", pola: ["nick", "tresc"], dlugosc: 2.6, sfx: "pop", mocSfx: 9},
  {scena: true, tlo: "ciemne", id: "scena-cta", rola: "cta", rodzina: "scena", pola: ["haslo", "podpis"], dlugosc: 2.4, sfx: "impact", mocSfx: 9}

  // `scena-kontra` i `money-counter`: poza automatem, wymagaja danych, ktorych
  // nie da sie uczciwie wyciac z transkrypcji. Patrz SKILL.md.
];

/* Sceny sa wybierane osobno od reszty, bo maja pilnowac dwoch rzeczy naraz:
   zeby w ogole byly (bez tego automat siegal wylacznie po male nakladki)
   i zeby ciemna nie szla zaraz po ciemnej. */
function wybierzScene(rola, uzyteTeraz, ostatnieTlo) {
  const wolne = EFEKTY.filter((e) => e.scena && !uzyteTeraz.has(e.id));
  if (!wolne.length) return null;
  const kolejnosc = (lista) =>
    lista.slice().sort((a, b) => (historia.efekty[a.id] || 0) - (historia.efekty[b.id] || 0));
  // 1. scena pasujaca do tresci i z innym tlem niz poprzednia
  let pula = kolejnosc(wolne.filter((e) => e.rola === rola && e.tlo !== ostatnieTlo));
  // 2. cokolwiek z innym tlem, zeby nie robic dwoch ciemnych plansz pod rzad
  if (!pula.length) pula = kolejnosc(wolne.filter((e) => e.tlo !== ostatnieTlo));
  // 3. ostatecznie pasujaca do tresci, nawet z tym samym tlem
  if (!pula.length) pula = kolejnosc(wolne.filter((e) => e.rola === rola));
  if (!pula.length) pula = kolejnosc(wolne);
  const trzy = pula.slice(0, Math.min(3, pula.length));
  return trzy[Math.floor(Math.random() * trzy.length)];
}

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

/**
 * Gdzie postawic nakladke.
 *
 * Karty maja tresc przy DOLNEJ krawedzi swojej kompozycji, wiec ustawiamy je
 * tak, zeby ta krawedz wypadla tuz nad napisami karaoke. Gorna krawedz karty
 * schodzi wtedy ponizej twarzy, czyli tam, gdzie efekt ma prawo byc.
 * `bezpieczneOd` przychodzi z pomiaru nagrania (gdzie-twarz.py); gdy pomiar
 * sie nie udal, dostajemy ostrozna wartosc domyslna.
 */
function pozycjaY(efekt, bezpieczneOd, dolNapisow) {
  const wys = efekt.wys || WYSOKOSC_KADRU;
  if (wys >= WYSOKOSC_KADRU) return 0;
  const dolKarty = (dolNapisow || WYSOKOSC_KADRU - 520) - 95;
  let y = dolKarty - wys;
  // Gdy karta siegnelaby na twarz, spychamy ja nizej, ale nie na napisy.
  if (bezpieczneOd && y < bezpieczneOd - wys * 0.15) {
    // Odsuwamy od twarzy, ale NIGDY ponizej linii, na ktorej stoja napisy:
    // inaczej nakladka schodzila prosto na nie i dwa teksty lezaly na sobie.
    y = Math.min(Math.round(bezpieczneOd - wys * 0.15), dolKarty - wys);
  }
  return Math.max(0, Math.min(y, WYSOKOSC_KADRU - wys));
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
/* Ile razy dany efekt juz wszedl w TEJ rolce. "Tabletki" (mala pigulka z ikona
   i pigulki z krzyzykiem) czytaja sie jako jeden trik, wiec licza sie wspolnie:
   dwie w jednej rolce to juz powtorka, nawet gdy tekst jest inny. */
const TABLETKI = ["badge-ikona", "pigulki-nie"];
const iloscUzyc = {};
function ponadLimit(e) {
  if (!e.limit) return false;
  const grupa = TABLETKI.includes(e.id) ? TABLETKI : [e.id];
  const razem = grupa.reduce((suma, id) => suma + (iloscUzyc[id] || 0), 0);
  return razem >= e.limit;
}

function wybierzEfekt(rola, uzyteTeraz, ostatniaRodzina = null, tylkoRodziny = null, iloscLiczb = 0) {
  const pasuje = (e) =>
    e.rola === rola &&
    !uzyteTeraz.has(e.id) &&
    !ponadLimit(e) &&
    // Limit plansz pelnoekranowych obowiazuje takze przy zwyklym doborze po roli,
    // nie tylko przy ich wymuszaniu. Bez tego automat braly je "przy okazji"
    // i rolka znowu skladala sie z samych slajdow.
    (!e.scena || scenZrobione < docelowoScen) &&
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
/* SLOWA, OD KTORYCH HASLO NIE MOZE SIE ZACZYNAC.
   Fraza wycieta z transkrypcji lubi zaczynac sie od spojnika albo przerywnika,
   bo mowa nie dzieli sie na naglowki. "NO I W TYM MOMENCIE TWOJ" i "WLASCIWIE
   NO DARMOWA" to sa dokladnie takie przypadki: technicznie cytat, w kadrze
   belkot. Obcinamy je z przodu, a jesli po obcieciu nie zostaje nic sensownego,
   efekt tekstowy NIE wchodzi wcale. */
const SLOWA_PUSTE = [
  "no", "i", "a", "bo", "więc", "wiec", "że", "ze", "to", "ale", "po", "prostu",
  "właściwie", "wlasciwie", "czyli", "tam", "już", "juz", "też", "tez", "tak",
  "jakiś", "jakis", "taki", "takie", "tego", "tym", "ten", "ta", "te", "jest",
  "są", "sa", "być", "byc", "no i", "gdy", "kiedy", "jak", "przez", "dla",
  "na", "w", "z", "do", "od", "o", "u", "za", "przy", "pod", "nad"
];

/**
 * Krotkie, KOMPLETNE haslo na karte. Zwraca null, gdy nie da sie go zbudowac.
 *
 * Bierze slowa od podanego miejsca, konczy na najblizszej interpunkcji (tam
 * konczy sie mysl), obcina wiodace spojniki i przerywniki, a na koniec sprawdza,
 * czy zostaly przynajmniej dwa slowa niosace tresc. Lepiej pominac efekt niz
 * wstawic w kadr urwane zdanie: rolka z szescioma dobrymi efektami wyglada
 * lepiej niz z osmioma, z ktorych dwa sa belkotem.
 */
function krotkieHaslo(napisy, indeks, maksSlow = 4) {
  if (!napisy || !napisy.length) return null;
  let slowa = [];
  for (let i = indeks; i < napisy.length && slowa.length < maksSlow + 3; i++) {
    const surowe = (napisy[i].tekst || "").trim();
    if (!surowe) continue;
    for (const w of surowe.split(/\s+/)) {
      slowa.push(w);
      if (/[.,!?:;]$/.test(w)) break;
    }
    if (slowa.length && /[.,!?:;]$/.test(slowa[slowa.length - 1])) break;
  }
  // obetnij wiodace slowa puste
  while (slowa.length) {
    const pierwsze = slowa[0].toLowerCase().replace(/[^a-ząćęłńóśźż]/g, "");
    if (SLOWA_PUSTE.includes(pierwsze)) slowa.shift();
    else break;
  }
  slowa = slowa.slice(0, maksSlow).map((w) => w.replace(/[.,!?:;]+$/, ""));
  const niosace = slowa.filter((w) => w.replace(/[^a-ząćęłńóśźż]/gi, "").length > 2);
  if (niosace.length < 2) return null;
  const haslo = slowa.join(" ").trim();
  return haslo.length >= 6 ? haslo : null;
}


/* IKONY DO SEKWENCJI.
   W rolkach autora kazda pozycja listy ma ikone i to ona niesie polowe przekazu:
   zegar przy czasie, banknoty przy pieniadzach, dyplom przy nauce. Dobieramy ja
   po tresci frazy, a gdy nic nie pasuje, bierzemy neutralna kropke z listy
   rotacyjnej, zeby dwie pozycje obok siebie nie mialy tej samej. */
const IKONY = [
  {slowa: ["godzin", "czas", "minut", "dzien", "dni", "tydzien", "szybko", "dlugo", "wieczn"], ikona: "⏰"},
  {slowa: ["zloty", "zl", "kasa", "pieniadz", "koszt", "cena", "darmo", "platn", "budzet", "drog", "tani"], ikona: "💸"},
  {slowa: ["ucz", "nauk", "kurs", "szkol", "wiedz", "umiejetnosc"], ikona: "🎓"},
  {slowa: ["montaz", "edycj", "ciec", "efekt", "wideo", "nagran", "rolk", "film"], ikona: "🎬"},
  {slowa: ["klient", "ludzi", "widz", "obserwuj", "zasieg", "publik"], ikona: "👥"},
  {slowa: ["biznes", "firm", "sprzedaz", "oferta", "usluga"], ikona: "💼"},
  {slowa: ["problem", "blad", "strat", "traci", "ryzyk", "kryzys", "zamkn"], ikona: "⚠️"},
  {slowa: ["ai", "sztuczn", "automat", "komput", "program", "narzedzi"], ikona: "🤖"},
  {slowa: ["wynik", "efekt", "wzrost", "lepiej", "sukces", "zysk"], ikona: "📈"},
  {slowa: ["telefon", "komork", "instagram", "facebook", "social", "media"], ikona: "📱"},
];
const IKONY_ZAPASOWE = ["🔸", "✅", "⚡", "🔥", "💡"];

function ikonaDla(fraza, numer) {
  const t = (fraza || "").toLowerCase();
  for (const {slowa, ikona} of IKONY) {
    if (slowa.some((s) => t.includes(s))) return ikona;
  }
  return IKONY_ZAPASOWE[numer % IKONY_ZAPASOWE.length];
}

/* Kilka kolejnych, KOMPLETNYCH fraz z nagrania, po jednej na pozycje listy.
   Bierzemy je z roznych miejsc (co druga linijka napisow), zeby dwie pozycje
   nie byly tym samym zdaniem przycietym w dwoch miejscach. */
function frazyDoListy(napisy, indeks, ile, maksSlow) {
  const wynik = [];
  let i = indeks;
  let prob = 0;
  while (wynik.length < ile && prob < 8 && napisy && i < napisy.length) {
    const h = krotkieHaslo(napisy, i, maksSlow);
    if (h && !wynik.includes(h)) wynik.push(h);
    i += 2;
    prob++;
  }
  return wynik;
}

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
    /* ---- SEKWENCJE ----
       Kazda dostaje kilka OSOBNYCH fraz z nagrania, po jednej na pozycje, plus
       ikone dobrana do tresci. Gdy nie da sie zebrac przynajmniej dwoch
       sensownych fraz, pole jest null i ukladanie pomija ten moment: pusta
       sekwencja wyglada gorzej niz jej brak. */
    case "nak-licznik": {
      const lb = (liczba.match(/[\d\s.,]+/) || ["0"])[0].replace(/[\s.,]/g, "");
      return {do: Number(lb) || 0, jednostka: "", podpis: "", wDol: false};
    }
    case "nak-pasek":
      return {etykieta: "", kroki: []};
    case "nak-ikony":
      return {ikony: ["🎬", "✂️", "🎵", "📤"], podpisy: []};
    case "nak-equalizer":
      return {podpis: ""};
    case "nak-porownanie":
      return {lewaEtykieta: "", lewaWartosc: "", prawaEtykieta: "", prawaWartosc: ""};

    case "anim-wykres":
    case "anim-wzrost":
    case "anim-kalendarz":
    case "anim-zegar":
    case "anim-timeline":
    case "anim-orbita":
    case "anim-fala":
      // Animacje pokazuja zjawisko, nie cytuja nagrania. Podpis i puenta sa do
      // wpisania recznie, przy przepisywaniu tekstow: wtedy trafiaja w zdanie,
      // ktore leci pod nimi.
      return {podpis: "", puenta: ""};

    case "graf-pierscien":
      return {nadtytul: "", wartosc: liczba.toUpperCase(), podpis: "", jasne: false};
    case "graf-suwak":
      return {nadtytul: "", wartosc: liczba.toUpperCase(), opis: "", skala: ["0", "", "", "", liczba.toUpperCase()], jasne: true};
    case "graf-slupki":
      return {nadtytul: "", jasne: false};
    case "graf-powiadomienia":
      // Mockup wiadomosci, nie cytat: tresci sa neutralne i nie udaja niczego,
      // czego user nie powiedzial.
      return {nadtytul: "", jasne: false};
    case "graf-konto":
      return {nadtytul: "", nick: "twoja.firma", jasne: true};

    case "sekw-nakladka": {
      const f2 = frazyDoListy(napisy, indeks, 2, 4);
      return f2.length >= 2
        ? {pozycje: f2.map((t, i) => ({ikona: ikonaDla(t, i), tekst: t.toLowerCase()})), etykieta: ""}
        : {pozycje: null};
    }
    case "sekw-pelna": {
      const f3 = frazyDoListy(napisy, indeks, 2, 3);
      return f3.length >= 2
        ? {
            etykieta: "",
            pozycje: f3.map((t, i) => ({ikona: ikonaDla(t, i), tekst: t.toLowerCase()})),
            puenta: "",
            jasne: true,
          }
        : {pozycje: null};
    }
    case "sekw-przekreslona": {
      const f4 = frazyDoListy(napisy, indeks, 2, 3);
      return f4.length >= 2
        ? {
            etykieta: "koniec z tym",
            pozycje: f4.map((t, i) => ({ikona: ikonaDla(t, i), tekst: t.toLowerCase(), przekreslone: true})),
            puenta: "",
            jasne: true,
          }
        : {pozycje: null};
    }
    case "sekw-checklista": {
      const f5 = frazyDoListy(napisy, indeks, 3, 2);
      return f5.length >= 2 ? {etykieta: "", punkty: f5.map((t) => t.toUpperCase()), jasne: false} : {punkty: null};
    }
    case "sekw-terminal": {
      const f6 = frazyDoListy(napisy, indeks, 3, 4);
      return f6.length >= 2 ? {tytul: "AI MONTUJE", kroki: f6.map((t) => t.toLowerCase())} : {kroki: null};
    }
    /* ---- KARTY NAD NAPISAMI ----
       Haslo jest krotkie i kompletne albo nie ma go wcale (patrz krotkieHaslo).
       `null` w polu tekstowym jest sygnalem dla ukladania, zeby pominac ten
       moment zamiast wstawiac w kadr urwane zdanie. */
    case "karta-teza": {
      const h = krotkieHaslo(napisy, indeks, 4);
      return h ? {nadtytul: "", tekst: h.toUpperCase()} : {tekst: null};
    }
    case "badge-ikona": {
      const h = krotkieHaslo(napisy, indeks, 4);
      return h ? {ikona: "👉", tekst: h.toUpperCase()} : {tekst: null};
    }
    case "karta-liczba": {
      const podpisK = scalone
        .split(/\s+/)
        .filter((w) => !/\d/.test(w) && w.replace(/[^a-ząćęłńóśźż]/gi, "").length > 2)
        .slice(0, 3)
        .join(" ")
        .trim();
      return {ikona: "📊", liczba: liczba.toUpperCase(), podpis: podpisK || "tyle to jest"};
    }
    case "pigulki-nie": {
      const a = krotkieHaslo(napisy, indeks, 3);
      const b = krotkieHaslo(napisy, Math.min(napisy.length - 1, indeks + 2), 3);
      const punkty = [a, b].filter(Boolean);
      return punkty.length ? {punkty: punkty.map((p) => p.toLowerCase()), nadtytul: ""} : {punkty: null};
    }
    case "karta-zamiana": {
      const a = krotkieHaslo(napisy, indeks, 3);
      const b = krotkieHaslo(napisy, Math.min(napisy.length - 1, indeks + 2), 3);
      return a && b ? {nadtytul: "", stare: a.toUpperCase(), nowe: b.toUpperCase(), podpis: ""} : {stare: null};
    }
    case "k-wynik":
      return {liczba: liczba.toUpperCase(), podpis: (scalone.split(/\s+/).filter((w) => !/\d/.test(w) && w.length > 2).slice(0, 3).join(" ") || "tyle to jest").toUpperCase()};
    case "k-lista": {
      const a1 = krotkieHaslo(napisy, indeks, 3);
      const b1 = krotkieHaslo(napisy, Math.min(napisy.length - 1, indeks + 2), 3);
      const p1 = [a1, b1].filter(Boolean);
      return p1.length ? {punkty: p1.map((x) => x.toUpperCase())} : {punkty: null};
    }
    case "k-komentarz": {
      const sl = tekst.split(/\s+/).filter((w) => w.replace(/[^a-ząćęłńóśźż]/gi, "").length > 3);
      return {nick: "twoj.profil", tresc: (sl.length ? sl[sl.length - 1] : "komentarz").replace(/[.,!?:]+$/, "").toUpperCase()};
    }
    case "mockup-plik":
      // Mockup pokazuje proces, nie cytuje nagrania: nie ma czego zepsuc.
      return {};

    /* ---- SCENY PELNOEKRANOWE ----
       Trzymaja sie tej samej zasady co reszta: cytuja to, co naprawde padlo
       w nagraniu. Zadnych dopisanych liczb, obietnic ani wynikow. Scena jest
       duza, wiec zle dobrany tekst rzuca sie w oczy bardziej niz w malej
       nakladce: dlatego frazy sa dluzsze, ale przyciete do rozsadnej dlugosci. */
    case "scena-teza":
      return {tekst: scalone.slice(0, 46).toUpperCase(), etykieta: "", klucz: ""};
    case "scena-problem":
      return {
        punkty: [tekst.toLowerCase(), dalej.toLowerCase()].filter(Boolean).slice(0, 3),
        etykieta: "koniec z tym",
      };
    case "scena-lista":
      return {
        punkty: [tekst.toLowerCase(), dalej.toLowerCase()].filter(Boolean).slice(0, 3),
        etykieta: "",
      };
    case "scena-kroki":
      return {
        kroki: [tekst.toLowerCase(), dalej.toLowerCase()].filter(Boolean).slice(0, 3),
        etykieta: "",
      };
    case "scena-liczba": {
      const podpisS = scalone
        .split(/\s+/)
        .filter((w) => !/\d/.test(w) && w.replace(/[^a-zA-Ząćęłńóśźż]/gi, "").length > 2)
        .join(" ")
        .slice(0, 24)
        .trim();
      return {liczba: liczba.toUpperCase(), podpis: podpisS.toLowerCase(), etykieta: ""};
    }
    case "scena-komentarz": {
      const slowaK = tekst.split(/\s+/).filter((w) => w.replace(/[^a-zA-Ząćęłńóśźż]/gi, "").length > 3);
      const kluczK = slowaK.length ? slowaK[slowaK.length - 1] : "komentarz";
      return {nick: "twoj.profil", tresc: kluczK.replace(/[.,!?:]+$/, "").toLowerCase(), etykieta: ""};
    }
    case "scena-cta":
      return {haslo: tekst.slice(0, 26).toUpperCase(), podpis: dalej.slice(0, 26).toLowerCase() || "napisz w komentarzu"};

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
      // Wiekszosc efektow bierze jedno pole tekstowe. Idzie ono przez
      // krotkieHaslo, zeby w kadrze nie ladowal srodek zdania. Gdy sensownego
      // hasla nie da sie zbudowac, pole jest null i ukladanie pomija ten moment.
      if (efekt.pola.includes("tekst")) {
        const h = krotkieHaslo(napisy, indeks, 4) || (tekst.split(/\s+/).length <= 4 ? tekst : null);
        return {tekst: h ? h.toUpperCase() : null};
      }
      return {};
  }
}

/* ============================== układanie ============================== */

const dlugosc = dlugoscPliku(nagranie);

/* GDZIE WOLNO POLOZYC EFEKT.
   Wysokosc byla wczesniej stala, dobrana pod jedno nagranie. Przy innym
   kadrowaniu ta sama liczba ladowala mowiacemu na ustach. Teraz pytamy
   nagranie: narzedzie gdzie-twarz.py zwraca dolna krawedz twarzy, a my
   kladziemy karty PONIZEJ niej i NAD napisami. Gdy detekcja nie zadziala
   (brak opencv, nietypowy kadr), zostaje ostrozna wartosc domyslna i nic
   sie nie wywala. */
function zmierzTwarz(plikWideo) {
  const skrypt = path.join(path.dirname(fileURLToPath(import.meta.url)), "gdzie-twarz.py");
  if (!fs.existsSync(skrypt)) return null;
  for (const python of ["python", "python3", "py"]) {
    const r = spawnSync(python, [skrypt, plikWideo, "--json"], {encoding: "utf8"});
    if (r.status === 0 && r.stdout) {
      try {
        return JSON.parse(r.stdout.trim().split("\n").pop());
      } catch {
        return null;
      }
    }
  }
  return null;
}

const twarz = zmierzTwarz(nagranie);
/* Napisy karaoke siedza 520 px od dolu, wiec dolna krawedz efektu musi zostac
   nad nimi. Gorna krawedz musi zostac ponizej twarzy. Miedzy tymi dwiema
   liniami jest pas, w ktorym efekt jest bezpieczny. */
const DOL_NAPISOW = WYSOKOSC_KADRU - 520;
const BEZPIECZNE_OD = twarz && twarz.bezpieczneY
  ? twarz.bezpieczneY
  : Math.round(WYSOKOSC_KADRU * 0.62);

if (twarz && twarz.twarzDol) {
  console.log(`Twarz:       konczy sie na ${twarz.twarzDol} px, efekty kladę od ${BEZPIECZNE_OD} px`);
} else {
  console.log(`Twarz:       nie wykryta, biorę ostrożne ${BEZPIECZNE_OD} px`);
}

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

/* ILE SCEN PELNOEKRANOWYCH ma miec rolka.
   Bez tego licznika automat prawie nigdy po nie siegal: przy wyborze po roli
   wygrywaly male nakladki, bo jest ich w puli kilka razy wiecej. Efekt byl taki,
   ze kursant dostawal rolke zlozona z samych napisow na twarzy. Sceny sa
   rozlozone rowno po dlugosci nagrania i nie wchodza na sam hook. */
/* ILE PELNOEKRANOWYCH PLANSZ. Maks dwie na rolke do minuty i nigdy dwie pod
   rzad: reszta efektow gra NA nagraniu. Wczesniej plansz bylo tyle, ile efektow,
   i rolka wygladala jak seria slajdow przedzielonych mowiacym. */
const docelowoScen = Math.min(3, Math.max(1, Math.round(dlugosc / 22)));
const slotyScen = Array.from(
  {length: docelowoScen},
  (_, i) => (dlugosc * (i + 1)) / (docelowoScen + 1)
);
let scenZrobione = 0;
let ostatnieTloSceny = null;

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

  /* Czy w tym miejscu ma wejsc pelnoekranowa scena. Nie na hooku (otwarcie ma
     swoja forme) i nie czesciej niz przewiduje slot. */
  const chceScene =
    !naHooku &&
    scenZrobione < docelowoScen &&
    k.t >= slotyScen[scenZrobione] - 1.5 &&
    k.t < dlugosc - 4.2;

  let efekt = chceScene ? wybierzScene(rola, uzyteTeraz, ostatnieTloSceny) : null;
  if (!efekt) efekt = wybierzEfekt(rola, uzyteTeraz, ostatniaRodzina, naHooku ? otwarcie.rodziny : null, iloscLiczb);
  if (!efekt && naHooku) efekt = wybierzEfekt(rolaZTresci, uzyteTeraz, ostatniaRodzina, otwarcie.rodziny, iloscLiczb);
  // Forma otwarcia jest wazniejsza niz dopasowanie roli do tresci: rolka ma
  // zaczynac sie inaczej niz poprzednia, nawet jesli w pierwszym zdaniu padla
  // liczba albo pytanie. Bez tego otwarcie po cichu wracalo do wielkiego napisu.
  if (!efekt && naHooku) efekt = wybierzZRodzin(otwarcie.rodziny, uzyteTeraz);
  // rola wyczerpana w tej rolce: bierzemy cokolwiek, czego jeszcze nie było
  if (!efekt) efekt = wybierzEfekt("akcent", uzyteTeraz, ostatniaRodzina, null, iloscLiczb) || wybierzEfekt("etykieta", uzyteTeraz, ostatniaRodzina, null, iloscLiczb);
  /* Rola sie wyczerpala, ale pula NIE. Wczesniej w tym miejscu automat od razu
     czyscil liste uzytych i powtarzal efekt, ktory byl przed chwila: przy jednym
     nagraniu wyszly trzy te same sceny i dwie te same karty w 26 sekundach.
     Najpierw wiec bierzemy cokolwiek, czego w tej rolce jeszcze nie bylo,
     nawet jesli rola nie pasuje idealnie do zdania. Roznorodnosc jest wazniejsza
     niz dopasowanie roli: widz nie wie, jaka role mial fragment, ale od razu
     widzi, ze ten sam efekt wraca. */
  if (!efekt) {
    const wolne = EFEKTY.filter(
      (e) => !uzyteTeraz.has(e.id) && !ponadLimit(e) && (!e.scena || scenZrobione < docelowoScen)
    );
    const inneNizPoprzednia = wolne.filter((e) => e.rodzina !== ostatniaRodzina);
    const pula = (inneNizPoprzednia.length ? inneNizPoprzednia : wolne).sort(
      (a, b) => (historia.efekty[a.id] || 0) - (historia.efekty[b.id] || 0)
    );
    if (pula.length) efekt = pula[Math.floor(Math.random() * Math.min(3, pula.length))];
  }

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
  /* Pole ustawione na null oznacza: z tego miejsca nie da sie wyciac sensownego
     hasla. Pomijamy moment zamiast wstawiac w kadr urwane zdanie. */
  if (Object.values(props).some((w) => w === null)) continue;
  /* Pelnokadrowy efekt tekstowy domyslnie siada na wysokosci napisow karaoke.
     Chcemy go NAD nimi, zeby napisy zostaly widoczne, wiec podajemy pozycje
     jawnie w propsach. defaultProps w Root.tsx tu nie wystarcza. */
  if (efekt.pozycja) props.pozycja = efekt.pozycja;

  const od = Number(k.t.toFixed(2));
  const doK = Number((k.t + trwanie).toFixed(2));
  // `y`: kompozycja niższa niż kadr musi dostać własną wysokość, inaczej ffmpeg
  // przykleja ją do górnej krawędzi, czyli zwykle na czoło mówiącego
  nakladki.push({plik: plikEfektu, od, do: doK, x: 0, y: pozycjaY(efekt, BEZPIECZNE_OD, DOL_NAPISOW)});
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

  iloscUzyc[efekt.id] = (iloscUzyc[efekt.id] || 0) + 1;
  if (efekt.scena) {
    scenZrobione++;
    ostatnieTloSceny = efekt.tlo || null;
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
          nakladki.push({plik: plikEfektu, od, do: doK, x: 0, y: pozycjaY(efekt, BEZPIECZNE_OD, DOL_NAPISOW)});
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
  /* DRAMATURGIA: dwa dzwieki, ktore nie sa akcentem na nakladce, tylko robota
     na calej rolce. Nie licza sie do limitu "popow", bo nie pikaja: jeden
     podbija samo wejscie, drugi buduje napiecie przed puenta. Bez nich montaz
     jest poprawny, ale plaski w miejscach, w ktorych powinien byc mocny. */
  const dramaturgia = [];
  if (otwarcie.pusteSekundy) {
    // otwarcie bez nakladki nie mialo zadnego akcentu: sam obraz i cisza
    dramaturgia.push({rodzaj: "sub-drop", t: 0.12});
  }
  const ostatniaNakladka = nakladki.length
    ? nakladki.reduce((a, b) => (b.od > a.od ? b : a))
    : null;
  if (ostatniaNakladka && ostatniaNakladka.od > 4) {
    const t = Number(Math.max(0.3, ostatniaNakladka.od - 1.05).toFixed(2));
    dramaturgia.push({rodzaj: "riser", t});
  }
  for (const d of dramaturgia) {
    if (wybrane.some((w) => Math.abs(w.t - d.t) < 0.9)) continue;
    wybrane.push(d);
  }
  wybrane.sort((a, b) => a.t - b.t);

  wybrane.forEach((w) => {
    sfx.push({
      plik: path.join(folderSfx, SFX_PLIKI[w.rodzaj]),
      t: w.t,
      // riser ma narastac pod spodem, a nie przykrywac glos
      ...(w.rodzaj === "riser" ? {glosnosc: 0.3} : {})
    });
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

/* -------------------- muzyka: pod tresc, nie po kolei --------------------
   Wczesniej brany byl po prostu utwor, ktorego dawno nie bylo. Rotacja jest
   potrzebna, zeby profil nie brzmial jednostajnie, ale sama w sobie potrafi
   podlozyc spokojne lofi pod nagranie o tym, ile tracisz, albo phonk pod
   spokojne tlumaczenie. Dlatego najpierw czytamy, o czym jest nagranie, a
   rotacja rozstrzyga dopiero remisy. */

const NASTROJE = [
  {plik: "mocny-phonk-pantheon", slowa: ["przestań", "przestan", "błąd", "blad", "źle", "zle", "myślisz", "myslisz", "wszyscy", "koniec", "nieprawda", "mit"]},
  {plik: "energiczny-napiecie", slowa: ["tracisz", "strata", "problem", "kosztuje", "koszt", "ryzyko", "drogo", "przepalasz", "traci"]},
  {plik: "energiczny-phonk-only-human", slowa: ["tysiąc", "tysiac", "procent", "szybko", "wyniki", "rekord", "razy", "minut", "sekund"]},
  {plik: "nowoczesny-tech", slowa: ["ai", "sztuczna", "narzędzie", "narzedzie", "program", "komenda", "automat", "montaż", "montaz", "komputer", "aplikacja"]},
  {plik: "motywacyjny-do-dzialania", slowa: ["zacznij", "zrób", "zrob", "działaj", "dzialaj", "napisz", "komentarz", "spróbuj", "sprobuj", "wejdź", "wejdz"]},
  {plik: "cieply-optymistyczny", slowa: ["udało", "udalo", "działa", "dziala", "wyszło", "wyszlo", "efekt", "gotowe", "super", "świetnie", "swietnie"]},
  {plik: "emocjonalny-spokojny", slowa: ["bałem", "balem", "porażka", "porazka", "trudne", "ciężko", "ciezko", "zrezygnowałem", "wstyd", "szczerze"]},
  {plik: "cieply-lofi-vintage", slowa: ["kiedyś", "kiedys", "zaczynałem", "zaczynalem", "pamiętam", "pamietam", "historia", "lata", "wcześniej", "wczesniej"]},
  {plik: "spokojny-lofi-poranek", slowa: ["pokażę", "pokaze", "tłumaczę", "tlumacze", "krok", "prosto", "wyjaśnię", "wyjasnie", "jak"]},
  {plik: "pozytywny-lekki", slowa: ["luźno", "luzno", "śmiesznie", "smiesznie", "fajnie", "spoko", "przyjemnie"]}
];

/**
 * Jak mocno nagranie ciagnie w strone danego nastroju.
 * Liczymy WYSTAPIENIA, nie same trafione slowa: nagranie, w ktorym "AI" pada
 * osiem razy, ma isc pod podklad techniczny, a nie remisowac z podkladem,
 * w ktorym raz padlo slowo "minut". Jedno slowo liczymy najwyzej trzy razy,
 * zeby powtarzany wtret nie przewazyl calej reszty.
 */
function dopasowanieNastroju(tekst, nastroj) {
  const slowa = tekst.toLowerCase().split(/[^a-ząćęłńóśźż]+/).filter(Boolean);
  let punkty = 0;
  for (const kluczowe of nastroj.slowa) {
    const ile = slowa.filter((w) => w === kluczowe || w.startsWith(kluczowe)).length;
    punkty += Math.min(3, ile);
  }
  return punkty;
}

let muzyka = null;
let muzykaPowod = "";
if (folderMuzyki && fs.existsSync(folderMuzyki)) {
  const utwory = fs
    .readdirSync(folderMuzyki)
    .filter((f) => /\.(mp3|wav|m4a|aac|ogg)$/i.test(f))
    .map((f) => path.join(folderMuzyki, f));
  if (utwory.length) {
    const calaTresc = napisy.map((l) => l.tekst).join(" ");
    // koncowka wazy podwojnie: to ona zostaje w glowie i tam siedzi CTA
    const koncowka = napisy.slice(Math.floor(napisy.length * 0.7)).map((l) => l.tekst).join(" ");
    const tekstDoOceny = calaTresc + " " + koncowka;

    const oceny = utwory.map((plik) => {
      const nazwa = path.basename(plik).replace(/\.[^.]+$/, "").toLowerCase();
      const nastroj = NASTROJE.find((n) => nazwa.includes(n.plik));
      return {
        plik,
        trafienia: nastroj && calaTresc ? dopasowanieNastroju(tekstDoOceny, nastroj) : 0,
        ostatnio: historia.muzyka[plik] || 0
      };
    });

    // najpierw dopasowanie do tresci, przy remisie ten, ktorego dawno nie bylo
    oceny.sort((a, b) => b.trafienia - a.trafienia || a.ostatnio - b.ostatnio);
    const wybrany = oceny[0];
    historia.muzyka[wybrany.plik] = (historia.rolek || 0) + 1;

    /* Wejscie od mocniejszego miejsca utworu. Podklady CC0 czesto zaczynaja sie
       kilkunastosekundowym narastaniem, a rolka trwa 30 sekund: przy starcie od
       zera dostajemy pod hook prawie cisze. Wchodzimy tam, gdzie utwor gra juz
       pelna paczka, o ile jest z czego brac. */
    const dlugoscUtworu = dlugoscPliku(wybrany.plik) || 0;
    const wejscie = dlugoscUtworu > dlugosc + 30 ? 12 : dlugoscUtworu > dlugosc + 16 ? 8 : 0;

    muzyka = {plik: wybrany.plik, glosnosc: 0.17, ...(wejscie ? {od: wejscie} : {})};
    muzykaPowod = wybrany.trafienia
      ? `pasuje do tresci (${wybrany.trafienia} pkt)`
      : "rotacja, tresc nie wskazala nastroju";
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
  /* Oddychajacy zoom i podbity glos. Wartosci wziete z planu rolki, ktora autor
     zatwierdzil: amplituda 0.018 i okres 11 s daja ruch, ktorego widz nie nazwie,
     ale ktory odroznia montaz od nagrania na statywie. Wczesniej plan tego pola
     nie mial wcale i szly wartosci domyslne (0.014 / 7 s), czyli slabsze. */
  zoom: {amplituda: 0.018, okres: 11},
  glos: 1.35,
  hook: {sila: otwarcie.sila},
  punche,
  nakladki,
  ...(logo ? {logo} : {}),
  sfx: fs.existsSync(folderSfx) ? sfx : [],
  notatka:
    "Plan ułożony przez plan-efektow.mjs. Przejrzyj treść efektów w efekty.json, " +
    "popraw teksty tam, gdzie automat wziął zbyt dosłownie to, co padło w nagraniu."
};

/* Przy renderze z poprawionego pliku NIE nadpisujemy planu ani listy efektow.
   Inaczej narzedzie ukladalo rolke od nowa, zapisywalo swiezy efekty.json,
   a dopiero potem go czytalo: recznie poprawione hasla znikaly, a renderowal
   sie zestaw wylosowany przed chwila. */
const tylkoRender = flaga("--renderuj-z-pliku");
if (!tylkoRender) fs.writeFileSync(plikPlanu, JSON.stringify(plan, null, 2), "utf8");
const plikEfektow = path.join(katalog, "efekty.json");
if (!tylkoRender) fs.writeFileSync(plikEfektow, JSON.stringify(doRenderu, null, 2), "utf8");

historia.otwarcia = historia.otwarcia || {};
historia.otwarcia[otwarcie.id] = (historia.rolek || 0) + 1;
historia.rolek = (historia.rolek || 0) + 1;
zapiszHistorie(historia);

/* -------------------- podsumowanie -------------------- */

console.log(`Nagranie:    ${path.basename(nagranie)}  (${dlugosc.toFixed(1)} s, ${fps} fps)`);
console.log(`Napisy:      ${napisy.length ? napisy.length + " linijek" : "brak"}`);
console.log(`Sklejki:     ${punche.length} (tylko tam idą zoom-punche)`);
console.log(`Muzyka:      ${muzyka ? path.basename(muzyka.plik) + (muzykaPowod ? "  (" + muzykaPowod + ")" : "") : "brak (podaj --muzyka folder)"}`);
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
  /* Pokazujemy TYLKO teksty. Wczesniej szly tu wszystkie wartosci propsow,
     wiec w podsumowaniu ladowaly "true" i "false" z pol technicznych
     (przekreslone, jasne) i wygladalo to jak tresc efektu. */
  const tekstyZ = (v) => {
    if (typeof v === "string") return v.length > 1 ? [v] : [];
    if (Array.isArray(v)) return v.flatMap(tekstyZ);
    if (v && typeof v === "object") return Object.entries(v).flatMap(([k, w]) => (k === "ikona" ? [] : tekstyZ(w)));
    return [];
  };
  const opis = Object.entries(e.props)
    .filter(([k]) => !["jasne", "pozycja", "klucz", "nick"].includes(k))
    .flatMap(([, v]) => tekstyZ(v))
    .join(" / ")
    .slice(0, 46);
  console.log(`  ${String(i + 1).padStart(2)}. ${String(nakladki[i].od).padStart(6)} s  ${e.id.padEnd(17)} ${opis}`);
});
console.log(`\nZapisane: ${plikPlanu} oraz ${plikEfektow}`);

/* CO NAPRAWDE PADA W OKNIE EFEKTU.
   Blad, ktory kosztowal kilka odrzuconych wersji: efekt dostawal haslo pasujace
   do OGOLNEGO tematu rolki, a nie do zdania, ktore leci dokladnie pod nim.
   W kadrze wygladalo to absurdalnie: mowiacy mowi "nie jest za pozno", a nad
   napisem stoi "czekac na klientow, liczyc na szczescie". Efekt ma ILUSTROWAC
   to, co slychac w tej sekundzie, wiec narzedzie musi to zdanie pokazac. */
function coPadaWOknie(od, doKiedy) {
  if (!napisy || !napisy.length) return "";
  const slowa = napisy
    .filter((l) => l.do > od + 0.15 && l.od < doKiedy - 0.15)
    .map((l) => (l.tekst || "").trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s{2,}/g, " ")
    .trim();
  return slowa.length > 120 ? slowa.slice(0, 117) + "..." : slowa;
}


/* TEKSTY DO PRZEPISANIA.
   Narzedzie wycina hasla z transkrypcji regulami, a mowa nie dzieli sie na
   naglowki: nawet po filtrach wychodzi czasem srodek zdania ("PRZYSZLOSCI
   BEDZIE TAK SAMO"). Tego nie da sie domknac algorytmem, bo trzeba ROZUMIEC,
   co w zdaniu jest trescia. Dlatego to nie jest opcja, tylko krok procesu:
   przepisz hasla na wlasne, krotkie i zrozumiale bez dzwieku, a DOPIERO POTEM
   renderuj efekty. */
const doPrzepisania = doRenderu
  .map((e, i) => {
    const teksty = Object.entries(e.props)
      .filter(([pole, w]) => typeof w === "string" && w.length > 1 && !["ikona", "nick", "pozycja", "klucz"].includes(pole))
      .map(([pole, w]) => pole + ': "' + w + '"');
    if (!teksty.length) return null;
    const n = nakladki[i] || {};
    const slychac = coPadaWOknie(n.od || 0, n.do || 0);
    return [
      "  " + String(i + 1).padStart(2, " ") + ". " + e.id + "   [" + (n.od || 0) + "s - " + (n.do || 0) + "s]",
      "      W TYM MOMENCIE SLYCHAC:  " + (slychac || "(cisza)"),
      "      teraz w efekcie:         " + teksty.join("  |  "),
    ].join(String.fromCharCode(10));
  })
  .filter(Boolean);

if (doPrzepisania.length) {
  const kreska = "=".repeat(70);
  console.log([
    "",
    kreska,
    "TEKSTY DO PRZEPISANIA  (zrob to ZANIM wyrenderujesz efekty)",
    kreska,
    doPrzepisania.join("\n"),
    "",
    "PRZY KAZDYM EFEKCIE MASZ NAPISANE, CO SLYCHAC W JEGO OKNIE CZASOWYM.",
    "Haslo ma ILUSTROWAC dokladnie to zdanie, a nie ogolny temat rolki. Efekt,",
    "ktory mowi o czym innym niz mowiacy w tej sekundzie, jest gorszy niz brak",
    "efektu: widz widzi, ze cos tu nie gra, nawet jesli nie umie tego nazwac.",
    "",
    "Otworz " + path.basename(plikEfektow) + ", przeczytaj kazde i przepisz",
    "na krotkie haslo, ktore da sie zrozumiec bez dzwieku (2-4 slowa).",
    "Zasada bez zmian: haslo mowi to, co PADLO w nagraniu, i nie dopisuje",
    "liczb ani obietnic, ktorych nikt nie zlozyl.",
    "",
    "Karty maja tez pole `nadtytul`: maly tekst kursywa nad haslem, na przyklad",
    "\"a teraz\" albo \"caly montaz zajmuje\". Puste jest dopuszczalne, ale",
    "wypelnione wyglada duzo lepiej i tak robi to autor zestawu.",
  ].join("\n"));
}




/* RENDER Z POPRAWIONEGO efekty.json.
   Bez tego przepisanie tekstow bylo slepa uliczka: narzedzie kazalo poprawic
   hasla, ale renderowalo wylacznie te, ktore samo przed chwila wymyslilo,
   wiec poprawki trzeba bylo klikac recznie, efekt po efekcie. Teraz pelna
   petla wyglada tak:
     1. plan-efektow.mjs ...                (plan + propozycje tekstow)
     2. poprawiasz hasla w efekty.json
     3. plan-efektow.mjs ... --renderuj-z-pliku   (renderuje TWOJE teksty)
   Plan (czasy, pozycje, dzwiek) zostaje bez zmian, podmieniaja sie same tresci. */
if (tylkoRender) {
  if (!fs.existsSync(plikEfektow)) {
    console.error("Nie ma pliku " + plikEfektow + ". Najpierw zbuduj plan bez tej flagi.");
    process.exit(1);
  }
  const zPliku = JSON.parse(fs.readFileSync(plikEfektow, "utf8"));
  doRenderu.length = 0;
  zPliku.forEach((e) => doRenderu.push(e));
  console.log("\nRenderuje " + doRenderu.length + " efektow z poprawionego " + path.basename(plikEfektow) + ".");
}

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
/* FPS KOMPOZYCJI, nie nagrania.
   BLAD ZNALEZIONY 08.09.2026: liczba klatek do wyrenderowania byla liczona
   z fps NAGRANIA. Kompozycje w Root.tsx maja na sztywno 60 fps, wiec przy
   nagraniu 30 fps (czyli typowym z telefonu) kazdy efekt dostawal polowe
   swoich klatek: animacja urywala sie w polowie, a plan rezerwowal jej pelny
   czas. Zmierzone: scena 3,2 s wychodzila jako plik 1,6 s. Autor nagrywa
   w 60 fps, wiec u niego wszystko bylo pelne i blad nie mial jak sie ujawnic.
   Zadne narzedzie tego nie zglaszalo, bo render konczyl sie sukcesem. */
const FPS_KOMPOZYCJI = 60;

const polecenia = doRenderu.map((e) => {
  const klatki = Math.round(e.dlugoscSekund * FPS_KOMPOZYCJI);
  return [
    "node", cliRemotion || "MUSISZ-NAJPIERW-ZROBIC-NPM-INSTALL",
    "render", "src/index.ts", e.id, path.resolve(katalog, e.plik),
    `--props=${JSON.stringify(e.props)}`,
    `--frames=0-${Math.max(1, klatki - 1)}`,
    "--codec=prores", "--prores-profile=4444",
    "--pixel-format=yuva444p10le", "--image-format=png"
  ];
});

if (renderujEfekty || tylkoRender) {
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
