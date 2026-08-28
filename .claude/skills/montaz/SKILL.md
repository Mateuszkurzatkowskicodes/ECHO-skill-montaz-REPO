---
name: montaz
description: Montaż wideo w stylu ECHO — rolki (9:16, do 60s) i długie formaty (16:9). Napisy karaoke, gęste efekty, muzyka, SFX, kontrola jakości. Użyj, gdy user prosi o montaż, edycję wideo, shorta, rolkę lub plan montażu nagrania.
---

# Montaż wideo — ECHO

Montujesz nagrania w stylu "AI business": talking head, szybkie tempo, napisy
karaoke, gęste animowane efekty, muzyka pod głosem.

**Wersja 3 (sierpień 2026).** Zmiana kierunku: wcześniej ten plik opisywał,
co WOLNO zrobić. Teraz opisuje, co MUSI się znaleźć w rolce, żeby wyglądała jak
zmontowana, a nie jak nagranie z napisami. Jeśli user prosi Cię o "więcej
efektów", "częściej", "ciekawiej", to znaczy, że nie trzymasz tego pliku.
Tych rzeczy user nie ma zamawiać. To jest wersja domyślna.

## Cięcie materiału: mów szczerze, jak z tym jest

Domyślny przepływ: user daje Ci plik już przycięty (sam wybrał najlepsze podejścia
i skleił je byle jak), a Ty robisz z niego PEŁNY montaż: napisy, zoomy, efekty,
muzykę, SFX i kontrolę.

**Cięcie surowego materiału to najsłabszy element tego zestawu i nie udawaj, że jest
inaczej.** Czytasz tekst, nie słyszysz intonacji ani energii, więc przy kilku dublach
tego samego zdania trafiasz w najlepsze podejście przypadkiem. To kosztuje usera
więcej czasu na poprawki, niż zajęłoby mu przycięcie materiału samemu.

Gdy user przynosi surowe nagranie z dublami:

1. **Powiedz mu wprost, jak jest**, i podaj dwie szybsze drogi: przyciąć samemu
   w dowolnym edytorze (przy krótkiej rolce 5-10 minut) albo przepuścić nagranie
   przez program do cięcia mowy, na przykład Descript lub Gling, które same znajdują
   ciszę, "yyy" i powtórzone podejścia.
2. **Jeśli mimo to chce, żebyś pociął, zrób to.** Nie odmawiaj i nie odsyłaj go po
   gotowy plik.
3. **Wtedy pokaż propozycję cięć** (czasy plus co wypada) do akceptacji, zamiast po
   cichu skracać nagranie o połowę. Przy kilku podejściach tego samego zdania wypisz
   je z czasami i zapytaj, które zostaje.

## PROGI JAKOŚCI (to nie są sugestie)

Zanim oddasz rolkę, każda z tych rzeczy ma być prawdziwa:

| Co | Próg |
|---|---|
| Otwarcie | w pierwszych 2 s dzieje się coś mocnego, ale ZA KAŻDYM RAZEM INACZEJ |
| Gęstość efektów | średnio co 3-4 s. Powyżej 5 s to nagranie z napisami |
| Powtórki | żaden efekt nie wraca w tej samej rolce; dwa podobne nie idą pod rząd |
| Napisy | 2-3 słowa w linijce, każda stoi min. 0,7 s |
| Dźwięk | muzyka jest ZAWSZE; SFX maks. około 6 na rolkę |
| Głośność | -14 LUFS, muzyka z duckingiem pod głosem |
| Zoom-punch | tylko na sklejkach, nigdy "co jakiś czas" |
| Kontrola | `sprawdz.mjs` przeszedł i obejrzałeś klatki |

`plan-efektow.mjs` trzyma te progi sam, a `sprawdz.mjs` je weryfikuje na gotowym
pliku. Nie obchodź ich "dla oszczędności czasu": rolka bez efektów jest gotowa
szybciej i nie ogląda jej nikt.

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
przez..."), łamie linijki tak, żeby weszły w kadr, podświetla słowo-klucz,
scala linijki jednosłowne i pilnuje, żeby żaden napis nie mignął krócej niż
0,7 s.

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

To narzędzie pilnuje rzeczy, o których łatwo zapomnieć:

