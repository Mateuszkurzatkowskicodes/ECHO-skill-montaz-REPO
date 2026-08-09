/**
 * wspolne.mjs — funkcje używane przez kilka narzędzi montażowych.
 * Trzymane w jednym miejscu, żeby logika nie rozjechała się między skryptami.
 */

import {execFileSync, spawnSync} from "node:child_process";

/** Jedno pytanie do ffprobe, zwraca samą wartość albo pusty tekst. */
export function probe(pytanie, plik) {
  try {
    return execFileSync("ffprobe", ["-v", "error", "-of", "default=nw=1:nk=1", ...pytanie, plik], {
      encoding: "utf8"
    }).trim();
  } catch {
    return "";
  }
}

/** Tempo klatek jako liczba (r_frame_rate przychodzi jako "60/1"). */
export function tempoKlatek(plik) {
  const s = probe(["-select_streams", "v:0", "-show_entries", "stream=r_frame_rate"], plik);
  if (!s.includes("/")) return null;
  const [a, b] = s.split("/").map(Number);
  return b ? a / b : null;
}

/** Długość pliku w sekundach. */
export function dlugoscPliku(plik) {
  return Number(probe(["-show_entries", "format=duration"], plik)) || 0;
}

/**
 * Czy z tego nagrania da się poprawnie montować.
 *
 * Sprawdzamy dokładnie to, co realnie psuje montaż: czy przy przejściu przez
 * filtry czas dobiega do końca materiału. Robimy to na miniaturze (48x84), więc
 * kosztuje ułamek sekundy.
 *
 * Skąd to się bierze: nagranie sklejone z kilku ujęć BEZ przekodowania (albo
 * z ujęć o różnych parametrach obrazu) każe ffmpeg przebudować graf filtrów
 * w miejscu sklejenia, a po przebudowie `zoompan` zaczyna liczyć czas OD ZERA.
 * Zmierzone: plik ma 12,02 s, a filtry widzą 6,03 s. Skutki są ciche i mylące:
 *   - `enable='between(t,od,do)'` na cutawayach, nakładkach i split-screenie
 *     nie trafia tam, gdzie zaplanowano, albo nie wchodzi wcale,
 *   - gotowe wideo wychodzi krótsze niż nagranie.
 * Render kończy się bez jednego błędu, więc bez tego testu wychodzi montaż
 * poskładany na chybił trafił.
 *
 * Zwraca { zdrowe, dlugosc, widzianyCzas }.
 */
export function stanCzasu(plik) {
  const dlugosc = dlugoscPliku(plik);
  if (!dlugosc) return {zdrowe: true, dlugosc: 0, widzianyCzas: 0};
  const fps = Math.round(tempoKlatek(plik) || 30);

  const r = spawnSync(
    "ffmpeg",
    ["-v", "info", "-i", plik,
     "-vf", `scale=48:84,zoompan=z=1:d=1:s=48x84:fps=${fps},showinfo`,
     "-an", "-f", "null", "-"],
    {encoding: "utf8", maxBuffer: 256 * 1024 * 1024}
  );
  const log = (r.stderr || "") + (r.stdout || "");
  const trafienia = [...log.matchAll(/pts_time:([\d.]+)/g)];
  if (!trafienia.length) return {zdrowe: true, dlugosc, widzianyCzas: 0};

  const widzianyCzas = Number(trafienia[trafienia.length - 1][1]);
  return {
    zdrowe: Math.abs(dlugosc - widzianyCzas) / dlugosc < 0.05,
    dlugosc,
    widzianyCzas
  };
}
