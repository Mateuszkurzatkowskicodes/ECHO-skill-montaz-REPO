#!/usr/bin/env node
/**
 * wykryj-ciecia.mjs — znajduje PRAWDZIWE sklejki w nagraniu i wypisuje gotową
 * listę punchów do wklejenia w plan.
 *
 * PO CO TO JEST:
 * Zoom-punch ma jeden konkretny cel: zamaskować przeskok pozycji ciała i rąk
 * w miejscu, gdzie skleiłeś dwa różne ujęcia. Wrzucanie punchów na każde zdanie
 * albo "co jakiś czas" daje dziwne drganie kamery bez powodu i wygląda słabo.
 * To narzędzie wykrywa, gdzie sklejki NAPRAWDĘ są, i tylko tam stawia punch.
 *
 * UŻYCIE:
 *   node narzedzia/wykryj-ciecia.mjs nagranie.mp4
 *   node narzedzia/wykryj-ciecia.mjs nagranie.mp4 --czulosc 0.12
 */

import {execFileSync} from "node:child_process";

const args = process.argv.slice(2);
const plik = args[0];
if (!plik) {
  console.error("Podaj plik, np.: node narzedzia/wykryj-ciecia.mjs nagranie.mp4");
  process.exit(1);
}
const i = args.indexOf("--czulosc");
const czulosc = i !== -1 ? Number(args[i + 1]) : 0.08;

let wyjscie = "";
try {
  execFileSync(
    "ffmpeg",
    ["-v", "error", "-i", plik, "-vf", `select='gt(scene,${czulosc})',metadata=print:file=-`, "-an", "-f", "null", "-"],
    {stdio: ["ignore", "pipe", "pipe"], encoding: "utf8", maxBuffer: 64 * 1024 * 1024}
  );
} catch (e) {
  wyjscie = (e.stdout || "") + (e.stderr || "");
}
if (!wyjscie) {
  try {
    wyjscie = execFileSync(
      "ffmpeg",
      ["-v", "info", "-i", plik, "-vf", `select='gt(scene,${czulosc})',metadata=print:file=-`, "-an", "-f", "null", "-"],
      {stdio: ["ignore", "pipe", "pipe"], encoding: "utf8", maxBuffer: 64 * 1024 * 1024}
    );
  } catch (e) {
    wyjscie = (e.stdout || "") + (e.stderr || "");
  }
}

const czasy = [...wyjscie.matchAll(/pts_time:([0-9.]+)/g)].map((m) => Number(m[1]));

if (!czasy.length) {
  console.log("Nie znalazłem sklejek. To wygląda na jedno ciągłe ujęcie.");
  console.log("W takim materiale NIE dawaj punchów, bo nie ma czego maskować.");
  console.log('W planie zostaw: "punche": []');
  process.exit(0);
}

console.log(`Znalezione sklejki: ${czasy.length}`);
console.log(czasy.map((t) => t.toFixed(2)).join(", "));
console.log("\nGotowe do wklejenia w plan.json:\n");
console.log('  "punche": [');
console.log(czasy.map((t) => `    { "t": ${t.toFixed(2)} }`).join(",\n"));
console.log("  ],");
console.log("\nPunch stawiaj TYLKO tutaj. Nie dokładaj ich na akcenty zdań,");
console.log("bo wtedy kamera drga bez powodu i montaż wyglada tanio.");