- **gęstość**: efekt średnio co 3 s, wpasowany w momenty, w których coś się
  faktycznie mówi (bierze czasy z napisów). `--gestosc 2.5` zagęszcza jeszcze
  bardziej, `--gestosc 4` rozrzedza pod spokojniejszy materiał.
- **otwarcie**: pierwsze sekundy dostają jedną z pięciu form i **forma rotuje
  między rolkami**: wielkie słowo, zakreślenie na napisie, pełnoekranowa plansza,
  mała etykieta przy twarzy albo sama twarz z mocniejszym najazdem i pierwszym
  efektem dopiero po hooku. Zestaw pamięta, czym zaczęła się poprzednia rolka.
- **różnorodność**: pamięta w pliku `.echo-historia-efektow.json`, co poszło
  w poprzednich rolkach, i najpierw sięga po to, czego dawno nie było. Ten sam
  efekt nie wraca dwa razy w jednej rolce, dwa efekty z tej samej rodziny
  (na przykład dwie kreski) nie idą jeden po drugim, a kolejna rolka startuje
  od innego zestawu. Muzyka rotuje tak samo.
- **dźwięk z umiarem**: dźwięk dostaje kilka najmocniejszych momentów (hook,
  liczba, kontra, CTA), a nie każda nakładka. Limit to 6 na rolkę i 1,6 s
  odstępu. Rolka, w której pika kilkanaście razy, brzmi tanio.
- **rytm**: efekty nie idą równo jak metronom. Gęściej na otwarciu, luźniej
  w środku, gdy coś tłumaczysz, i znowu gęściej na końcówce, gdzie siedzi puenta.
  Końcówka nigdy nie zostaje pusta.
- **pozycja w kadrze**: nakładka niższa niż kadr dostaje własne `y`, żeby nie
  przykleiła się do górnej krawędzi, czyli zwykle na czoło mówiącego.
- **logo**: jeśli w folderze montażowym leży `logo.png` albo `brand-bug.png`,
  wchodzi samo w prawy górny róg.

Dobiera też efekt do treści: liczba dostaje kartę wyniku i dzwonek, kontra
dostaje przekreślenie, wyliczanka listę z odhaczaniem, końcówka mockup
komentarza. Wynik to `plan.json` plus `efekty.json`.

**Muzykę dobierasz TY, user nie ma nic pobierać ani szukać.** To jest twarda zasada.
Zestaw ma jedenaście podkładów na wszystkie typowe nastroje, więc zawsze jest z czego
wybrać. **Nigdy nie odsyłaj usera po muzykę i nigdy nie pytaj go, jaki chce podkład**,
to jest dokładnie ta robota, której ma nie mieć. Przeczytaj transkrypcję, zdecyduj sam
i powiedz jednym zdaniem, co wybrałeś i dlaczego.

Narzędzie bez folderu `muzyka/` po prostu nie doda muzyki i nie zgłosi błędu, a rolka
bez podkładu jest technicznie poprawna i kompletnie płaska. Komenda instalacyjna kopiuje
`muzyka-startowa/` z repo do `muzyka/`, więc materiał jest na miejscu od pierwszej rolki.
Wszystko na licencji CC0: komercyjnie, bez oznaczania autora, zero ryzyka roszczeń.

| Plik | Kiedy go bierzesz |
|---|---|
| `spokojny-lofi-poranek` | spokojne tłumaczenie, poradnik, "jak to działa" |
| `cieply-lofi-vintage` | historia, doświadczenie, budowanie zaufania |
| `lekki-lofi-w-powietrzu` | neutralne tło, gdy muzyka ma nic nie narzucać |
| `emocjonalny-spokojny` | osobista historia, porażka, zmiana podejścia |
| `cieply-optymistyczny` | dobra wiadomość, efekt, "udało się" |
| `pozytywny-lekki` | luźne, sympatyczne, bez ciężaru |
| `nowoczesny-tech` | narzędzia, AI, pokazywanie ekranu, konkret techniczny |
| `motywacyjny-do-dzialania` | wezwanie do działania, "zacznij", CTA na końcu |
| `energiczny-phonk-only-human` | tempo, wyniki, liczby, szybka wyliczanka |
| `energiczny-napiecie` | problem, koszt zaniechania, "tracisz na tym" |
| `mocny-phonk-pantheon` | mocny hook, kontra, "przestań robić X" |

