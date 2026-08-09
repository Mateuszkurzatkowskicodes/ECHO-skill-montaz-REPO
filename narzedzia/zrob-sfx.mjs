#!/usr/bin/env node
/**
 * zrob-sfx.mjs — buduje lokalny zestaw efektów dźwiękowych do montażu.
 *
 * PO CO TO JEST:
 * Pop na wjeżdżającej grafice, ding na liczbie, whoosh na przejściu i uderzenie
 * na hooku to połowa wrażenia "dowalonego" montażu. Bez nich rolka wygląda
 * poprawnie, ale płasko. W repo nie ma plików dźwiękowych, bo licencje nie
 * pozwalają ich rozdawać dalej, więc to narzędzie generuje własny zestaw
 * u Ciebie na dysku. Wszystko powstaje z niczego, więc jest w 100% Twoje
 * i żadna platforma nie zgłosi roszczenia.
 *
 * UŻYCIE:
 *   node narzedzia/zrob-sfx.mjs                 -> tworzy folder sfx/ obok repo
 *   node narzedzia/zrob-sfx.mjs C:/moje/sfx     -> tworzy w podanym miejscu
 *
 * Masz własne, kupione albo pobrane SFX? Wrzuć je do tego samego folderu pod
 * tymi samymi nazwami i montaż użyje Twoich. Te tutaj są punktem startowym,
 * nie sufitem.
 */

import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";

const folder = path.resolve(process.argv[2] || path.join(process.cwd(), "sfx"));
fs.mkdirSync(folder, {recursive: true});

/* Każdy dźwięk to wyrażenie matematyczne liczone próbka po próbce.
   exp(-t*N) to wygasanie (im większe N, tym krócej), sin(2*PI*t*F) to ton
   o częstotliwości F, a F zapisane jako wyrażenie z `t` daje zjazd albo
   najazd wysokości — to właśnie od tego "pop" brzmi jak pop, a nie jak pisk. */
const DZWIEKI = [
  {
    nazwa: "sfx-pop.wav",
    opis: "wjazd grafiki, badge, napis",
    zrodlo: "aevalsrc='0.85*exp(-t*26)*sin(2*PI*t*(760-820*t))':d=0.22:s=48000",
    po: "highpass=f=180,alimiter=limit=0.9"
  },
  {
    nazwa: "sfx-click.wav",
    opis: "drobne trafienie, kliknięcie, pojedyncze słowo",
    zrodlo: "aevalsrc='1.6*exp(-t*95)*(random(0)*2-1)':d=0.07:s=48000",
    po: "bandpass=f=2200:width_type=o:width=2,alimiter=limit=0.9"
  },
  {
    nazwa: "sfx-ding.wav",
    opis: "liczba, cena, wynik",
    zrodlo:
      "aevalsrc='0.45*exp(-t*6.5)*sin(2*PI*t*1480)+0.28*exp(-t*8.5)*sin(2*PI*t*2220)+0.12*exp(-t*12)*sin(2*PI*t*2960)':d=1.1:s=48000",
    po: "highpass=f=400,alimiter=limit=0.9"
  },
  {
    nazwa: "sfx-whoosh.wav",
    opis: "przejście, zmiana sceny, cutaway",
    zrodlo: "aevalsrc='0.7*(random(0)*2-1)':d=0.65:s=48000",
    po: "highpass=f=420,lowpass=f=6500,afade=t=in:st=0:d=0.3:curve=exp,afade=t=out:st=0.32:d=0.33,alimiter=limit=0.85"
  },
  {
    nazwa: "sfx-swipe.wav",
    opis: "szybki przeskok, slide napisu",
    zrodlo: "aevalsrc='0.6*(random(0)*2-1)':d=0.26:s=48000",
    po: "highpass=f=900,lowpass=f=9000,afade=t=in:st=0:d=0.1,afade=t=out:st=0.12:d=0.14,alimiter=limit=0.85"
  },
  {
    nazwa: "sfx-impact.wav",
    opis: "hook, mocne słowo, slam",
    zrodlo:
      "aevalsrc='0.9*exp(-t*9)*sin(2*PI*t*(95-45*t))+0.3*exp(-t*38)*(random(0)*2-1)':d=0.7:s=48000",
    po: "lowpass=f=2200,alimiter=limit=0.92"
  },
  {
    nazwa: "sfx-riser.wav",
    opis: "napięcie przed puentą (kładziesz przed cięciem)",
    zrodlo: "aevalsrc='0.5*(t/1.4)*sin(2*PI*t*(190+820*t*t))+0.2*(t/1.4)*(random(0)*2-1)':d=1.4:s=48000",
    po: "highpass=f=200,lowpass=f=8000,afade=t=out:st=1.25:d=0.15,alimiter=limit=0.88"
  },
  {
    nazwa: "sfx-sub-drop.wav",
    opis: "podbicie pod cięciem, „dołek” w basie",
    zrodlo: "aevalsrc='0.95*exp(-t*4.5)*sin(2*PI*t*(120-95*t))':d=0.9:s=48000",
    po: "lowpass=f=400,alimiter=limit=0.95"
  },
  {
    nazwa: "sfx-typing.wav",
    opis: "wpisywanie tekstu, prompt, DM",
    zrodlo: "aevalsrc='1.5*exp(-mod(t*9,1)*70)*(random(0)*2-1)':d=1.0:s=48000",
    po: "bandpass=f=1800:width_type=o:width=2,alimiter=limit=0.85"
  }
];

let ok = 0;
const braki = [];

for (const d of DZWIEKI) {
  const cel = path.join(folder, d.nazwa);
  const r = spawnSync(
    "ffmpeg",
    ["-y", "-hide_banner", "-v", "error", "-f", "lavfi", "-i", d.zrodlo, "-af", d.po, "-c:a", "pcm_s16le", cel],
    {encoding: "utf8"}
  );
  if (r.error) {
    console.error("Nie mogę uruchomić ffmpeg: " + r.error.message);
    process.exit(1);
  }
  if (r.status === 0 && fs.existsSync(cel)) {
    ok++;
    console.log(`  ${d.nazwa.padEnd(18)} ${d.opis}`);
  } else {
    braki.push(d.nazwa + (r.stderr ? " — " + r.stderr.trim().split("\n")[0] : ""));
  }
}

console.log(`\nGotowe: ${ok} dźwięków w ${folder}`);
if (braki.length) {
  console.log("Nie udało się zrobić: " + braki.join("; "));
}
console.log(
  "\nW planie montażu używa się ich tak:\n" +
  '  "sfx": [ { "plik": "sfx/sfx-pop.wav", "t": 3.6 }, { "plik": "sfx/sfx-ding.wav", "t": 12.4 } ]\n' +
  "\nMuzyki tu nie ma i nie będzie (licencje). Pobierz kilka utworów royalty-free\n" +
  "(np. z Pixabay Music), trzymaj je w jednym folderze i za każdą rolką bierz inny\n" +
  "niż ostatnio, żeby profil nie brzmiał jednostajnie."
);
