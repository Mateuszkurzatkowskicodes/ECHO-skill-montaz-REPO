---
name: montaz
description: Montaż wideo w stylu ECHO — rolki (9:16, do 60s) i długie formaty (16:9). Napisy karaoke, gęste efekty, muzyka, SFX, kontrola jakości. Użyj, gdy user prosi o montaż, edycję wideo, shorta, rolkę lub plan montażu nagrania.
---

# Montaż wideo — ECHO

Montujesz nagrania w stylu "AI business": talking head, szybkie tempo, napisy
karaoke, gęste animowane efekty, muzyka pod głosem.

## Podział ról

**Wybór dubli robi USER, nie Ty.** Nie słyszysz intonacji ani energii, a z samej
transkrypcji wychodzą cięcia mechaniczne i powtórki. Przepływ jest taki:

1. User nagrywa kilka dubli, SAM wybiera najlepsze fragmenty i skleja je byle
   jak (bez napisów i efektów) w jeden plik pionowy.
2. Ty bierzesz ten gotowy materiał i robisz z niego PEŁNY montaż: napisy, zoomy,
   efekty, muzyka, SFX, kontrola.

Plan cięć możesz zaproponować, jeśli user o to poprosi, ale nie decydujesz
o wyborze dubli za niego.

## NARZĘDZIA — używaj ich zawsze, nie pisz ffmpeg z ręki

W repo jest folder `narzedzia/`. Zawierają zabezpieczenia przed błędami, które
kosztowały realne godziny i których nie widać w logu (render kończy się bez
błędu, tylko wynik jest zły). Pisanie `-filter_complex` z ręki to najkrótsza
droga do montażu, w którym efekty są w losowych miejscach.

### 1. Napisy karaoke

```bash
python narzedzia/transkrypcja.py nagranie.mp4 --ass napisy.ass
```

