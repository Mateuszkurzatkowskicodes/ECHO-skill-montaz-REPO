/**
 * Czcionki wbudowane w projekt.
 *
 * DLACZEGO TEN PLIK ISTNIEJE (blad znaleziony 08.09.2026):
 * komponenty mialy wpisane `fontFamily: "Montserrat, 'Segoe UI', Arial"`, ale
 * nikt Montserrata nie ladowal. Na komputerze autora byl zainstalowany
 * w systemie, wiec efekty wygladaly tak, jak mialy. U kazdego innego czcionka
 * cicho spadala na Segoe UI i te same efekty wygladaly o klase gorzej.
 * Zaden log tego nie pokazywal.
 *
 * DLACZEGO BEZ delayRender (poprawka z tego samego dnia):
 * pierwsza wersja ladowala pliki .ttf przez `staticFile` i `FontFace` pod
 * `delayRender`. Przy renderze kilku kompozycji pod rzad Remotion przerywal
 * prace komunikatem "delayRender was called but not cleared after 28000ms"
 * i efekt po prostu nie powstawal: w tescie przeszlo 5 z 7 kompozycji, a dwie
 * zniknely z rolki. Bezpiecznik na `setTimeout` nic nie dawal, bo Remotion
 * steruje czasem w renderowanej stronie i taki timer tam nie odpala.
 * Teraz czcionka siedzi w kodzie jako data URI: jest od razu, nie ma na co
 * czekac i nie ma czego nie doczekac.
 *
 * Montserrat: SIL Open Font License 1.1 (public/fonts/LICENCJA-OFL.txt),
 * wolno redystrybuowac i uzywac komercyjnie.
 */
import {CZCIONKI_BASE64} from './czcionki-dane';

/** Rodzina do wszystkiego, co ma krzyczec: napisy, karty, liczby. */
export const SANS = "MontserratECHO, 'Segoe UI', 'Arial Black', Arial, sans-serif";

/** Rodzina techniczna: kod, liczniki, etykiety typu "01 / PROBLEM". */
export const MONO = "Consolas, 'Cascadia Mono', 'Courier New', monospace";

let zaladowane = false;

/**
 * Wolamy raz, na starcie modulu z komponentami. Kolejne wywolania nic nie robia.
 * Wstrzykuje regule @font-face z czcionka w data URI, wiec nie ma zadnego
 * pobierania pliku ani czekania na siec.
 */
export function zaladujCzcionki(): void {
  if (zaladowane || typeof document === 'undefined') return;
  zaladowane = true;

  const regula = CZCIONKI_BASE64.map(
    ({waga, dane}) => `@font-face{
      font-family:'MontserratECHO';
      font-style:normal;
      font-weight:${waga};
      font-display:block;
      src:url(data:font/ttf;base64,${dane}) format('truetype');
    }`
  ).join('\n');

  const styl = document.createElement('style');
  styl.setAttribute('data-echo-czcionki', '1');
  styl.textContent = regula;
  document.head.appendChild(styl);
}
