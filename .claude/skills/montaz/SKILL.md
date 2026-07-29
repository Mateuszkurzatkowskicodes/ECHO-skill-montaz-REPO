---
name: montaz
description: Montaż wideo w stylu "AI business YouTube" — shorty (9:16, do 60s) i długie formaty (16:9). Plan montażu, napisy, cięcia, muzyka, przekazanie do Premiere Pro lub automat przez ffmpeg. Użyj, gdy user prosi o montaż, edycję wideo, shorta, rolkę lub plan montażu nagrania.
---

# Montaż wideo — ECHO

Montujesz (lub planujesz montaż) nagrań w stylu referencyjnym: kanały typu "AI business" na YouTube (talking head + screen recording, szybkie tempo, animowane napisy). Referencje usera: "4 Ways to Make Money With Claude AI", "The New AI Business Model Making Millions In 2026", "How to Make Viral AI UGC for TikTok Ads" itp.

## Podział ról (ustalone 13.07 po pierwszym realnym montażu — bądź szczery co do możliwości)

**WAŻNE — selekcję dubli robi USER, nie Claude.** Pierwsza próba: Claude ciął na podstawie samej transkrypcji whisper (bez słyszenia audio) — wybór wypadł słabo, zbyt mechanicznie, powtórki i "dziwne" cięcia. User słyszy intonację i energię, Claude tego nie ocenia z samego tekstu. Docelowy przepływ:
1. **User** nagrywa kilka dubli, SAM wybiera najlepsze fragmenty i skleja je we własnym tempie (byle jak, bez napisów/efektów) w jeden plik .mp4, pionowo.
2. **Claude** bierze ten już wybrany, przycięty materiał i robi z niego PEŁNY montaż: napisy, zoomy, muzyka, efekty (patrz niżej).
Claude nadal MOŻE zaproponować plan cięć (transkrypcja + sugestia), jeśli user o to prosi — ale nie renderuje ostatecznego wyboru dubli bez akceptacji, i domyślnie to user dostarcza już wybrany materiał.

**Claude robi sam (automatycznie), na materiale już wybranym przez usera:**
- Transkrypcja nagrania (whisper), jeśli potrzebna do synchronizacji napisów
- Napisy animowane: plik .ass ze stylem (1-4 słowa naraz, keyword w kolorze) lub .srt
- Render przez ffmpeg: punch-in zoomy, wypalone napisy, muzyka w tle ściszona pod głosem, proste przejścia, korekta orientacji (UWAGA: ffmpeg 8.x auto-stosuje metadane rotate z telefonu — NIE dokładaj ręcznego transpose, bo podwoi obrót; sam scale+pad wystarczy)
- Eksport do Premiere: EDL / FCPXML z cięciami do dalszej obróbki

**Remotion = GŁÓWNY silnik efektów (od short-05, 2026-07-15).** Projekt w `remotion-montaz/` (src/comps.tsx ma gotowe wzorce: kinetyczne slamy ze spring physics + particle burst, pełnoekranowe interludia z animowanym wykresem SVG stroke-draw + grid + grain + glow, pill-badge ze spring, mockup DM z typing-indicatorem). Render: `npx remotion render src/index.ts <comp> out.mov --codec=prores --prores-profile=4444 --pixel-format=yuva444p10le --image-format=png` (alpha) lub `--codec=h264` (pełnoekranowe). Overlay w ffmpeg: `setpts=PTS+<start>/TB` + `overlay=enable='between(t,in,out)':eof_action=pass`. User potwierdził: NIE dajemy zewnętrznych AI (Higgsfield itp.), wszystko przez Remotion; efektów ma być DUŻO i mają wyglądać pro, nie "proste animacje". Napisy: karaoke \kf jak w short-01..04 (nie build-up), na wysokości szyi (MarginV=800).

**Claude robi też EFEKTY SPECJALNE (stack: Remotion + ffmpeg):**
- **Remotion** (React/Node → render wideo): animowane overlaye komponowane na nagranie — napisy pop/bounce z keywordem w kolorze, wlatujące strzałki/boxy/ikony, mockupy notyfikacji (dymek Messengera z leadem), animowane liczniki i liczby, karty tytułowe sekcji, wykresy, mockupy telefonu. Render do WebM/ProRes z kanałem alpha → overlay w ffmpeg. Każdy efekt pisany pod konkretny moment nagrania (timecode z planu cięć), nie z szablonu.
- **ffmpeg xfade**: ~50 przejść (slidewhip, zoomin, pixelize, circleopen...) + shake/punch przez crop-expressions, glow/blur, speed ramps.
- **ASS advanced**: napisy animowane słowo-po-słowie (\t, \fscx, kolory, karaoke) — działa nawet bez Remotion.
- **Assety**: ikony SVG rysuje Claude; SFX (whoosh/pop/ding) i muzyka z bibliotek royalty-free (np. Pixabay) — pobierz i trzymaj w folderze na muzykę (pobierz royalty-free na bieżąco) do wielokrotnego użytku.
- **Granice:** generatywne VFX (Runway/Kling/Pika) tylko jeśli user podepnie klucz API zewnętrznej usługi; pluginów Premiere nie odtwarzamy 1:1.

