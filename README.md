# ECHO — Skill montażu z AI

To jest zestaw, dzięki któremu AI montuje krótkie i długie filmy w stylu ECHO:
napisy karaoke, gęste animowane efekty, muzyka ściszana pod głosem, efekty
dźwiękowe i kontrola jakości przed publikacją.

**Dostęp tylko dla kursantów.** Nie udostępniaj dalej.

## Co jest w środku

- `.claude/skills/montaz/SKILL.md` — autorski skill montażu (serce zestawu).
- `narzedzia/` — narzędzia, których AI używa zamiast pisać ffmpeg z ręki.
- `remotion-montaz/` — biblioteka efektów: 28 kompozycji sterowanych Twoim
  tekstem plus kilkadziesiąt gotowych wzorców do czytania.
- `wiedza-styl/` — analizy stylu montażu, na których uczył się skill.

## Aktualizacja z sierpnia 2026 (bezpłatna dla wszystkich kursantów)

Największa zmiana od premiery. Wklej komendę aktualizacji ze strony kursu, żeby
to pobrać.

**Efekty**
- Doszło narzędzie `plan-efektow.mjs`, które rozkłada efekty gęsto (średnio co
  3-4 sekundy, wpasowane w to, co faktycznie mówisz) i **pamięta, co poszło
  w poprzednich rolkach**, więc kolejna rolka dostaje inny zestaw. Ten sam efekt
  nie wraca dwa razy w jednej rolce, a muzyka rotuje tak samo.
- Efektów sterowanych Twoim tekstem jest teraz **28 zamiast 12**. Nowe: slam,
  lista z odhaczaniem, przekreślenie, karta wyniku, odręczne zakreślenie i
  podkreślenie, dwie kolumny "ręcznie kontra z AI", mockup komentarza, pasek
  etapów, stempel, wielka cyfra kroku, pytanie z odpowiedzią, ticker, odliczanie,
  trzy ikony, cytat na pełnym ekranie.
- Efekt dobiera się do treści: liczba dostaje kartę wyniku i dzwonek, kontra
  przekreślenie, wyliczanka listę, końcówka mockup komentarza pod CTA.

**Dźwięk**
- Muzyka sama ścisza się pod głosem (ducking) i wchodzi oraz schodzi łagodnie.
- Doszedł generator efektów dźwiękowych: `node narzedzia/zrob-sfx.mjs sfx` robi
  u Ciebie na dysku dziewięć dźwięków (pop, click, ding, whoosh, swipe, impact,
  riser, sub-drop, typing). Są w całości Twoje, więc nikt nie zgłosi roszczenia.
- Całość wyrównuje się do -14 LUFS, czyli poziomu, na którym grają Instagram,
  TikTok i YouTube. Koniec z rolką raz za cichą, raz przesterowaną.

**Rzeczy, które psuły montaż po cichu (naprawione)**
- Nagranie sklejone w prostym edytorze potrafiło rozjechać czas tak, że efekty
  trafiały w losowe momenty, a gotowa rolka wychodziła krótsza od nagrania.
  Render nie zgłaszał przy tym żadnego błędu. Teraz jest to wykrywane
  i wyrównywane przed montażem.
- Nagranie bez ścieżki dźwiękowej wywalało render niezrozumiałym błędem.
- Literówka w planie montażu (np. „cutaways” zamiast „cutawaye”) była cicho
  pomijana i rolka powstawała bez części efektów. Teraz to błąd z podpowiedzią.
- Rolki są montowane w 60 klatkach na sekundę, jeśli tyle ma nagranie.
  Wcześniej schodziły do 30 i traciły płynność.
- Wielkie napisy-efekty nie nakładają się już na napisy karaoke.

**Napisy**
- Kilka razy szybciej, jeśli zainstalujesz `faster-whisper` (komenda
  aktualizacji robi to za Ciebie).
- Nie doklejają już zmyślonych zdań w stylu „Napisy stworzone przez...”, które
  modele dorzucają na ciszy.
- Jedno słowo-klucz w linijce jest podświetlane innym kolorem.
- `--marginv 920` przesuwa napisy na szew przy pionowym split-screenie.

**Kontrola przed publikacją**
- `node narzedzia/sprawdz.mjs gotowe.mp4 --wobec nagranie.mp4` sprawdza, czy jest
  dźwięk na całej długości, czy montaż nie jest krótszy od nagrania, czy głośność
  jest w normie, czy nie ma czarnych klatek i dłuższej ciszy. Wyciąga też klatki
  do obejrzenia.

## Narzędzia

| Narzędzie | Do czego |
|---|---|
| `transkrypcja.py` | napisy karaoke, zapamiętywane między uruchomieniami |
| `zrob-sfx.mjs` | zestaw dźwięków u Ciebie na dysku (raz na komputer) |
| `wykryj-ciecia.mjs` | gdzie naprawdę są sklejki, czyli gdzie wolno dać zoom-punch |
| `plan-efektow.mjs` | gęsty i za każdym razem inny zestaw efektów |
| `buduj-filtr.mjs` | render całości: zoom, napisy, warstwy, muzyka, SFX, głośność |
| `sprawdz.mjs` | kontrola gotowego pliku i klatki do obejrzenia |

Typowy montaż to cztery komendy:

```bash
python narzedzia/transkrypcja.py nagranie.mp4 --ass napisy.ass
node narzedzia/plan-efektow.mjs nagranie.mp4 --napisy napisy.ass --muzyka muzyka --renderuj-efekty
node narzedzia/buduj-filtr.mjs plan.json --renderuj
node narzedzia/sprawdz.mjs gotowe.mp4 --wobec nagranie.mp4
```

Nie musisz ich pamiętać. Wrzuć nagranie do folderu i napisz „zmontuj mi tę
rolkę” — AI wie, w jakiej kolejności je uruchomić.

## Dwie rzeczy do podmiany na własne

- **Logo w rogu:** `remotion-montaz/public/brand-bug.png` jest pusty
  (przezroczysty). Wrzuć tam swoje logo pod tą samą nazwą.
- **Efekty dźwiękowe:** jeśli masz własne, kupione albo pobrane, wrzuć je do
  folderu `sfx` pod tymi samymi nazwami i montaż użyje Twoich.

## Muzyka

W repo nie ma plików muzycznych, bo licencje nie pozwalają ich rozdawać dalej.
Pobierz kilka utworów royalty-free (np. z Pixabay Music) i trzymaj je w jednym
folderze. Zestaw sam bierze do każdej rolki inny utwór niż ostatnio.

## Ważne: co renderować, a czego nie

W `remotion-montaz/src/` są dwa rodzaje plików:

- `compsBiblioteka.tsx` i `compsBiblioteka2.tsx` — **to renderujesz.** 28 efektów
  sterowanych tekstem, który podajesz.
- pozostałe `comps*.tsx` — **to czytasz, nie renderujesz.** Są to efekty pisane
  pod konkretne rolki autora i mają w środku wpisany na sztywno jego tekst.
  Wyrenderowane u siebie wstawią Ci w rolkę zdanie o cudzej firmie. Zaglądaj tam
  po pomysły i strukturę, gdy chcesz napisać własny efekt.