Jak wybierać:

1. **Zdecyduj po treści, nie po kolejności w folderze.** Weź dominujący ton całego
   nagrania: tłumaczenie czegoś to inny podkład niż wyliczanie strat czy CTA.
2. **Gdy nagranie zmienia ton** (spokojny wstęp, mocna końcówka), wybieraj pod
   końcówkę, bo to ona zostaje w głowie i tam siedzi CTA.
3. **Nie powtarzaj podkładu z poprzedniej rolki.** `plan-efektow.mjs` pilnuje tego sam
   przez `.echo-historia-efektow.json`, ale jeśli wybierasz ręcznie, sprawdź historię.
4. **Nie oddawaj rolki bez muzyki.** Jeśli z jakiegoś powodu folder `muzyka/` jest pusty,
   skopiuj go z repo (`muzyka-startowa/`) i lecisz dalej. To ma się dziać bez udziału usera.

User może dorzucić własne utwory do `muzyka/`, jeśli chce, i wtedy też je bierzesz pod
uwagę. Ale to jego opcja, nie warunek: bez kiwnięcia palcem ma dostać dobrze dobraną muzykę.

**Zawsze przejrzyj `efekty.json` i popraw teksty.** Automat bierze frazy wprost
z napisów, więc czasem wychodzi zdanie urwane albo bez sensu w oderwaniu od
kontekstu. To jest miejsce, gdzie Twoja robota daje najwięcej: treść efektu ma
być krótka, mocna i zrozumiała bez dźwięku. Zasada: **efekt cytuje to, co
naprawdę padło.** Nie dopisuj liczb, obietnic ani wyników, których user nie
powiedział, nawet jeśli "pasowałyby" do karty.

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

Sprawdza dwie rzeczy naraz. Technikę: czy jest dźwięk na całej długości, czy
montaż nie jest krótszy od nagrania, czy głośność siedzi na poziomie platform,
czy nie ma czarnych klatek i dłuższej ciszy. I sam montaż: jeśli obok pliku leży
`plan.json`, mówi też, czy efektów jest wystarczająco gęsto, czy hook nie jest
płaski, czy nie powtarza się ten sam efekt i czy jest muzyka.

Wyciąga też siatkę klatek do obejrzenia. **Przejrzyj je**, bo tylko tak
wyłapiesz napis leżący na twarzy albo element wychodzący poza kadr.

### 6. Gdzie naprawdę są sklejki

```bash
node narzedzia/wykryj-ciecia.mjs nagranie.mp4
```

To jedyne miejsce, gdzie wolno dać zoom-punch. Punch istnieje po to, żeby
zamaskować przeskok ciała w miejscu sklejenia dwóch ujęć. Wrzucany na akcenty
zdań albo "co jakiś czas" sprawia, że kamera drga bez powodu i montaż wygląda
tanio. Jedno ciągłe ujęcie to zero punchów.

## Profil stylu: ROLKA (9:16, do 60 s)

- **Otwarcie w 1-3 s:** najmocniejsze zdanie na początek i mocny najazd (`hook`
  w planie). **Nie ma jednej słusznej formy hooka.** Wielki napis to tylko jedna
  z nich i nie może wracać w każdej rolce, bo profil zaczyna wyglądać jak szablon
  i widz przewija odruchowo. Do wyboru: wielkie słowo, zakreślenie na napisie,
  pełnoekranowa plansza z pierwszym zdaniem, mała etykieta przy twarzy albo sama
  twarz z mocniejszym najazdem, bez żadnej nakładki. `plan-efektow.mjs` rotuje to
  sam. Przy materiale z kilku ujęć dochodzi hypercut, czyli seria bardzo krótkich
  cięć zamiast jednego spokojnego ujęcia. Płaskie otwarcie to utracona rolka,
  ale płaskie nie znaczy "bez napisu": znaczy "nic się nie dzieje".
- **Napisy karaoke:** 2-3 słowa na linijkę, cięte na naturalnych pauzach, jedno
  słowo-klucz w kolorze, na wysokości szyi (`--marginv 520`). Gdy postać jest
  nisko w kadrze i napis ląduje na brzuchu, podnieś je (`--marginv 1070`),
  a przy split-screenie posadź na szwie (`--marginv 920`).
