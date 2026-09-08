#!/usr/bin/env node
/**
 * krytyk.mjs — ostatni krok przed oddaniem rolki: OBEJRZENIE jej.
 *
 * PO CO TO JEST:
 * `sprawdz.mjs` mierzy liczby: głośność, długość, gęstość efektów, czarne klatki.
 * Przechodzi je rolka, w której wszystko się zgadza, a mimo to karta leży na
 * twarzy, wielki napis jest urwany w połowie zdania ("BO MÓWISZ DO"), trzy
 * ciemne plansze stoją pod rząd, a końcówka nie ma puenty. Żadne narzędzie tego
 * nie policzy, bo to są rzeczy, które się WIDZI.
 *
 * To narzędzie nie ocenia rolki samo. Ono przygotowuje materiał do oceny:
 * wyciąga klatki DOKŁADNIE w tych momentach, w których coś wjeżdża w kadr
 * (a nie co kilka sekund na oślep), skleja je w jedną kontaktówkę i wypisuje
 * listę pytań, na które trzeba odpowiedzieć, patrząc na obraz.
 *
 * Ocenia AI, które to czyta. Zasada jest jedna: każde "nie" to poprawka
 * i ponowny render, a nie dopisek w podsumowaniu.
 *
 * UŻYCIE:
 *   node narzedzia/krytyk.mjs gotowe.mp4
 *   node narzedzia/krytyk.mjs gotowe.mp4 --plan plan.json
 *   node narzedzia/krytyk.mjs gotowe.mp4 --folder krytyk
 */

import fs from "node:fs";
import path from "node:path";
import {execFileSync, spawnSync} from "node:child_process";

const args = process.argv.slice(2);
const plik = args[0];
if (!plik || plik.startsWith("--") || !fs.existsSync(plik)) {
  console.error("Podaj gotowy montaż, np.: node narzedzia/krytyk.mjs gotowe.mp4");
  process.exit(1);
}
const wartosc = (n, d = null) => {
  const i = args.indexOf(n);
  return i !== -1 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : d;
};

const katalog = path.dirname(path.resolve(plik));
const plikPlanu = wartosc("--plan", path.join(katalog, "plan.json"));
const folder = path.resolve(katalog, wartosc("--folder", "krytyk"));

function ffprobe(pytanie) {
  try {
    return execFileSync("ffprobe", ["-v", "error", "-of", "default=nw=1:nk=1", ...pytanie, plik], {
      encoding: "utf8"
    }).trim();
  } catch {
    return "";
  }
}

const dlugosc = Number(ffprobe(["-show_entries", "format=duration"])) || 0;
if (!dlugosc) {
  console.error("Nie umiem odczytać długości pliku. Czy to na pewno gotowy montaż?");
  process.exit(1);
}

/* ---------- co oglądamy i dlaczego ----------
   Klatka z samego początku efektu bywa jeszcze pusta, bo element dopiero
   wjeżdża. Bierzemy chwilę później, gdy jest już w pełni widoczny. */

let plan = null;
try {
  plan = JSON.parse(fs.readFileSync(plikPlanu, "utf8"));
} catch {
  plan = null;
}

const momenty = [];
const dodaj = (t, opis) => {
  const czas = Math.min(Math.max(0.15, t), dlugosc - 0.15);
  if (momenty.some((m) => Math.abs(m.t - czas) < 0.25)) return;
  momenty.push({t: czas, opis});
};

dodaj(0.4, "otwarcie: pierwsze pół sekundy");
dodaj(1.6, "otwarcie: druga sekunda");

if (plan) {
  const warstwy = [
    ...(plan.nakladki || []).map((n) => ({...n, rodzaj: path.basename(n.plik || "").replace(/^\d+-/, "").replace(/\.[^.]+$/, "")})),
    ...(plan.cutawaye || []).map((c) => ({...c, rodzaj: "cutaway"})),
    ...(plan.splitscreen || []).map((s) => ({...s, rodzaj: "split-screen"}))
  ].sort((a, b) => a.od - b.od);

  for (const w of warstwy) {
    const srodek = w.od + Math.min(0.75, Math.max(0.35, ((w.do || w.od + 2) - w.od) / 2));
    dodaj(srodek, w.rodzaj);
  }

  // dwa kadry BEZ efektu: tam widać same napisy karaoke i to, czy nie leżą na twarzy
  const luki = [];
  for (let i = 0; i < warstwy.length - 1; i++) {
    const przerwa = warstwy[i + 1].od - (warstwy[i].do || warstwy[i].od);
    if (przerwa > 1.2) luki.push({t: (warstwy[i].do || warstwy[i].od) + przerwa / 2, przerwa});
  }
  luki.sort((a, b) => b.przerwa - a.przerwa).slice(0, 2).forEach((l) => dodaj(l.t, "sam kadr z napisami"));
} else {
  for (let i = 1; i <= 8; i++) dodaj((dlugosc * i) / 9, "kadr co jakiś czas (brak planu)");
}

dodaj(dlugosc - 1.0, "końcówka: puenta i CTA");
momenty.sort((a, b) => a.t - b.t);

/* ---------- wyciąganie klatek ---------- */

fs.rmSync(folder, {recursive: true, force: true});
fs.mkdirSync(folder, {recursive: true});

const kadry = [];
momenty.forEach((m, i) => {
  const cel = path.join(folder, `kadr-${String(i + 1).padStart(3, "0")}.png`);
  const r = spawnSync(
    "ffmpeg",
    ["-y", "-v", "error", "-ss", m.t.toFixed(2), "-i", plik, "-frames:v", "1", "-vf", "scale=360:-2", cel],
    {encoding: "utf8"}
  );
  if (r.status === 0 && fs.existsSync(cel)) kadry.push({...m, plik: cel, nr: kadry.length + 1});
});

