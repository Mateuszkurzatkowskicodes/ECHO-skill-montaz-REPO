#!/usr/bin/env node
/**
 * buduj-filtr.mjs — z krótkiego planu JSON robi gotowy skrypt filtra ffmpeg.
 *
 * PO CO TO JEST:
 * Bez tego narzędzia AI musi przy KAŻDYM montażu wypisać od zera kilkaset linii
 * `-filter_complex` i za każdym razem od nowa pamiętać o wszystkich pułapkach
 * ffmpeg. To kosztuje mnóstwo tokenów i co jakiś czas kończy się błędem.
 * Tutaj AI pisze tylko krótki plan, a reszta powstaje sama, z wbudowanymi
 * zabezpieczeniami przed błędami, które kosztowały realne godziny:
 *
 *  - zoom przez `zoompan` (a nie `scale` z wyrażeniem czasowym, które segfaultuje)
 *  - `enable=` na KAŻDEJ nakładce (bez tego element zostaje na ekranie do końca)
 *  - napisy POD cutawayami, żeby pełnoekranowe interludia je zakrywały
 *  - ścieżki Windows w apostrofach (inaczej parser wywala się na `C:`)
 *  - zoom liczony z zapasem i zejście lanczosem, żeby obraz był ostry
 *
 * UŻYCIE:
 *   node narzedzia/buduj-filtr.mjs plan.json                 -> wypisuje polecenie
 *   node narzedzia/buduj-filtr.mjs plan.json --zapisz montaz -> pisze montaz.sh + filtr.txt
 */

import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const planPath = args[0];
if (!planPath) {
  console.error("Podaj plik planu, np.: node narzedzia/buduj-filtr.mjs plan.json");
  process.exit(1);
}
const zapiszIdx = args.indexOf("--zapisz");
const zapiszNazwa = zapiszIdx !== -1 ? args[zapiszIdx + 1] : null;

const plan = JSON.parse(fs.readFileSync(planPath, "utf8"));

/* ---------- domyślne wartości: styl ECHO ---------- */
const D = {
  szerokosc: 1080,
  wysokosc: 1920,
  fps: 30,
  glos: 1.35,           // wzmocnienie głosu, sprawdzone na short-01
  muzykaGlosnosc: 0.11, // muzyka cicho pod głosem
  zoomAmplituda: 0.014, // "oddychający" zoom, ma być ledwo wyczuwalny
  zoomOkres: 7,         // sekundy pełnego cyklu
  punchSila: 0.055,     // zoom-punch NA SKLEJCE (nie na akcentach zdań!)
  punchCzas: 0.32
};

const W = plan.szerokosc || D.szerokosc;
const H = plan.wysokosc || D.wysokosc;
const FPS = plan.fps || D.fps;