- **Zoom:** ciągły "oddychający" (ledwo wyczuwalny) przez cały czas, plus punch
  wyłącznie na sklejkach.
- **Efekty:** gęsto, średnio co 3-4 s, za każdym razem inny zestaw. Karty, listy
  i mockupy siedzą NAD napisami; wielkie napisy-slamy siadają na miejscu napisów
  i wtedy napis jest wycinany.
- **Nic nigdy nie leży na twarzy.** To jest granica nie do przekroczenia. Napisy
  na wysokości szyi albo klatki piersiowej, karty i mockupy w środkowej części
  kadru, etykiety w rogach.
- **Przeplataj ciemne i jasne.** Kilka ciemnych kart pod rząd zlewa się w jedno
  tło i widz przestaje je odróżniać. Po ciemnej karcie daj jasną, po pełnym
  ekranie coś małego w rogu.
- **Split-screen:** przy materiale, gdzie user faktycznie ma co pokazać (panel,
  zrzut ekranu, wyniki). Górna część kadru to ciągle grający dowód, dolna twarz,
  kilkanaście sekund równolegle, nie dwusekundowa wstawka. Domyślna granica
  (szew) to 1010 px: panel u góry, twarz pod nim, napisy na szwie.
- **Panele ZA postacią, nie zamiast niej.** Gdy porównujesz dwie rzeczy albo
  pokazujesz materiał, lepiej wjeżdża panel za wyciętą postacią niż
  pełnoekranowa karta, która wywala mówiącego z kadru na trzy sekundy.
- **Pokaż, nie opisuj.** Jeśli treść da się pokazać (zrzut ekranu, panel, klip,
  prosty animowany schemat), pokaż to. Tekstowa odznaka z hasłem jest planem
  awaryjnym, nie pierwszym wyborem.
- **Dźwięk:** muzyka cicho pod głosem z duckingiem, SFX na kilku najmocniejszych
  wejściach (nie na każdym), całość na -14 LUFS. Muzyka inna niż w poprzedniej
  rolce.
- **Na starcie jeden element naraz.** W pierwszych sekundach nie kładź dwóch
  nakładek jednocześnie: widz nie wie, gdzie patrzeć, i wychodzi bałagan.
- **Logo w rogu to PLIK, nie napis.** Nazwa marki wystukana czcionką w efekcie
  wygląda jak podpis pod zdjęciem. Logo wygląda jak marka.
- **Koniec:** CTA w ostatnich 3-5 s, słowo-klucz wielkie, mockup komentarza.
  Końcówka bez żadnego efektu wygląda, jakby rolce urwało się zdanie.
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

**Dwa efekty świadomie poza automatem: `money-counter` i `multi-countup`.**
Oba animują rosnącą liczbę, więc muszą dostać konkretną wartość. Brane
automatycznie z transkrypcji potrafiły zamienić "półtora tysiąca" na "1" albo
dorobić własny podpis, czyli wstawić do rolki obietnicę, której nikt nie złożył.
Używaj ich RĘCZNIE, gdy user naprawdę ma liczby do pokazania:

```bash
... render src/index.ts money-counter out.mov --props='{"do":1500,"waluta":"zł","podpis":"OSZCZĘDZASZ"}'
... render src/index.ts multi-countup out.mov --props='{"pozycje":[{"etykieta":"ROLKI","do":40,"sufiks":"/mies"}]}'
```

**Do czytania, NIE do renderowania: pozostałe pliki `comps*.tsx`.**
To efekty pisane pod konkretne rolki autora i mają w środku wpisany na sztywno
jego tekst (o jego klientach i jego ofercie). Wyrenderowane u siebie wstawisz
sobie w rolkę zdanie o cudzej firmie. Zaglądaj tam po strukturę i pomysły, gdy
piszesz własny efekt, ale renderuj z biblioteki albo napisz swój komponent.

**Własny efekt piszesz wtedy, gdy biblioteka nie ma czym pokazać treści.**
To normalna droga, nie ostateczność: skopiuj najbliższy komponent
z `compsBiblioteka2.tsx`, zmień zawartość, zarejestruj w `Root.tsx` i wyrenderuj.
Kompozycja pełnoekranowa ma 1080x1920, mniejsza dostaje własne `y` w planie.

