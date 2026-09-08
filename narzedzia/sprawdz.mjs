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
 *   node narzedzia/sprawdz.mjs gotowe.mp4 --plan plan.json       (sprawdź też sam montaż)
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
const plikPlanu = wartosc("--plan") || path.join(path.dirname(path.resolve(plik)), "plan.json");

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

/* ---------- czy to w ogóle jest zmontowane ----------
   Kontrola techniczna przepuści rolkę, w której wszystko działa, tylko nic się
   nie dzieje: dwa efekty na minutę, płaski początek, brak muzyki. Widz odpada
   po dwóch sekundach i nie ma z tego żadnego sygnału w logu. Jeśli obok pliku
   leży plan montażu, sprawdzamy też to. */
if (fs.existsSync(plikPlanu)) {
  try {
    const plan = JSON.parse(fs.readFileSync(plikPlanu, "utf8"));
    const nakladki = plan.nakladki || [];
    const cutawaye = plan.cutawaye || [];
    const wszystkie = [...nakladki, ...cutawaye, ...(plan.splitscreen || [])];
    const coIle = wszystkie.length ? dlugosc / wszystkie.length : Infinity;
    console.log(`Efekty:      ${wszystkie.length}${wszystkie.length ? `, średnio co ${coIle.toFixed(1)} s` : ""}`);

    if (!wszystkie.length) {
      uwagi.push("W planie nie ma ani jednego efektu. To jest nagranie z napisami, nie zmontowana rolka.");
    } else if (coIle > 5) {
      uwagi.push(
        `Efekt średnio co ${coIle.toFixed(1)} s to na rolkę za rzadko. Cel: co 3-4 s. ` +
        "Zagęść: node narzedzia/plan-efektow.mjs nagranie.mp4 --napisy napisy.ass --gestosc 2.5"
      );
    } else {
      ok.push(`efekty gęsto (co ${coIle.toFixed(1)} s)`);
    }

    /* SCENY PELNOEKRANOWE. Rolka zlozona z samych malych nakladek na twarzy
       wyglada jak nagranie z napisami, nawet gdy efektow jest duzo i sa gesto.
       Roznice robi kadr, ktory co kilkanascie sekund zmienia sie w calosci.
       Dlatego to jest osobny prog, a nie uwaga na marginesie. */
    /* Scena pelnoekranowa to taka, ktorej PLIK ma wysokosc kadru. Wczesniej
       rozpoznawalismy je po nazwie zaczynajacej sie od "scena-", ale doszly
       animacje i grafiki (anim-*, graf-*, sekw-*), wiec kontrola przestala je
       widziec i milczala nawet wtedy, gdy rolka nie miala ani jednej. */
    const sceny = wszystkie.filter((n) => {
      try {
        const out = execFileSync(
          "ffprobe",
          ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=height",
           "-of", "csv=p=0", n.plik],
          {encoding: "utf8"}
        );
        return parseInt(out.trim(), 10) >= 1700;
      } catch {
        return /scena-|sekw-pelna|sekw-przekreslona|sekw-checklista|anim-|graf-/.test(n.plik || "");
      }
    });
    const oczekiwaneSceny = Math.min(5, Math.max(2, Math.round(dlugosc / 16)));
    if (!sceny.length) {
      uwagi.push(
        "W rolce nie ma ANI JEDNEJ sceny pełnoekranowej. Same nakładki na twarzy to " +
        "nagranie z napisami. Przebuduj plan: node narzedzia/plan-efektow.mjs nagranie.mp4 --napisy napisy.ass"
      );
    } else if (sceny.length < oczekiwaneSceny) {
      uwagi.push(
        `Sceny pełnoekranowe: ${sceny.length}, a przy tej długości powinno być ${oczekiwaneSceny}. ` +
        "Rolka jest przez to bardziej płaska, niż zakłada zestaw."
      );
    } else {
      ok.push(`${sceny.length} sceny pełnoekranowe`);
    }

    // Otwarcie bez nakladki jest OK, o ile w zamian jest mocniejszy najazd: to
    // jedna z form hooka, a nie brak montazu. Marudzimy dopiero, gdy na starcie
    // nie dzieje sie nic: ani efekt, ani wyrazny najazd.
    const pierwszy = wszystkie.map((n) => n.od).filter((t) => t !== undefined).sort((a, b) => a - b)[0];
    const mocnyNajazd = plan.hook && plan.hook.sila >= 0.12;
    const prog = mocnyNajazd ? 3.2 : 2;
    if (pierwszy === undefined || pierwszy > prog) {
      uwagi.push(
        "Otwarcie jest płaskie (pierwszy efekt dopiero " +
        (pierwszy === undefined ? "nigdzie" : pierwszy.toFixed(1) + " s") +
        (mocnyNajazd ? ", a najazd sam tego nie udźwignie" : "") +
        "). To najczęstszy powód, dla którego dobre nagranie nie ma zasięgu."
      );
    } else {
      ok.push(mocnyNajazd && pierwszy > 1.2 ? "otwarcie na mocnym najeździe" : "otwarcie ma efekt od pierwszej sekundy");
    }

    const rodzaje = new Set(nakladki.map((n) => path.basename(n.plik || "").replace(/^\d+-/, "")));
    if (nakladki.length >= 4 && rodzaje.size < Math.ceil(nakladki.length / 2)) {
      uwagi.push("Ten sam efekt wraca w rolce kilka razy. Widz czyta to jako jeden powtarzany trik.");
    }

    if (!plan.muzyka || !plan.muzyka.plik) {
      uwagi.push("Rolka bez podkładu. Technicznie poprawna, w odbiorze płaska. Dodaj --muzyka muzyka.");
    } else {
      ok.push("muzyka dobrana");
    }

    const ileSfx = (plan.sfx || []).length;
    if (!ileSfx) uwagi.push("Zero efektów dźwiękowych. Zrób je raz: node narzedzia/zrob-sfx.mjs sfx");
    else if (ileSfx > 8) uwagi.push(`${ileSfx} dźwięków na jedną rolkę to hałas. Zostaw kilka najmocniejszych.`);
    else ok.push(`${ileSfx} efektów dźwiękowych`);
  } catch (e) {
    // plan nie jest wymagany; jeśli jest zepsuty, nie przerywamy kontroli pliku
  }
}

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
