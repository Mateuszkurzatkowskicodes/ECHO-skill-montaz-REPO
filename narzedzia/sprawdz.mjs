#!/usr/bin/env node
/**
 * sprawdz.mjs — kontrola gotowego montażu, zanim pójdzie na profil.
 *
 * PO CO TO JEST:
 * Najgorsze błędy montażu nie wywalają renderu. Wideo powstaje, ffmpeg mówi
 * "gotowe", a w środku brakuje dźwięku, materiał jest o połowę krótszy, napis
 * leży na twarzy albo na końcu wisi czarna klatka. To narzędzie sprawdza takie
 * rzeczy automatycznie i wyciąga siatkę klatek do obejrzenia.
 *
 * UŻYCIE:
 *   node narzedzia/sprawdz.mjs gotowe.mp4
 *   node narzedzia/sprawdz.mjs gotowe.mp4 --wobec nagranie.mp4   (porównaj długość)
 *   node narzedzia/sprawdz.mjs gotowe.mp4 --klatki 12            (ile klatek wyciągnąć)
 */

import fs from "node:fs";
import path from "node:path";
import {execFileSync, spawnSync} from "node:child_process";
import {stanCzasu} from "./wspolne.mjs";

const args = process.argv.slice(2);
const plik = args[0];
if (!plik || !fs.existsSync(plik)) {
  console.error("Podaj gotowy plik, np.: node narzedzia/sprawdz.mjs gotowe.mp4");
  process.exit(1);
}
const wartosc = (n) => {
  const i = args.indexOf(n);
  return i !== -1 ? args[i + 1] : null;
};
const wobec = wartosc("--wobec");
const ileKlatek = Number(wartosc("--klatki")) || 9;

function probe(pytanie, cel = plik) {
  try {
    return execFileSync("ffprobe", ["-v", "error", "-of", "default=nw=1:nk=1", ...pytanie, cel], {
      encoding: "utf8"
    }).trim();
  } catch {
    return "";
  }
}

function analizaAudio(af) {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-i", plik, "-map", "0:a", "-af", af, "-f", "null", "-"], {
    encoding: "utf8"
  });
  return (r.stderr || "") + (r.stdout || "");
}

const uwagi = [];
const ok = [];

/* ---------- podstawy ---------- */
const dlugosc = Number(probe(["-show_entries", "format=duration"])) || 0;
const szer = probe(["-select_streams", "v:0", "-show_entries", "stream=width"]);
const wys = probe(["-select_streams", "v:0", "-show_entries", "stream=height"]);
const kodek = probe(["-select_streams", "v:0", "-show_entries", "stream=codec_name"]);
const fpsTekst = probe(["-select_streams", "v:0", "-show_entries", "stream=r_frame_rate"]);
const fps = fpsTekst.includes("/") ? Math.round((Number(fpsTekst.split("/")[0]) / Number(fpsTekst.split("/")[1])) * 100) / 100 : null;
const maAudio = probe(["-select_streams", "a:0", "-show_entries", "stream=codec_type"]) !== "";

console.log(`\nPlik:        ${path.basename(plik)}`);
console.log(`Obraz:       ${szer}x${wys}, ${kodek}, ${fps} fps`);
console.log(`Długość:     ${dlugosc.toFixed(2)} s`);

if (!maAudio) {
  uwagi.push("W gotowym pliku NIE MA ścieżki dźwiękowej. Na Instagramie poleci bez głosu.");
} else {
  const dlAudio = Number(probe(["-select_streams", "a:0", "-show_entries", "stream=duration"])) || 0;
  console.log(`Dźwięk:      ${dlAudio.toFixed(2)} s`);
  if (dlugosc > 0 && Math.abs(dlAudio - dlugosc) > 0.5) {
    uwagi.push(
      `Dźwięk (${dlAudio.toFixed(2)} s) nie pokrywa się z obrazem (${dlugosc.toFixed(2)} s). ` +
      "Część rolki poleci bez głosu."
    );
  } else {
    ok.push("dźwięk na całej długości");
  }
}

/* ---------- czy nic się nie urwało względem nagrania ---------- */
if (wobec) {
  if (!fs.existsSync(wobec)) {
    uwagi.push(`Nie ma pliku do porównania: ${wobec}`);
  } else {
    const dlZrodla = Number(probe(["-show_entries", "format=duration"], wobec)) || 0;
    const roznica = Math.abs(dlZrodla - dlugosc);
    console.log(`Nagranie:    ${dlZrodla.toFixed(2)} s`);
    if (dlZrodla > 0 && roznica / dlZrodla > 0.05) {
      uwagi.push(
        `Montaż jest o ${roznica.toFixed(2)} s ${dlugosc < dlZrodla ? "krótszy" : "dłuższy"} od nagrania. ` +
        "Zwykle znaczy to, że klatki zostały pogubione po drodze."
      );
    } else {
      ok.push("długość zgodna z nagraniem");
    }
  }
}

