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

## Aktualizacja 2 (28 sierpnia 2026): rolka ma wyglądać dobrze BEZ proszenia

Skąd się wzięła: najczęstsza uwaga po pierwszej rolce brzmiała "daj więcej
efektów", "niech będą częściej", "niech będą różne". Skoro wszyscy proszą o to
samo, to nie jest życzenie, tylko brak w ustawieniu domyślnym. Ta aktualizacja
przenosi te uwagi do środka zestawu.

**Montaż z automatu jest gęstszy i ciekawszy**
- Efekty rozkładają się średnio co 3 sekundy zamiast co 3,5, i wchodzą tam,
  gdzie faktycznie coś mówisz.
- **Otwarcie rolki rotuje.** Pierwsze sekundy dostają jedną z pięciu form:
  wielkie słowo, zakreślenie na napisie, pełnoekranowa plansza, mała etykieta
  przy twarzy albo sama twarz z mocniejszym najazdem, bez żadnej nakładki.
  Zestaw pamięta, czym zaczęła się poprzednia rolka, i tym razem sięga po co
  innego. Chodzi o to, żeby profil nie wyglądał jak szablon.
- **Efekty nie idą równo jak metronom.** Gęściej na otwarciu, luźniej w środku,
  gdy coś tłumaczysz, i znowu gęściej na końcówce. Końcówka nie zostaje pusta,
  bo rolka urwana bez puenty wygląda jak przerwane zdanie.
- Dwa podobne efekty nie idą już jeden po drugim (koniec z dwoma zakreśleniami
  pod rząd). Ten sam efekt nie wraca w jednej rolce, a kolejna rolka startuje
  od innego zestawu.
- Na dłuższym nagraniu zestaw efektów nie kończy się w połowie: leci druga tura,
  zamiast zostawić drugą część rolki pustą.

**Pierwsza rolka ma być mocna bez proszenia**
- **Muzyka dobiera się pod to, co mówisz.** Zestaw czyta transkrypcję i wybiera
  podkład po treści (końcówka waży podwójnie, bo tam siedzi CTA), a rotacja
  rozstrzyga dopiero remis. Wcześniej brał po prostu ten, którego dawno nie było.
- **Podkład wchodzi od mocniejszego miejsca utworu.** Podkłady CC0 często zaczynają
  się kilkunastosekundowym narastaniem, a rolka trwa 30 sekund: pod hookiem robiła
  się prawie cisza.
- **Napisy wjeżdżają "popem"**, czyli pojawiają się odrobinę mniejsze i w 130 ms
  dochodzą do pełnej wielkości. Drobiazg, po którym widać, że to montaż, a nie
  wklejony tekst.
- **Dźwięk ma dramaturgię, nie tylko akcenty:** riser narasta sekundę przed puentą,
  a gdy otwarcie idzie bez nakładki, start podbija sub-drop.

**Dźwięk brzmi drożej**
- Efekty dźwiękowe wchodzą tylko na kilku najmocniejszych momentach (hook,
  liczba, kontra, CTA), maksymalnie sześć na rolkę, z odstępem. Wcześniej dźwięk
  dostawała każda nakładka i przy gęstym montażu rolka pikała kilkanaście razy.
- Ten sam dźwięk nie leci dwa razy pod rząd.

**Naprawione błędy, których nie było widać w logu**
- **Nakładka niższa niż kadr lądowała przy górnej krawędzi ekranu**, czyli
  zwykle na czole mówiącego. Teraz każdy taki element dostaje swoją wysokość
  i siada nad napisami.
- **Efekty z animowaną liczbą wpisywały do rolki kwoty, których nikt nie
  powiedział** (na przykład "OSZCZĘDZASZ 1500 ZŁ" w nagraniu bez żadnej kwoty).
  Wyszły z automatu; zostają do ręcznego użycia, gdy naprawdę masz liczby.
- Karta wyniku pokazywała podpis sklejony z kawałków wyrazów ("ROBI IĄCA"),
  a liczby rozbite przez napisy karaoke wyglądały jak "1 ,5 TYS".
- Wielki napis potrafił pokazać jedno urwane słowo, na przykład samo "TĘ".
- Silnik efektów nie odnajdywał się, jeśli montowałeś w innym folderze niż ten
  z repo. Teraz szuka go sam.

**Napisy**
- Żadna linijka nie miga krócej niż 0,7 sekundy.
- Linijki jednosłowne są scalane z następną, zamiast błyskać i znikać.

**Kontrola przed publikacją sprawdza teraz też sam montaż**
`node narzedzia/sprawdz.mjs gotowe.mp4` mówi nie tylko, czy plik jest
technicznie w porządku, ale też czy efektów jest wystarczająco gęsto, czy hook
nie jest płaski, czy nie powtarza się ten sam efekt i czy jest muzyka.

**Logo w rogu wchodzi samo**
Połóż `logo.png` w folderze, w którym montujesz, a znak wejdzie w prawy górny
róg każdej rolki.

**Cięcie materiału: bez owijania**
Skill mówi teraz wprost, że cięcie surowego materiału jest najsłabszym elementem
zestawu, i sam podpowiada dwie szybsze drogi: przyciąć samemu albo przepuścić nagranie
przez program do cięcia mowy (Descript, Gling). Jeśli mimo to poprosisz o pocięcie,
zrobi to, ale pokaże propozycję cięć do akceptacji zamiast zgadywać, które podejście
było lepsze.

**Skill wie więcej o stylu**
Plik `.claude/skills/montaz/SKILL.md` przestał być listą tego, co wolno, a stał
się listą progów, które montaż ma spełnić: gęstość efektów, wysokość napisów,
nic na twarzy, przeplatanie ciemnych i jasnych plansz, panel za postacią zamiast
pełnoekranowej karty, pokazywanie zamiast opisywania, zoom-punch wyłącznie na
sklejkach.

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

**Nic nie pobierasz i niczego nie wybierasz.** W `muzyka-startowa/` jest jedenaście
podkładów na wszystkie typowe nastroje rolki, a AI samo dobiera ten, który pasuje do
treści Twojego nagrania, i mówi Ci, który wybrało. Komenda instalacyjna kopiuje je do
folderu `muzyka/`, więc materiał jest na miejscu od pierwszej rolki.

Wszystko na licencji **CC0**, czyli w domenie publicznej: komercyjnie, bez oznaczania
autora, nikt nie zgłosi do nich roszczenia. Pełna lista nastrojów i źródła:
`muzyka-startowa/ZRODLA-I-LICENCJA.txt`.

Chcesz więcej? Możesz dorzucić własne utwory do tego samego folderu (np. z Pixabay
Music) i AI weźmie je pod uwagę. To opcja, nie warunek. Zestaw rotuje utwory między
rolkami, żeby profil nie brzmiał jednostajnie.

## Ważne: co renderować, a czego nie

W `remotion-montaz/src/` są dwa rodzaje plików:

- `compsBiblioteka.tsx` i `compsBiblioteka2.tsx` — **to renderujesz.** 28 efektów
  sterowanych tekstem, który podajesz.
- pozostałe `comps*.tsx` — **to czytasz, nie renderujesz.** Są to efekty pisane
  pod konkretne rolki autora i mają w środku wpisany na sztywno jego tekst.
  Wyrenderowane u siebie wstawią Ci w rolkę zdanie o cudzej firmie. Zaglądaj tam
  po pomysły i strukturę, gdy chcesz napisać własny efekt.