/** Ścieżka bezpieczna dla parsera filtrów ffmpeg na Windows. */
function sciezkaDlaFiltra(p) {
  return "'" + String(p).replace(/\\/g, "/").replace(/:/g, "\\:").replace(/'/g, "\\'") + "'";
}

const czesci = [];
const wejscia = [plan.wejscie];
let kolejneWejscie = 1;

/* ---------- 1. baza: zoom oddychający + punche na sklejkach ----------
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
// Punche stawiamy WYŁĄCZNIE tam, gdzie realnie sklejone są dwa ujęcia.
// Listę wygeneruj narzędziem: node narzedzia/wykryj-ciecia.mjs nagranie.mp4
for (const p of plan.punche || []) {
  const sila = p.sila !== undefined ? p.sila : D.punchSila;
  const czas = p.czas !== undefined ? p.czas : D.punchCzas;
  zoomWyr += `+if(between(time,${p.t},${p.t + czas}),${sila}*exp(-(time-${p.t})*${(3 / czas).toFixed(2)}),0)`;
}

const WP = Math.round((W * 1.5) / 2) * 2;
const HP = Math.round((H * 1.5) / 2) * 2;

czesci.push(
  `[0:v]scale=${WP}:${HP}:force_original_aspect_ratio=increase:flags=lanczos,` +
  `crop=${WP}:${HP},` +
  `zoompan=z='${zoomWyr}':d=1:s=${WP}x${HP}:fps=${FPS},` +
  `scale=${W}:${H}:flags=lanczos,setsar=1[baza]`
);
let biezacy = "baza";

/* ---------- 2. napisy (POD interludiami) ----------
   Napisy idą zaraz po bazie, żeby pełnoekranowe interludium je zakryło.
   Tak wymaga styl: pod slamami i w interludiach napisów nie ma. */
if (plan.napisy) {
  czesci.push(`[${biezacy}]ass=${sciezkaDlaFiltra(plan.napisy)}[z_napisami]`);
  biezacy = "z_napisami";
}

/* ---------- 3. cutawaye pełnoekranowe ---------- */
(plan.cutawaye || []).forEach((c, i) => {
  wejscia.push(c.plik);
  const idx = kolejneWejscie++;
  const et = `cut${i}`;
  czesci.push(
    `[${idx}:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},` +
    `setpts=PTS+${c.od}/TB[${et}]`
  );
  czesci.push(
    `[${biezacy}][${et}]overlay=0:0:enable='between(t,${c.od},${c.do})':eof_action=pass[po_${et}]`
  );
  biezacy = `po_${et}`;
});

/* ---------- 4. nakładki z alfą (Remotion), na samej górze ---------- */
(plan.nakladki || []).forEach((n, i) => {
  wejscia.push(n.plik);
  const idx = kolejneWejscie++;
  const et = `nak${i}`;
  const x = n.x !== undefined ? n.x : 0;
  const y = n.y !== undefined ? n.y : 0;
  const skala = n.szerokosc ? `scale=${n.szerokosc}:-1,` : "";
  czesci.push(`[${idx}:v]${skala}setpts=PTS+${n.od}/TB[${et}]`);
  // enable na KAŻDEJ nakładce, inaczej zostaje do końca materiału
  czesci.push(
    `[${biezacy}][${et}]overlay=${x}:${y}:enable='between(t,${n.od},${n.do})':eof_action=pass[po_${et}]`
  );
  biezacy = `po_${et}`;
});

/* ---------- 5. wyjście wideo ---------- */
czesci.push(`[${biezacy}]null[wyj_v]`);

/* ---------- 6. audio: głos + muzyka ---------- */
const glos = plan.glos !== undefined ? plan.glos : D.glos;
const audioWyj = "wyj_a";
if (plan.muzyka && plan.muzyka.plik) {
  wejscia.push(plan.muzyka.plik);
  const idx = kolejneWejscie++;
  const vol = plan.muzyka.glosnosc !== undefined ? plan.muzyka.glosnosc : D.muzykaGlosnosc;
  czesci.push(`[0:a]volume=${glos}[gl]`);
  czesci.push(`[${idx}:a]volume=${vol},afade=t=out:st=${(plan.dlugosc || 60) - 2}:d=2[mu]`);
  czesci.push(`[gl][mu]amix=inputs=2:duration=first:dropout_transition=0[${audioWyj}]`);
} else {
  czesci.push(`[0:a]volume=${glos}[${audioWyj}]`);
}

/* ---------- złożenie polecenia ---------- */
const filtr = czesci.join(";\n");
const wejsciaArg = wejscia.map((w) => `-i "${w}"`).join(" ");
// Wysoka jakość: crf 15 plus sufit bitrate'u, żeby szybkie ruchy i ziarno
// nie rozsypywały się w bloki po kompresji Instagrama.
const jakosc =
  "-c:v libx264 -preset slow -crf 15 -maxrate 18M -bufsize 36M " +
  "-profile:v high -level 4.2 -pix_fmt yuv420p -movflags +faststart";
const wyjscie = plan.wyjscie || "out.mp4";

const polecenie =
  `ffmpeg -y ${wejsciaArg} \\\n` +
  `  -filter_complex_script filtr.txt \\\n` +
  `  -map "[wyj_v]" -map "[${audioWyj}]" \\\n` +
  `  ${jakosc} -c:a aac -b:a 192k -r ${FPS} \\\n` +
  `  "${wyjscie}"`;

if (zapiszNazwa) {
  const katalog = path.dirname(path.resolve(zapiszNazwa));
  fs.writeFileSync(path.join(katalog, "filtr.txt"), filtr, "utf8");
  fs.writeFileSync(
    zapiszNazwa.endsWith(".sh") ? zapiszNazwa : zapiszNazwa + ".sh",
    "#!/bin/bash\nset -e\nexport MSYS2_ARG_CONV_EXCL=\"*\"\n" + polecenie + "\n",
    "utf8"
  );
  console.log("Zapisane: filtr.txt oraz " + zapiszNazwa + (zapiszNazwa.endsWith(".sh") ? "" : ".sh"));
} else {
  console.log("=== filtr.txt ===");
  console.log(filtr);
  console.log("\n=== polecenie ===");
  console.log(polecenie);
}