Rozpoznaje mowę i od razu daje gotowe napisy w stylu ECHO. Wynik jest
zapamiętywany, więc drugie uruchomienie na tym samym pliku jest natychmiastowe.
Wycina halucynacje (modele dorzucają na ciszy stopki typu "Napisy stworzone
przez..."), łamie linijki tak, żeby weszły w kadr, i podświetla słowo-klucz.

- `--marginv 920` przy split-screenie (napisy siadają na szwie, nie na twarzy).
- `--model small` gdy nagranie jest długie, a liczy się czas.
- Szybciej: `pip install faster-whisper` (narzędzie samo go użyje, jeśli jest).

### 2. Zestaw SFX (raz na komputer)

```bash
node narzedzia/zrob-sfx.mjs sfx
```

Buduje lokalnie pop, click, ding, whoosh, swipe, impact, riser, sub-drop
i typing. W repo nie ma plików dźwiękowych z powodu licencji, a bez SFX rolka
jest technicznie poprawna i kompletnie płaska. Masz własne, kupione albo
pobrane? Wrzuć je do tego folderu pod tymi samymi nazwami.

### 3. Plan efektów — GĘSTO i ZA KAŻDYM RAZEM INACZEJ

```bash
node narzedzia/plan-efektow.mjs nagranie.mp4 --napisy napisy.ass \
  --muzyka muzyka --renderuj-efekty
```

To narzędzie pilnuje dwóch rzeczy, o których łatwo zapomnieć:

- **gęstość**: efekt średnio co 3-4 s, wpasowany w momenty, w których coś się
  faktycznie mówi (bierze czasy z napisów). `--gestosc 3` zagęszcza jeszcze bardziej.
- **różnorodność**: pamięta w pliku `.echo-historia-efektow.json`, co poszło
  w poprzednich rolkach, i najpierw sięga po to, czego dawno nie było. Ten sam
  efekt nie wraca dwa razy w jednej rolce, a kolejna rolka startuje od innego
  zestawu. Muzyka rotuje tak samo, więc profil nie brzmi jednostajnie.

Dobiera też efekt do treści: liczba dostaje kartę wyniku i dzwonek, kontra
dostaje przekreślenie, wyliczanka listę z odhaczaniem, końcówka mockup
komentarza. Wynik to `plan.json` plus `efekty.json`.

**Muzyka: nigdy nie montuj po cichu bez podkładu.** Narzędzie bez folderu `muzyka/`
po prostu nie doda muzyki i nie zgłosi błędu, a rolka bez podkładu jest technicznie
poprawna i kompletnie płaska. Zanim wyrenderujesz:

- Jeśli w folderze `muzyka/` są utwory, wybierz ten, który pasuje do TYPU nagrania,
  a nie pierwszy z brzegu. Spokojne tłumaczenie czegoś to inny podkład niż mocne
  wezwanie do działania czy pokazywanie wyników.
- Jeśli folder jest pusty albo nic nie pasuje do materiału, **powiedz to userowi
  wprost przed renderem** i podaj konkretnie, jakiego podkładu ma poszukać
  (nastrój, tempo, ile sekund) i skąd (Pixabay Music, sekcja royalty-free).
  Lepiej poczekać minutę na plik niż oddać płaską rolkę.

**Zawsze przejrzyj `efekty.json` i popraw teksty.** Automat bierze frazy wprost
z napisów, więc czasem wychodzi zdanie urwane albo bez sensu w oderwaniu od
kontekstu. To jest miejsce, gdzie Twoja robota daje najwięcej: treść efektu ma
być krótka, mocna i zrozumiała bez dźwięku.

### 4. Render

```bash
node narzedzia/buduj-filtr.mjs plan.json --renderuj
```

`--renderuj` odpala ffmpeg sam, bez skryptu bash, więc działa identycznie na
Windows bez Git Basha, na macOS i na Linuksie. `--szybko` daje podgląd w niższej
jakości, gdy sprawdzasz tylko rozstawienie elementów.

Narzędzie samo: bierze fps i długość z nagrania, wykrywa nagranie z zepsutym
czasem i wyrównuje je, wycina napisy pod wielkimi napisami-efektami, miksuje
muzykę z duckingiem pod głosem, dokłada SFX i wyrównuje głośność do -14 LUFS.

Plan wygląda tak i to jest CAŁOŚĆ, jaką piszesz ręcznie, gdy nie korzystasz
z `plan-efektow.mjs`:

```json
{
  "wejscie": "nagranie.mp4",
  "wyjscie": "gotowe.mp4",
  "napisy": "napisy.ass",
  "napisyPrzerwy": [ { "od": 0, "do": 1.9 } ],
  "muzyka": { "plik": "muzyka/utwor.mp3", "glosnosc": 0.17 },
  "sfx": [ { "plik": "sfx/sfx-pop.wav", "t": 3.6 } ],
  "hook": { "sila": 0.09 },
  "punche": [ { "t": 6.02 } ],
  "cutawaye": [ { "plik": "interludium.mp4", "od": 6.3, "do": 9.5 } ],
  "splitscreen": [ { "plik": "panel.png", "od": 12, "do": 24 } ],
  "nakladki": [ { "plik": "efekty/01-fx-slam.mov", "od": 0, "do": 1.9 } ],
  "logo": { "plik": "logo.png", "szerokosc": 150, "pozycja": "prawy-gorny" }
}
```

Literówka w nazwie pola to błąd z podpowiedzią, a nie ciche pominięcie efektu.

### 5. Kontrola przed publikacją (nie pomijaj)

```bash
node narzedzia/sprawdz.mjs gotowe.mp4 --wobec nagranie.mp4
```

Sprawdza to, czego nie widać w logu renderu: czy jest dźwięk na całej długości,
czy montaż nie jest krótszy od nagrania, czy głośność siedzi na poziomie
platform, czy nie ma czarnych klatek i dłuższej ciszy. Wyciąga też siatkę klatek
do obejrzenia — **przejrzyj je**, bo tylko tak wyłapiesz napis leżący na twarzy
albo element wychodzący poza kadr.

### 6. Gdzie naprawdę są sklejki

```bash
node narzedzia/wykryj-ciecia.mjs nagranie.mp4
```

To jedyne miejsce, gdzie wolno dać zoom-punch. Punch istnieje po to, żeby
zamaskować przeskok ciała w miejscu sklejenia dwóch ujęć. Wrzucany na akcenty
zdań albo "co jakiś czas" sprawia, że kamera drga bez powodu i montaż wygląda
tanio. Jedno ciągłe ujęcie to zero punchów.

## Profil stylu: ROLKA (9:16, do 60 s)

- **Hook w 1-3 s:** najmocniejsze zdanie na początek, mocny najazd (`hook` w planie),
  wielki napis, plus efekt już w pierwszej sekundzie. Płaski początek to utracona rolka.
- **Napisy karaoke:** 2-4 słowa na linijkę, cięte na naturalnych pauzach, jedno
  słowo-klucz w kolorze, na wysokości szyi.
- **Zoom:** ciągły "oddychający" (ledwo wyczuwalny) przez cały czas, plus punch
  wyłącznie na sklejkach.
- **Efekty:** gęsto, średnio co 3-4 s, za każdym razem inny zestaw. Karty, listy
  i mockupy siedzą NAD napisami; wielkie napisy-slamy siadają na miejscu napisów
  i wtedy napis jest wycinany.
- **Split-screen:** przy materiale, gdzie user faktycznie ma co pokazać (panel,
  zrzut ekranu, wyniki) — górna część kadru to ciągle grający dowód, dolna twarz,
  kilkanaście sekund równolegle, nie dwusekundowa wstawka.
- **Dźwięk:** muzyka cicho pod głosem z duckingiem, SFX na każdym wjeżdżającym
  elemencie, całość na -14 LUFS. Muzyka inna niż w poprzedniej rolce.
- **Koniec:** CTA w ostatnich 3-5 s, słowo-klucz wielkie, mockup komentarza.
- **Długość:** 20-65 s, zależnie od tego, ile jest do powiedzenia. Retencja jest
  ważniejsza niż trafienie w okrągłą liczbę sekund.

## Profil stylu: DŁUGI FORMAT (16:9)

- Jump cuts, wycinamy każdą pauzę i "yyy", cięcie co 3-8 s.
- Napisy na akcenty i sekcje, nie przez cały czas.
- Karty tytułowe między sekcjami, wstawki co 20-40 s.
- Przy nagraniu ekranu: zoom na kursor i na klikane miejsce.
- Muzyka lo-fi pod całością, wyraźnie ciszej niż w rolce, z duckingiem.
- Pierwsze 15-30 s to zapowiedź wartości i teaser dalszej części.

## BIBLIOTEKA EFEKTÓW

W `remotion-montaz/` są dwa rodzaje rzeczy i nie wolno ich mieszać:

**Do renderowania: 28 kompozycji sterowanych propsami.**
`compsBiblioteka.tsx` (12): `chapter-label`, `multi-countup`, `light-sweep`,
`badge-2kolory`, `karta-czasu`, `strzalka`, `glitch`, `scramble`, `marker`,
`money-counter`, `typewriter`, `emoji-burst`.
`compsBiblioteka2.tsx` (16): `fx-slam`, `fx-lista`, `fx-przekreslenie`,
`fx-wynik`, `fx-kolo`, `fx-vs`, `fx-komentarz`, `fx-etapy`, `fx-stempel`,
`fx-krok`, `fx-podkreslenie`, `fx-pytanie`, `fx-ticker`, `fx-odliczanie`,
`fx-ikony`, `fx-cytat`.

```bash
node remotion-montaz/node_modules/@remotion/cli/remotion-cli.js render \
  src/index.ts fx-slam out.mov --props='{"tekst":"TWOJE HASŁO"}' \
  --codec=prores --prores-profile=4444 --pixel-format=yuva444p10le --image-format=png
```

(Uruchamiamy CLI przez `node`, a nie przez `npx`, bo Node na Windows odmawia
odpalania plików `.cmd` bez powłoki, a powłoka psuje JSON w `--props`.)

**Do czytania, NIE do renderowania: pozostałe pliki `comps*.tsx`.**
To efekty pisane pod konkretne rolki autora i mają w środku wpisany na sztywno
jego tekst (o jego klientach i jego ofercie). Wyrenderowane u siebie wstawisz
sobie w rolkę zdanie o cudzej firmie. Zaglądaj tam po strukturę i pomysły, gdy
piszesz własny efekt, ale renderuj z biblioteki albo napisz swój komponent.

**Logo w rogu:** `remotion-montaz/public/brand-bug.png` jest pusty. Wrzuć tam
swoje logo pod tą samą nazwą, albo podaj plik w polu `logo` w planie.

## Workflow

1. **Wejście:** user daje już wybrany, przycięty plik. Ustal format (rolka albo
   długi), gdzie ma pójść i czy ma własną muzykę.
2. **Napisy:** `transkrypcja.py`.
3. **Plan:** `plan-efektow.mjs`. Przejrzyj `efekty.json` i popraw teksty efektów.
4. **Pokaż userowi plan** w dwóch zdaniach: ile efektów, jakie, jaka muzyka.
5. **Render:** `plan-efektow.mjs --renderuj-efekty`, potem `buduj-filtr.mjs --renderuj`.
6. **Kontrola:** `sprawdz.mjs` i obejrzenie klatek.
7. **Koniec. Oddajesz gotowy plik i tyle.**

**NIE dopisuj z automatu opisu pod rolkę, hashtagów ani propozycji CTA.** Obietnicą
tego zestawu jest zmontowana rolka, a nie opis do niej. Dorzucanie tego z własnej
inicjatywy wydłuża montaż i każe czekać na coś, o co nikt nie prosił.

Jeśli user **wprost poprosi** o opis, wtedy go napisz: hook, ból, wartość, CTA,
hashtagi, zgodne z tym, co FAKTYCZNIE padło w zmontowanym nagraniu, nie z pierwotnego
scenariusza. Ale tylko na prośbę.

## Zasady twarde

- Napisy po polsku, chyba że materiał jest anglojęzyczny pod zasięg globalny.
- Muzyka tylko royalty-free albo dostarczona przez usera. Pytaj o źródło.
- Nie renderuj po cichu długiego materiału bez pokazania planu.
- Nie zostawiaj rolki bez kontroli `sprawdz.mjs` i bez obejrzenia klatek.
- Pliki robocze w folderze projektu, nie w repo skilla.

## Pułapki ffmpeg (wszystkie znalezione w praktyce)

Narzędzia w `narzedzia/` obchodzą je same. Ta lista jest na wypadek, gdy musisz
napisać filtr ręcznie, i żeby rozumieć, dlaczego narzędzia robią to tak.

- **Nagranie z zepsutym czasem = montaż na chybił trafił.** Materiał sklejony
  bez przekodowania albo z ujęć o różnych parametrach obrazu każe ffmpeg
  przebudować graf filtrów w miejscu sklejenia, a po przebudowie `zoompan`
  liczy czas OD ZERA. Zmierzone: plik ma 12,02 s, filtry widzą 6,03 s. Efekt:
  `enable='between(t,od,do)'` trafia w losowe miejsca, wideo wychodzi krótsze,
  render nie zgłasza żadnego błędu. `buduj-filtr.mjs` wykrywa to i wyrównuje
  nagranie przed montażem.
- **`asetpts=PTS-STARTPTS` PO zmianie próbkowania ucina dźwięk w połowie.**
  Nagranie 44,1 kHz przeliczane na 48 kHz plus `asetpts` dawało 12 s obrazu
  i 5,8 s dźwięku. Jeśli musisz zresetować czas audio, rób to PRZED `aformat`.
- **Warstwa przesunięta przez `setpts=PTS+od/TB` potrafi nie pojawić się wcale.**
  Taki strumień nie ma żadnej klatki przed czasem `od`, a `overlay` czeka na
  pierwszą klatkę drugiego wejścia. Używaj `tpad=start_duration=od`.
- **`-r` przy zapisie wyrzuca klatki**, gdy warstwy mają różne tempo (w logu
  `drop=`). Ustaw `fps=` na końcu łańcucha filtrów, a nie `-r` przy zapisie.
- **`zoompan` MUSI mieć jawne `x` i `y`**, inaczej powiększa od lewego górnego
  rogu i obraz zjeżdża w prawo w dół: `x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`.
- **Zoom przez `zoompan`, nie przez `scale` z wyrażeniem czasowym.** `scale`
  z `eval=frame` segfaultuje po kilkudziesięciu klatkach, log nic nie pokazuje,
  plik urywa się bez atomu moov. W `zoompan` zmienna czasu nazywa się `time`, nie `t`.
- **`enable=` na KAŻDEJ nakładce.** Element bez własnego czasu zniknięcia
  zostaje na ekranie do końca wideo. To najczęstszy błąd przy wielowarstwowych
  cutawayach.
- **Nigdy nie czytaj tego samego labela filtra dwa razy równolegle.** Potrafi po
  cichu wyłączyć inny filtr (np. `ass`) na CAŁYM materiale, mimo braku błędu
  w logu. Zawsze jawny `split` przed rozgałęzieniem.
- **Jeden wspólny format audio przed miksem.** Mono SFX 44,1 kHz plus stereo
  muzyka 48 kHz wywalają `amix` albo dają dźwięk w jednym kanale:
  `aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo`.
- **Błysk rób w Remotion, nie przez `overlay` źródła `color=`** — ta gałąź też
  potrafiła segfaultować.
- **Ścieżki w `-filter_complex_script` na Windows:** wartości `fontfile=`,
  `textfile=`, `ass=` muszą być w apostrofach, inaczej parser wywala się na
  dwukropku dysku.
- **Rotacja:** ffmpeg 8.x sam stosuje metadane `rotate` z telefonu. Nie dokładaj
  `transpose`, bo podwoisz obrót.
- Po dodaniu efektu sprawdzaj klatki nie tylko w jego oknie czasowym, ale też
  przed nim. Część powyższych błędów objawia się poza oknem efektu.