**User kończy w Premiere Pro (opcjonalnie):** korekcja koloru, efekty ponad możliwości stacka.

**Setup przy pierwszym użyciu:** sprawdź `ffmpeg`, `yt-dlp`, `whisper` — jeśli brak, zaproponuj instalację (winget/pip); Remotion: `npm create video` w folderze projektu wideo. Stan na 2026-07-09: brak ffmpeg/yt-dlp/whisper; jest python i node.

## Profil stylu: DŁUGI FORMAT (16:9, YouTube)

⚠️ Profil odtworzony z gatunku referencji — potwierdzony przez usera co do: dynamicznych przejść, efektów, muzyki w tle. Doprecyzuj z userem przy pierwszym montażu.

- **Tempo:** jump cuts — wycinamy KAŻDĄ pauzę, oddech, "yyy". Cięcie średnio co 3-8 s.
- **Zoomy:** punch-in/punch-out (100% ↔ ~110-120%) na akcenty zdań — co 1-2 zdania, na twardym cięciu, bez animacji płynnej.
- **Napisy:** duży bold sans (np. Montserrat ExtraBold), 1-4 słowa naraz, biały z czarnym obrysem, słowo-klucz w kolorze (żółty/zielony), lekki pop przy pojawieniu. W długim formacie: napisy na akcenty/sekcje, niekoniecznie cały czas.
- **Screen recording:** zoom na kursor/klikane miejsce, podświetlenie kliknięć, przybliżenia na ważne fragmenty ekranu.
- **Grafiki/B-roll:** ikony i strzałki wlatujące na słowa-klucze, boxy z tekstem, wstawki B-roll/memy co 20-40 s, karty tytułowe między sekcjami.
- **SFX:** whoosh na przejściach sekcji, pop/click na grafikach, subtelny ding na kluczowych liczbach.
- **Muzyka:** lo-fi / chill beat / ambient loop pod całością, głośność ~-22 do -28 dB względem głosu (ma być tłem, nie konkurencją), ducking pod mową.
- **Przejścia między sekcjami:** twarde cięcie + whoosh lub szybki zoom-transition; bez crossfade'ów i gwiazdek.
- **Hook:** pierwsze 15-30 s = zapowiedź wartości + szybki teaser (fragmenty z dalszej części), dopiero potem intro.

## Profil stylu: SHORT / ROLKA (9:16, do 60 s)

Styl skalibrowany na żywo przez V1-V8 (short-01, "nie musisz tańczyć") i short-02 ("wizytówka"), plus 5 analiz `/claude-watch` cudzych rolek (wiedza-styl/analiza-styl-reel-*.md). To jest już nasz SPRAWDZONY bazowy playbook, nie hipoteza:

- **Hook w 1-3 s:** najmocniejsze zdanie NA POCZĄTEK + napis wielki (fs boost), zoom-snap (mocny zoom wygasający w ~0.3s) + flash-in (biały błysk 0.12s) + opcjonalnie mała grafika-liczba/fakt wjeżdżająca obok twarzy (np. "22:00"), żeby hook był gęsty wizualnie, nie tylko tekstowo.
- **Napisy karaoke:** ASS z `\kf` (kolorowy sweep słowo-po-słowie), 2-4 słowa/linijkę, cięte na naturalnych pauzach/interpunkcji, nie sztywno co N słów.
- **Zoom ciągły:** "oddychający" zoom (powolna sinusoida) przez cały czas trwania, nie tylko punch-in na cięciach.
- **Zoom-punch + mikro-błysk na KAŻDYM cięciu między ujęciami** (nie tylko na hooku) — maskuje nieuniknione skoki pozycji ciała/ręki przy sklejaniu osobnych dubli. Bez tego złożone z kilku ujęć nagranie "dziwnie tnie".
- **B-roll cutaway pełnoekranowy z animowanymi elementami** (ikony/napisy WJEŻDŻAJĄ, slide-in/slide-out) — KAŻDY element musi mieć własny `enable` z czasem zniknięcia, inaczej zostaje na ekranie na stałe (patrz Częste błędy niżej).
- **Dwuczcionkowy system:** bold sans (Montserrat) na talking head = "mówię do Ciebie"; elegancki serif/italic na pełnoekranowych cutawayach = "pokazuję Ci coś" — rozróżnienie typograficzne samo sygnalizuje zmianę trybu.
- **Muzyka + SFX prawdziwe** (Pixabay, nie syntetyczne) — pop/ding na każdej grafice/cutawayu, cicho pod głosem (~0.13 vol).
- **Koniec:** CTA-komentarz w ostatnich 3-5 s, słowo-klucz WIELKIE w napisach (osobny fs boost), + karta-mockup (komentarz/DM) w dolnej jednej trzeciej.
- **Długość docelowa:** 20-65 s w zależności od ilości wartości do przekazania — retencja > sztywny limit czasu.