/* ---------- poziom głośności (platformy grają na -14 LUFS) ---------- */
if (maAudio) {
  const log = analizaAudio("loudnorm=I=-14:TP=-1.5:print_format=summary");
  const lufs = /Input Integrated:\s*(-?[\d.]+)/.exec(log);
  const peak = /Input True Peak:\s*(-?[\d.]+)/.exec(log);
  if (lufs) {
    const v = Number(lufs[1]);
    console.log(`Głośność:    ${v} LUFS${peak ? `, szczyt ${peak[1]} dBTP` : ""}`);
    if (v < -20) uwagi.push(`Za cicho (${v} LUFS). Docelowo około -14. Rolka utonie w feedzie.`);
    else if (v > -9) uwagi.push(`Za głośno (${v} LUFS). Platforma i tak przyciszy, dźwięk będzie płaski.`);
    else ok.push(`głośność w normie (${v} LUFS)`);
    if (peak && Number(peak[1]) > 0) uwagi.push(`Przesterowanie (szczyt ${peak[1]} dBTP). Słychać trzaski.`);
  }

  const cisza = analizaAudio("silencedetect=n=-45dB:d=1.5");
  const ciszeOd = [...cisza.matchAll(/silence_start:\s*([\d.]+)/g)].map((m) => Number(m[1]));
  if (ciszeOd.length) {
    const wSrodku = ciszeOd.filter((t) => t < dlugosc - 2);
    if (wSrodku.length)
      uwagi.push(
        `Dłuższa cisza od: ${wSrodku.map((t) => t.toFixed(1) + " s").join(", ")}. ` +
        "Sprawdź, czy w tym miejscu nie zginął głos."
      );
  }
}

/* ---------- czarne klatki ---------- */
const czern = spawnSync(
  "ffmpeg",
  ["-hide_banner", "-i", plik, "-vf", "blackdetect=d=0.4:pic_th=0.98", "-an", "-f", "null", "-"],
  {encoding: "utf8"}
);
const czarne = [...((czern.stderr || "") + "").matchAll(/black_start:([\d.]+) black_end:([\d.]+)/g)];
if (czarne.length) {
  uwagi.push(
    "Czarny obraz: " +
    czarne.map((m) => `${Number(m[1]).toFixed(1)}-${Number(m[2]).toFixed(1)} s`).join(", ") +
    ". Najczęściej to nakładka bez czasu zniknięcia albo cutaway wychodzący za koniec materiału."
  );
} else {
  ok.push("brak czarnych klatek");
}

/* ---------- czy czas w pliku dobiega do końca ---------- */
{
  const czas = stanCzasu(plik);
  if (!czas.zdrowe)
    uwagi.push(
      `Plik ma ${czas.dlugosc.toFixed(2)} s, ale filtry widzą w nim tylko ` +
      `${czas.widzianyCzas.toFixed(2)} s. Odtwarzacze mogą pokazywać złą długość, ` +
      "a dalsza obróbka tego pliku pogubi efekty."
    );
  else ok.push("czas spójny na całej długości");
}

/* ---------- klatki do obejrzenia ---------- */
const folder = path.join(path.dirname(path.resolve(plik)), "klatki-" + path.basename(plik, path.extname(plik)));
fs.mkdirSync(folder, {recursive: true});
const czasy = [];
for (let i = 0; i < ileKlatek; i++) {
  czasy.push(Math.min(dlugosc - 0.1, (dlugosc * (i + 0.5)) / ileKlatek));
}
// hook zawsze, bo tam najczęściej coś nachodzi na twarz
czasy.unshift(0.35);
let zapisane = 0;
czasy.forEach((t, i) => {
  const cel = path.join(folder, `${String(i).padStart(2, "0")}-${t.toFixed(2)}s.png`);
  const r = spawnSync("ffmpeg", ["-y", "-v", "error", "-ss", String(t), "-i", plik, "-frames:v", "1", cel], {
    encoding: "utf8"
  });
  if (r.status === 0 && fs.existsSync(cel)) zapisane++;
});

/* ---------- podsumowanie ---------- */
console.log("");
if (ok.length) console.log("W porządku:   " + ok.join(", "));
if (uwagi.length) {
  console.log("\nDO POPRAWY:");
  uwagi.forEach((u) => console.log("  - " + u));
} else {
  console.log("\nNie znalazłem nic do poprawy w warstwie technicznej.");
}
console.log(`\nKlatki do obejrzenia (${zapisane}): ${folder}`);
console.log("Przejrzyj je i sprawdź to, czego żadne narzędzie nie oceni:");
console.log("  - czy napis albo grafika nie leży na twarzy,");
console.log("  - czy nic nie wychodzi poza kadr,");
console.log("  - czy w hooku dzieje się coś mocnego już w pierwszej sekundzie.");

process.exit(uwagi.length ? 2 : 0);