**Logo w rogu:** `remotion-montaz/public/brand-bug.png` jest pusty. Wrzuć tam
swoje logo pod tą samą nazwą, albo połóż `logo.png` w folderze montażowym,
a plan weźmie je sam.

## Workflow

1. **Wejście:** plik od usera. Jeśli jest surowy, ustal, czy tniesz Ty (wtedy najpierw
   propozycja cięć do akceptacji), czy user przytnie go sam. Ustal też format (rolka
   albo długi), gdzie ma pójść i czy ma własną muzykę.
2. **Napisy:** `transkrypcja.py`.
3. **Plan:** `plan-efektow.mjs`. Przejrzyj `efekty.json` i popraw teksty efektów.
4. **Pokaż userowi plan** w dwóch zdaniach: ile efektów, jakie, jaka muzyka.
5. **Render:** `plan-efektow.mjs --renderuj-efekty`, potem `buduj-filtr.mjs --renderuj`.
6. **Kontrola:** `sprawdz.mjs` i obejrzenie klatek. Jeśli narzędzie zgłasza, że
   efektów jest za rzadko albo hook jest płaski, popraw i zrenderuj jeszcze raz.
   Nie oddawaj rolki z otwartą listą "DO POPRAWY".
7. **Koniec. Oddajesz gotowy plik i tyle.**

**NIE dopisuj z automatu opisu pod rolkę, hashtagów ani propozycji CTA.** Obietnicą
tego zestawu jest zmontowana rolka, a nie opis do niej. Dorzucanie tego z własnej
inicjatywy wydłuża montaż i każe czekać na coś, o co nikt nie prosił.

Jeśli user **wprost poprosi** o opis, wtedy go napisz: hook, ból, wartość, CTA,
hashtagi, zgodne z tym, co FAKTYCZNIE padło w zmontowanym nagraniu, nie z pierwotnego
scenariusza. Ale tylko na prośbę.

## Czego nie robić (najczęstsze wpadki)

- Nie oddawaj "wersji prostej na start". Domyślnie idzie pełny zestaw.
- Nie pytaj usera, ile chce efektów i jaką muzykę. Zdecyduj i powiedz, co wybrałeś.
- Nie powtarzaj tej samej nakładki w jednej rolce, nawet z innym tekstem.
- Nie kładź napisu ani grafiki na twarzy.
- Nie dawaj zoom-punchów poza sklejkami.
- Nie zostawiaj rolki bez muzyki "bo user nie podał".
- Nie wstawiaj liczb, których nie było w nagraniu.
- Nie renderuj długiego materiału po cichu, bez pokazania planu.

## Zasady twarde

- Napisy po polsku, chyba że materiał jest anglojęzyczny pod zasięg globalny.
- Muzyka tylko royalty-free albo dostarczona przez usera. Pytaj o źródło.
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
- **Nakładka niższa niż kadr przykleja się do GÓRY.** `overlay` bez jawnego `y`
  kładzie warstwę w punkcie 0,0, czyli zwykle na czoło mówiącego. Kompozycja
  o wysokości mniejszej niż 1920 musi dostać `y` w planie.
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
  cichu wyłączyć inny filtr (na przykład `ass`) na CAŁYM materiale, mimo braku
  błędu w logu. Zawsze jawny `split` przed rozgałęzieniem.
- **Jeden wspólny format audio przed miksem.** Mono SFX 44,1 kHz plus stereo
  muzyka 48 kHz wywalają `amix` albo dają dźwięk w jednym kanale:
  `aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo`.
- **Błysk rób w Remotion, nie przez `overlay` źródła `color=`.** Ta gałąź też
  potrafiła segfaultować.
- **Ścieżki w `-filter_complex_script` na Windows:** wartości `fontfile=`,
  `textfile=`, `ass=` muszą być w apostrofach, inaczej parser wywala się na
  dwukropku dysku.
- **Rotacja:** ffmpeg 8.x sam stosuje metadane `rotate` z telefonu. Nie dokładaj
  `transpose`, bo podwoisz obrót.
- Po dodaniu efektu sprawdzaj klatki nie tylko w jego oknie czasowym, ale też
  przed nim. Część powyższych błędów objawia się poza oknem efektu.