if (!kadry.length) {
  console.error("Nie udało się wyciągnąć ani jednej klatki.");
  process.exit(1);
}

/* ---------- kontaktówka: wszystko na jednym obrazku ----------
   Cztery kolumny to kompromis: przy pionowym kadrze 1080x1920 pojedyncza
   klatka jest wtedy jeszcze czytelna, a cała rolka mieści się na jednym
   obrazku, więc widać ją jako CIĄG, a nie jako osobne stopklatki. */

const kolumny = Math.min(4, kadry.length);
const wiersze = Math.ceil(kadry.length / kolumny);
const kontaktowka = path.join(folder, "kontaktowka.png");
const tile = spawnSync(
  "ffmpeg",
  [
    "-y", "-v", "error",
    "-framerate", "1",
    "-i", path.join(folder, "kadr-%03d.png"),
    "-vf", `tile=${kolumny}x${wiersze}:padding=8:margin=8:color=#0b0f14`,
    "-frames:v", "1",
    kontaktowka
  ],
  {encoding: "utf8"}
);
const maKontaktowke = tile.status === 0 && fs.existsSync(kontaktowka);

/* ---------- pytania, na które trzeba odpowiedzieć patrząc ---------- */

const PYTANIA = [
  ["Otwarcie", "Czy w pierwszych dwóch sekundach dzieje się coś, co zatrzymuje kciuk? Nie musi to być wielki napis: mocny najazd, plansza albo zakreślenie liczą się tak samo. Płaska twarz bez ruchu i bez akcentu to jedyna odpowiedź, która oznacza NIE."],
  ["Twarz", "Czy jakikolwiek napis, karta albo grafika leży na twarzy? To jest granica nie do przekroczenia. Napisy mają siedzieć na wysokości szyi albo klatki piersiowej, karty nad nimi."],
  ["Kadr", "Czy coś wychodzi poza kadr albo jest ucięte przy krawędzi? Sprawdź zwłaszcza długie hasła i karty z dwiema kolumnami."],
  ["Sens bez dźwięku", "Czy teksty na efektach da się przeczytać i zrozumieć bez słuchania? Urwana fraza w stylu „BO MÓWISZ DO” albo pojedyncze „TĘ” to NIE. Popraw treść w efekty.json i zrenderuj ten efekt jeszcze raz."],
  ["Powtórki", "Czy dwa podobne wizualnie efekty nie stoją obok siebie (dwie kreski, dwie karty z liczbą, dwa stemple)? Widz czyta to jako jeden powtarzany trik."],
  ["Sceny", "Czy w rolce wchodzą sceny pełnoekranowe, które zmieniają cały kadr, a nie tylko napisy na twarzy mówiącego? Rolka bez ani jednej takiej sceny wygląda jak nagranie z napisami, choćby efektów było dużo."],
  ["Tła", "Czy ciemne i jasne plansze się przeplatają? Trzy ciemne karty pod rząd zlewają się w jedno tło."],
  ["Rytm", "Czy jest w rolce moment dłuższy niż pięć sekund, w którym nie dzieje się kompletnie nic? Jeśli tak, dołóż tam efekt."],
  ["Końcówka", "Czy ostatnie sekundy mają puentę albo CTA? Rolka, która po prostu się urywa, wygląda jak przerwane zdanie."],
  ["Znak", "Czy w rogu jest logo? Jeśli nie ma, a user ma plik, dołóż logo.png do folderu montażowego."],
  ["Całość", "Ostatnie pytanie i najważniejsze: czy to wygląda jak ZMONTOWANA rolka, czy jak nagranie, na które ktoś nałożył napisy? Jeśli to drugie, nie oddawaj jej."]
];

const opisKadrow = kadry
  .map((k) => `- kadr ${k.nr} (czyta się od lewej do prawej, rzędami): ${k.t.toFixed(2)} s, ${k.opis}`)
  .join("\n");

const tresc = `# Krytyk: ${path.basename(plik)}

Kontaktówka: \`${path.relative(katalog, kontaktowka).replace(/\\\\/g, "/")}\`
Pojedyncze klatki: \`${path.relative(katalog, folder).replace(/\\\\/g, "/")}/kadr-*.png\`

## Co jest na której klatce

${opisKadrow}

## Pytania (odpowiadaj PATRZĄC na obraz, nie z pamięci)

${PYTANIA.map(([n, q], i) => `${i + 1}. **${n}.** ${q}\n   Odpowiedź: `).join("\n")}

## Zasada

Każde „nie” to poprawka i ponowny render, nie dopisek w podsumowaniu.
Dopiero komplet „tak” oznacza, że rolka jest gotowa do oddania.
`;

const plikPytan = path.join(folder, "pytania.md");
fs.writeFileSync(plikPytan, tresc, "utf8");

/* ---------- podsumowanie ---------- */

console.log(`Rolka:       ${path.basename(plik)}  (${dlugosc.toFixed(1)} s)`);
console.log(`Plan:        ${plan ? path.basename(plikPlanu) : "brak, klatki wzięte co jakiś czas"}`);
console.log(`Klatki:      ${kadry.length}, wyciągnięte w momentach, w których coś wjeżdża w kadr`);
console.log(maKontaktowke ? `Kontaktówka: ${kontaktowka}` : "Kontaktówka: nie udało się skleić, obejrzyj pojedyncze klatki");
console.log(`Pytania:     ${plikPytan}`);
console.log("");
console.log("TERAZ OBEJRZYJ KONTAKTÓWKĘ i odpowiedz na dziesięć pytań z pytania.md.");
console.log("To jest ostatni krok przed oddaniem rolki. Każde „nie” to poprawka i render.");
