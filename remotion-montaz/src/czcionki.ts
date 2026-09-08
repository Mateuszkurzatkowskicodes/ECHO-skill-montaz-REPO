/**
 * Czcionki wbudowane w projekt.
 *
 * DLACZEGO TEN PLIK ISTNIEJE (blad znaleziony 08.09.2026):
 * komponenty mialy wpisane `fontFamily: "Montserrat, 'Segoe UI', Arial"`, ale
 * nikt Montserrata nie ladowal. Na komputerze autora byl zainstalowany
 * w systemie, wiec efekty wygladaly tak, jak miały. U kazdego innego czcionka
 * cicho spadala na Segoe UI i te same efekty wygladaly o klase gorzej.
 * Zaden log tego nie pokazywal.
 *
 * Teraz pliki .ttf leza w `public/fonts/` i sa ladowane przez FontFace API
 * z `delayRender`, wiec render CZEKA na czcionke zamiast rysowac zastepcza.
 * Wynik jest identyczny na kazdym komputerze i bez internetu.
 *
 * Montserrat: SIL Open Font License 1.1 (patrz public/fonts/LICENCJA-OFL.txt),
 * wolno redystrybuowac i uzywac komercyjnie.
 */
import {continueRender, delayRender, staticFile} from 'remotion';

/** Rodzina do wszystkiego, co ma krzyczec: napisy, karty, liczby. */
export const SANS = "MontserratECHO, 'Segoe UI', 'Arial Black', Arial, sans-serif";

/** Rodzina techniczna: kod, liczniki, etykiety typu "01 / PROBLEM". */
export const MONO = "Consolas, 'Cascadia Mono', 'Courier New', monospace";

const WAGI: {waga: string; plik: string}[] = [
  {waga: '400', plik: 'fonts/montserrat-regular.ttf'},
  {waga: '600', plik: 'fonts/montserrat-600.ttf'},
  {waga: '700', plik: 'fonts/montserrat-700.ttf'},
  {waga: '800', plik: 'fonts/montserrat-800.ttf'},
  {waga: '900', plik: 'fonts/montserrat-900.ttf'},
];

let zaladowane = false;

/**
 * Wolamy raz, na starcie modulu z komponentami. Kolejne wywolania nic nie robia.
 * Gdy czcionki nie da sie zaladowac (brak pliku), render leci dalej na zapasowej
 * rodzinie zamiast zawiesic sie na `delayRender`.
 */
export function zaladujCzcionki(): void {
  if (zaladowane || typeof window === 'undefined' || typeof FontFace === 'undefined') return;
  zaladowane = true;

  const uchwyt = delayRender('Ladowanie czcionek ECHO');

  Promise.all(
    WAGI.map(({waga, plik}) => {
      const face = new FontFace('MontserratECHO', `url(${staticFile(plik)}) format('truetype')`, {
        weight: waga,
        style: 'normal',
      });
      return face.load().then((zaladowana) => {
        document.fonts.add(zaladowana);
      });
    })
  )
    .then(() => continueRender(uchwyt))
    .catch((blad) => {
      // Lepiej oddac render na zapasowej czcionce niz zawiesic caly montaz.
      console.warn('Nie udalo sie zaladowac czcionek ECHO:', blad);
      continueRender(uchwyt);
    });
}