### Nowe techniki z analizy 5 cudzych rolek (do wypróbowania w kolejnych montażach)

**Najsilniejszy, wielokrotnie potwierdzony wzorzec (3 z 5 analizowanych reeli):**
- **Stały split-screen góra/dół zamiast krótkiej wstawki** — górne ~55-60% ekranu to CIĄGLE grający dowód (zrzut ekranu z prawdziwym kursorem, mockup, wykres), dolne to twarz, oba widoczne RÓWNOLEGLE przez dłuższy odcinek (kilkanaście-kilkadziesiąt sekund), nie 2-3s cutaway. Napisy siadają na granicy stref. Świetne pod: pokazywanie wyników kampanii/case study, tutorial, "oto co widać w panelu". Warto przetestować jako alternatywę dla pełnoekranowego cutawaya przy materiale, gdzie user faktycznie ma co pokazać na ekranie przez dłuższy czas.

**Pozostałe, warte wypróbowania punktowo:**
- Kolorowanie TYLKO 1-2 słów-kluczy w linijce napisu (nie całej linijki) — lżejszy wariant naszego obecnego podświetlenia.
- Strzałka-wskaźnik lub realistyczny popup UI z polami jako alternatywa dla kolorowej ramki podświetlającej.
- Komediowa karta "X minut później" (styl SpongeBoba) na przeskoki czasowe przed/po.
- Chapter labels w rogu kadru ("01 / PROBLEM", "02 / ROZWIĄZANIE") zmieniające się z etapami scenariusza.
- Wielokolumnowy count-up (kilka liczb rosnących równolegle) zamiast jednej liczby, gdy jest więcej niż jedna metryka.
- Diagonalny light-sweep na statycznych screen-recordingach, żeby ożywić nieruchomy zrzut ekranu.
- Ta sama plakietka/badge w dwóch kolorach: neutralny na starcie (etykieta kontekstu) → ciepły gradient na końcu (CTA) — sama zmiana koloru sygnalizuje przejście.
- Świadome przejście ze split-screenu/cutawaya na czystą pełnoekranową twarz w ostatnich 2-3s przed CTA — wizualnie oddziela "wartość" od "prośby o akcję".

Pełne analizy z transkryptami i uzasadnieniem: `wiedza-styl/analiza-styl-reel-*.md`.

## NARZĘDZIA (używaj ich zawsze, nie pisz tego z ręki)

W repo jest folder `narzedzia/`. **Zawsze zaczynaj od nich**, bo robią to samo
szybciej, taniej w tokenach i bez błędów, które inaczej wracają za każdym razem.

**1. Gdzie są prawdziwe sklejki**

```bash
node narzedzia/wykryj-ciecia.mjs nagranie.mp4
```

Wypisze gotową listę punchów. **To jest jedyne miejsce, gdzie wolno dać
zoom-punch.** Punch istnieje po to, żeby zamaskować przeskok ciała i rąk
w miejscu sklejenia dwóch ujęć. Jeśli wrzucisz go na akcenty zdań albo
„co jakiś czas", kamera drga bez powodu i montaż wygląda tanio. Gdy nagranie
jest jednym ciągłym ujęciem, punchów NIE MA wcale.

**2. Transkrypcja i napisy**

```bash
python narzedzia/transkrypcja.py nagranie.mp4 --ass napisy.ass
```

Whisper liczy się raz na plik, kolejne uruchomienia są natychmiastowe.
Od razu wypluwa gotowe napisy karaoke w stylu ECHO. Nie składaj ich ręcznie.

**3. Render**

```bash
node narzedzia/buduj-filtr.mjs plan.json --zapisz montaz
bash montaz.sh
```

