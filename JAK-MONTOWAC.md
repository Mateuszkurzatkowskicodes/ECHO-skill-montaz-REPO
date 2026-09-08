# Jak zmontować rolkę tym zestawem

To jest instrukcja dla Claude, nie dla człowieka. Wklej komendę z dołu, a Claude
przejdzie całą drogę sam. Ten plik opisuje, co ma się wtedy zadziać i dlaczego.

---

## KOMENDA DO WKLEJENIA (kopiuj całość)

```
Zmontuj mi rolkę z tego nagrania: [WRZUĆ PLIK ALBO PODAJ ŚCIEŻKĘ]

Użyj skilla montaz i narzędzi z folderu narzedzia. Przejdź całą drogę sam, bez pytania mnie o zgodę na kolejne kroki. Trzymaj się tego porządku:

1. Napisy: python narzedzia/transkrypcja.py nagranie.mp4 --ass napisy.ass
2. Sprawdź, gdzie jest twarz: python narzedzia/gdzie-twarz.py nagranie.mp4
3. Plan: node narzedzia/plan-efektow.mjs nagranie.mp4 --napisy napisy.ass --muzyka muzyka
4. PRZECZYTAJ CAŁĄ TRANSKRYPCJĘ ZE ZROZUMIENIEM. Narzędzie wypisze przy każdym efekcie, co słychać w jego oknie czasowym. Dla KAŻDEGO efektu zdecyduj: czy ta forma ilustruje to zdanie? Jeśli nie, podmień "id" w efekty.json na taką, która ilustruje. Wolno Ci podmieniać formy, to jest normalna część montażu. Gdy nic w bibliotece nie pokazuje tej treści, napisz własny komponent na wzór compsAnimacje.tsx, użyj budulców z budulce.tsx i zarejestruj go w Root.tsx.
5. Przepisz teksty w efekty.json na krótkie hasła (2-4 słowa), zrozumiałe bez dźwięku, mówiące to, co PADŁO w nagraniu. Wypełnij pola "podpis" i "puenta" tam, gdzie są.
6. Render efektów z Twoimi tekstami: node narzedzia/plan-efektow.mjs nagranie.mp4 --napisy napisy.ass --muzyka muzyka --renderuj-z-pliku
7. Sklejenie: node narzedzia/buduj-filtr.mjs plan.json --renderuj
8. Kontrola: node narzedzia/sprawdz.mjs gotowe.mp4 --wobec nagranie.mp4, potem node narzedzia/krytyk.mjs gotowe.mp4
9. OBEJRZYJ kontaktówkę i odpowiedz na wszystkie pytania patrząc na obraz. Każde "nie" to poprawka i ponowny render, nie dopisek w podsumowaniu.

Twarde zasady, których nie łam:
- Napisy karaoke lecą przez całą rolkę i nic ich nie zasłania.
- Większość efektów gra NA nagraniu, nad napisami. Pełnoekranowa plansza wchodzi najwyżej dwa razy, na puencie i na końcu. Rytm "mówiący, plansza, mówiący, plansza" jest błędem.
- Żadnych ramek z samym napisem. Efekt ma ILUSTROWAĆ: licznik, wykres, pasek, ikony, mockup, coś co się rusza.
- Efekt musi pasować do zdania, które leci pod nim. Efekt o czym innym jest gorszy niż brak efektu.
- Nic nie leży na twarzy.
- Muzyka jest zawsze, dobierasz ją sam i nie pytasz mnie o nią.
- Nie pytaj mnie, ile chcę efektów. Zdecyduj i powiedz, co wybrałeś.

Na koniec pokaż mi gotowy plik i napisz w dwóch zdaniach, co się w rolce dzieje.
```

---

## Co Claude ma zrobić w kroku 4 (najważniejszym)

To jest krok, który odróżnia dobry montaż od losowego. Narzędzie wypisuje coś takiego:

```
   2. sekw-przekreslona   [3.72s - 7.92s]
      W TYM MOMENCIE SLYCHAC:  NIE JEST ZA PÓŹNO. IDZIE CI TERAZ DOBRZE, ALE TO
                               NIE ZNACZY, ŻE W PRZYSZŁOŚCI BĘDZIE TAK SAMO.
      teraz w efekcie:         etykieta: "koniec z tym"
```

Automat wylosował formę, ale **nie rozumie treści**. Zdanie mówi "dziś dobrze,
jutro nie wiadomo", więc pasuje `nak-porownanie` (DZIŚ → JUTRO), a nie lista
przekreślonych punktów. Claude ma to zmienić w `efekty.json`:

```json
{"id": "nak-porownanie", "dlugoscSekund": 2.6,
 "props": {"lewaEtykieta": "DZIŚ", "lewaWartosc": "idzie dobrze",
           "prawaEtykieta": "JUTRO", "prawaWartosc": "nie wiadomo"}}
```

Podmieniając formę, sprawdź długość kompozycji w `Root.tsx` i wpisz ją
w `dlugoscSekund`. Jeśli nowa kompozycja ma inną wysokość niż stara,
`buduj-filtr.mjs` sam podniesie nakładkę nad napisy i o tym napisze.

## Ściąga: co czym ilustrować

| Gdy w nagraniu pada... | Weź |
|---|---|
| liczba, kwota, procent, ile czegoś | `nak-licznik`, `graf-pierscien`, `graf-suwak` |
| czas, godziny, "ile to zajmuje" | `anim-zegar`, `graf-suwak` |
| spadek, kryzys, "coś się stanie" | `anim-wykres` |
| wzrost, zasięgi, "zaczyna się dziać" | `anim-wzrost`, `anim-fala`, `graf-slupki` |
| "dziś tak, jutro inaczej", porównanie | `nak-porownanie` |
| proces, kroki, "po kolei" | `nak-pasek`, `sekw-terminal`, `anim-timeline` |
| wyliczanka rzeczy | `nak-ikony`, `sekw-checklista` |
| "mijają miesiące", regularność | `anim-kalendarz` |
| dużo rzeczy naraz, ogarnianie | `anim-orbita` |
| social media, profil, obserwujący | `graf-konto` |
| wiadomości, DM, "klienci piszą" | `graf-powiadomienia` |
| CTA na końcu | `scena-cta`, `graf-powiadomienia`, `nak-equalizer` |

Gdy nic z tego nie pokazuje tego, o czym mowa: **napisz własny komponent**.
Weź `budulce.tsx` (tła z ziarnem, etykieta, nadtytuł, puenta, `wejscie()`),
skopiuj najbliższą rzecz z `compsAnimacje.tsx`, zmień zawartość i zarejestruj
w `Root.tsx`. Tak właśnie powstają rolki autora zestawu: pod każdą pisze się
kilka komponentów pod jej konkretną treść.

## Czego NIE robić

- Nie zostawiaj formy, którą wylosował automat, jeśli mówi o czym innym.
- Nie wstawiaj efektu z ramką i samym napisem. Te wyleciały z zestawu celowo.
- Nie rób z rolki serii plansz. Widz ma widzieć mówiącego prawie cały czas.
- Nie oddawaj pliku bez obejrzenia kontaktówki z `krytyk.mjs`.
- Nie dopisuj liczb ani obietnic, których w nagraniu nie było.