**NIE wypisuj `-filter_complex` z ręki.** Napisz krótki plan, resztę zrobi
generator, razem z zabezpieczeniami (zoompan zamiast scale, `enable=` na każdej
nakładce, napisy pod interludiami, apostrofy w ścieżkach Windows, zoom liczony
z zapasem i zejście lanczosem dla ostrości, crf 15 z sufitem bitrate'u).

Plan wygląda tak i to jest CAŁOŚĆ, jaką piszesz:

```json
{
  "wejscie": "nagranie.mp4",
  "wyjscie": "gotowe.mp4",
  "dlugosc": 45.5,
  "fps": 30,
  "napisy": "napisy.ass",
  "muzyka": { "plik": "muzyka.mp3", "glosnosc": 0.10 },
  "zoom": { "amplituda": 0.012, "okres": 8 },
  "punche": [ { "t": 3.23 }, { "t": 6.00 } ],
  "cutawaye": [ { "plik": "interludium.mp4", "od": 6.3, "do": 9.5 } ],
  "nakladki": [ { "plik": "hook.mov", "od": 0, "do": 2.6, "x": 0, "y": 0 } ]
}
```

## BIBLIOTEKA EFEKTÓW

`remotion-montaz/src/compsBiblioteka.tsx` — 12 gotowych, sterowanych propsami:

`chapter-label` (etykieta „01 / PROBLEM"), `multi-countup` (kilka liczb naraz),
`light-sweep` (błysk po zrzucie ekranu), `badge-2kolory` (neutralny → ciepły),
`karta-czasu` („20 MINUT PÓŹNIEJ"), `strzalka` (wskaźnik), `glitch` (rozjazd RGB),
`scramble` (deszyfrowany tekst), `marker` (podkreślenie), `money-counter`,
`typewriter` (wpisywany prompt), `emoji-burst`.

```bash
npx remotion render src/index.ts marker out.mov --props='{"tekst":"TWOJE HASŁO"}' \
  --codec=prores --prores-profile=4444 --pixel-format=yuva444p10le --image-format=png
```

`compsSezon.tsx` to z kolei **wzorzec efektów pisanych pod konkretną rolkę**
(slam z wybuchem cząstek, pełnoekranowe interludium z przekreślaniem, karty VS,
interludium z rysowanym wykresem). Zajrzyj tam po strukturę, gdy piszesz własne.

## Workflow (krok po kroku) — OBOWIĄZKOWY proces "dowalonej rolki" (potwierdzony na short-05 V4, 2026-07-15)

0. **Wzorzec PRZED montażem (nie pomijać!):** przejrzyj `wiedza-styl/analiza-styl-*.md` (bazowo `analiza-styl-5-rolek-2026-07-15.md`); nowe referencje od usera → najpierw /claude-watch. Potem krótki research trendów efektów (WebSearch) i **plan efektów moment-po-momencie** (czas → beat → efekt). Dopiero potem render. Minimum efektów w każdej rolce: spring slam hook + particle burst (na klatce piersiowej, NIE na twarzy), 1-2 pełnoekranowe kinetyczne interludia (Remotion: grid+grain+glow, wykres stroke-draw), animowane badge, animowany mockup na CTA, strikethrough/checkmark przy kontrastach. Napisy karaoke \kf na wysokości szyi (MarginV=800), wyłączone w interludiach/pod slamami. Muzyka inna niż w poprzedniej rolce. Bez "wersji prostych" — domyślnie pełny pakiet.
1. **Wejście:** user daje JUŻ WYBRANY, przycięty plik wideo (sam wybrał najlepsze dble/fragmenty i skleił surowo). Ustal: format docelowy (short/long), cel (IG/TT/YT), czy jest muzyka do użycia (plik) czy dobrać royalty-free.
2. **Analiza:** ffprobe (parametry, w tym metadane rotacji) → whisper (transkrypcja z timecode'ami, do synchronizacji napisów).
3. **Plan efektów:** krótko pokaż userowi, co planujesz (styl napisów, gdzie zoomy, jaka muzyka) — nie trzeba już planu cięć, bo cięcia są gotowe.
4. **Wykonanie:** render przez `narzedzia/buduj-filtr.mjs` (patrz wyżej). Renderuj OD RAZU w pełnej jakości, nie rób wersji podglądowych w niższej rozdzielczości. Zawsze zweryfikuj wizualnie: wyciągnij klatki z GOTOWEGO pliku (`ffmpeg -ss <czas> -i gotowe.mp4 -frames:v 1 klatka.png`) i sprawdź, czy żaden napis ani grafika nie leży na twarzy i czy nic nie wychodzi poza kadr.
5. **Iteracja:** user ogląda, daje uwagi, poprawiasz parametry (tempo, napisy, głośność muzyki).
6. **Opis pod rolkę:** przy KAŻDYM ukończonym/zaakceptowanym montażu zapisz obok pliku wideo osobny `<nazwa-wideo>-OPIS.txt` (ten sam folder, `Gotowe-montaze/`) gotowy do wklejenia na FB/IG: hook → ból → wartość/rozwiązanie → CTA-komentarz ze słowem-kluczem + hashtagi, zero "—" (patrz `feedback_no_em_dashes`). Opis ma zgadzać się z tym, co FAKTYCZNIE padło w finalnym zmontowanym nagraniu (nie z pierwotnym scenariuszem, jeśli coś się zmieniło przy montażu/cięciu powtórek). Jeśli CTA obiecuje zasób pod słowo-klucz, sprawdź czy plik istnieje w `folderze na zasoby do DM` — jeśli nie, wypisz to jako ostrzeżenie na dole opisu.

## Zasady twarde

- Napisy po polsku (chyba że materiał anglojęzyczny dla zasięgu globalnego — zapytaj).
- Nigdy nie renderuj po cichu długiego materiału bez pokazania planu cięć.
- Muzyka: tylko royalty-free / dostarczona przez usera — pytaj o źródło.
- Pliki robocze w scratchpadzie, wyniki w folderze projektu.

## Częste błędy ffmpeg (znalezione w praktyce, sprawdź przed renderem)

- **Rotacja:** ffmpeg 8.x auto-stosuje metadane `rotate` z telefonu — NIE dokładaj ręcznego `transpose`, bo podwoi obrót.
- **`enable=` na KAŻDYM elemencie overlay** (np. cutaway z wieloma warstwami) — element bez własnego `enable` z czasem końca zostaje na ekranie do końca wideo.
- **Nigdy nie referencjonuj tego samego labela filtra dwa razy równolegle** (np. `[cur]crop=...[a]` i `[cur][a]overlay=...` w tej samej gałęzi) — w ffmpeg 8.1.2 to potrafi po cichu wyłączyć inny filtr (np. `ass`) na CAŁYM materiale, nie tylko w oknie czasowym efektu, mimo że filtr działa poprawnie w izolacji i mimo braku błędu w logu. Objawy: napisy/nakładki znikają dla całych fragmentów bez wyraźnej przyczyny. **Fix:** zawsze jawny `[cur]split=2[cur_a][cur_b]` przed użyciem tego samego strumienia w dwóch gałęziach (np. jedna do `crop` pod split-screen, druga jako baza `overlay`). Znalezione i naprawione przy montażu short-03 (split-screen), 2026-07-11.
- Po dodaniu nowego efektu zawsze zweryfikuj klatki NIE TYLKO w oknie czasowym efektu, ale też PRZED nim (np. t=0, t=hook) — bug jak wyżej objawia się poza oknem, łatwo go przeoczyć sprawdzając tylko "czy efekt działa".
- **Zoom robić przez `zoompan`, NIE przez `scale` z wyrażeniem czasowym.** `scale=w='...t...':eval=frame,crop=...` segfaultuje ffmpeg 8.1.2 (exit 139) po ~70-90 klatkach, niezależnie od treści wyrażenia — nawet sam `sin()` bez `if/exp` wywala. Log nie pokazuje błędu, plik urywa się bez atomu moov. **Fix:** `zoompan=z='1.0+0.015*sin(2*PI*time/6)+...':d=1:s=1080x1920:fps=60,setsar=1` — zmienna nazywa się `time` (nie `t`), działa stabilnie z dowolnie długim wyrażeniem. Znalezione przy montażu rolki (2026-07-23).
- **Flash/błysk robić w Remotion, nie przez `overlay` źródła `color=`.** Gałąź `color=white:d=0.2[flash]` + `overlay` też potrafiła segfaultować; biały `fade=t=in:color=white` albo warstwa flash w kompozycji Remotion są bezpieczne.
- **Ścieżki w `-filter_complex_script` na Windows:** wartości `fontfile=`, `textfile=`, `ass=` MUSZĄ być w apostrofach (`fontfile='C\:/Windows/Fonts/x.ttf'`), inaczej parser filtra wywala się na dwukropku dysku. W Bashu dodatkowo `export MSYS2_ARG_CONV_EXCL="*"` (blokuje konwersję ścieżek MSYS), ale wtedy pliki podawane przez `-i` muszą być w formacie Windows, nie POSIX.
