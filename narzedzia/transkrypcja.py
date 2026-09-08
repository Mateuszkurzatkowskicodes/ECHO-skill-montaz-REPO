#!/usr/bin/env python3
"""
transkrypcja.py - rozpoznanie mowy + gotowe napisy karaoke w stylu ECHO.

PO CO TO JEST:
Rozpoznawanie mowy na dluzszym nagraniu potrafi mielic kilka minut. Przy
poprawianiu montazu wraca sie do tego samego pliku po kilka razy i za kazdym
razem liczy sie od nowa. Tutaj wynik zapisuje sie pod skrotem pliku, wiec drugie
i kazde kolejne uruchomienie jest natychmiastowe. Od razu wypluwa tez gotowy plik
.ass z napisami karaoke, zamiast zostawiac to do recznego skladania.

CO ROBI WIECEJ NIZ ZWYKLY WHISPER:
  - uzywa faster-whisper, jesli jest zainstalowany (kilka razy szybszy na
    zwyklym procesorze, mniej pamieci), a jesli nie ma, wraca do openai-whisper
  - wycina halucynacje: modele dorzucaja na ciszy stopki w stylu "Napisy
    stworzone przez..." albo powtarzaja ostatnie zdanie w petli
  - lamie linijki tak, zeby zmiescily sie w kadrze (dluzsza linijka wyjezdza
    poza oba brzegi, sprawdzone na realnym montazu)
  - podswietla slowo-klucz w linijce osobnym kolorem
  - pozwala ustawic wysokosc napisow, bo przy split-screenie siadaja na szwie,
    a nie na wysokosci szyi

UZYCIE:
  python narzedzia/transkrypcja.py nagranie.mp4
  python narzedzia/transkrypcja.py nagranie.mp4 --ass napisy.ass
  python narzedzia/transkrypcja.py nagranie.mp4 --ass napisy.ass --marginv 920
  python narzedzia/transkrypcja.py nagranie.mp4 --model small --bez-kluczy
  python narzedzia/transkrypcja.py nagranie.mp4 --wyczysc-cache
"""

import argparse
import hashlib
import json
import os
import re
import sys
import tempfile

CACHE = os.path.join(tempfile.gettempdir(), "echo-transkrypcje")

# Styl napisow ECHO.
#
# ZMIANA 08.09.2026: z Bahnschrift na Montserrat. Bahnschrift jest waski
# i kondensowany, przez co napisy wygladaly technicznie, jak podpis pod wykresem.
# Rolki, ktore autor uznal za dobre, maja napisy okragle i geste. Montserrat
# lezy w repo (remotion-montaz/public/fonts), a buduj-filtr wskazuje ffmpegowi
# ten folder przez `fontsdir`, wiec napisy wygladaja tak samo na kazdym
# komputerze, nawet gdy nikt nie instalowal czcionki w systemie.
CZCIONKA_DOMYSLNA = "Montserrat"
CZCIONKI_ZAMIENNE = ["Montserrat", "Poppins", "Nunito", "Segoe UI", "Arial"]

SZABLON_ASS = """[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: ECHO,{czcionka},{fontsize},&H00FFFFFF,&H000B4DFF,&H00000000,&H00000000,1,0,0,0,100,100,0,0,1,6,0,2,60,60,{marginv},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

# Kolor slowa-kluczy w formacie ASS (&HAABBGGRR - odwrotnie niz w HTML).
KOLOR_KLUCZA = "&H000B4DFF"  # ciepły pomarańcz ECHO

# Przy Fontsize 86 i marginesach 60 w kadr 1080 wchodzi bezpiecznie okolo
# 20 znakow. Dluzsza linijka wyjezdza poza oba brzegi - sprawdzone na realnym
# montazu ("SYSTEM POZYSKIWANIA KLIENTOW" bylo ucinane).
MAKS_ZNAKOW = 20

# Slowa, ktore nigdy nie sa slowem-kluczem w linijce.
SLOWA_PUSTE = {
    "i", "w", "z", "na", "do", "to", "a", "o", "u", "za", "po", "od", "ze", "sie",
    "się", "nie", "jest", "byc", "być", "ale", "juz", "już", "tak", "jak", "co",
    "ja", "ty", "on", "ona", "my", "wy", "the", "and", "or", "of", "in", "is",
    "ci", "cie", "cię", "mi", "go", "ich", "im", "tym", "ten", "ta", "te", "tego",
    "przez", "przy", "bez", "dla", "pod", "nad", "czy", "bo", "wiec", "więc",
}

# Typowe halucynacje na ciszy: modele dorzucaja stopki z materialow, na ktorych
# byly uczone. Na nagraniu, ktore konczy sie oddechem, laduje to na koncu rolki.
STOPKI = [
    r"napisy\s+(stworzone|utworzone|wygenerowane)",
    r"subtitles?\s+(by|created)",
    r"amara\.org",
    r"transcri(pt|bed)\s+by",
    r"dziękuję\s+za\s+(uwagę|obejrzenie)",
    r"thanks?\s+for\s+watching",
    r"^\s*(muzyka|music|\[.*\])\s*$",
]


def skrot_pliku(sciezka):
    h = hashlib.sha256()
    with open(sciezka, "rb") as f:
        # Duze wideo: skrot z poczatku, konca i rozmiaru wystarczy do rozpoznania pliku.
        h.update(str(os.path.getsize(sciezka)).encode())
        h.update(f.read(1024 * 1024))
        f.seek(max(0, os.path.getsize(sciezka) - 1024 * 1024))
        h.update(f.read(1024 * 1024))
    return h.hexdigest()[:16]


def czas_ass(sek):
    sek = max(0.0, sek)
    g = int(sek // 3600)
    m = int((sek % 3600) // 60)
    s = sek % 60
    return f"{g}:{m:02d}:{s:05.2f}"


def dostepna_czcionka():
    """Czcionka napisow.

    Montserrat jest dolaczony do repo (remotion-montaz/public/fonts), a
    buduj-filtr.mjs wskazuje ten folder ffmpegowi przez `fontsdir`. Nie musi
    wiec byc zainstalowany w systemie i sprawdzanie systemu tylko szkodzilo:
    na komputerze, gdzie Montserrata nie ma w Windows\Fonts, napisy cicho
    spadaly na Segoe UI, mimo ze plik czcionki lezal w repo obok.
    """
    repo_fonts = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "remotion-montaz", "public", "fonts",
    )
    if os.path.isdir(repo_fonts) and any(
        p.lower().startswith("montserrat") for p in os.listdir(repo_fonts)
    ):
        return "Montserrat"

    katalogi = [
        os.path.join(os.environ.get("WINDIR", "C:/Windows"), "Fonts"),
        "/System/Library/Fonts", "/Library/Fonts",
        os.path.expanduser("~/Library/Fonts"),
        "/usr/share/fonts", os.path.expanduser("~/.local/share/fonts"),
    ]
    zainstalowane = set()
    for k in katalogi:
        if not os.path.isdir(k):
            continue
        for korzen, _, pliki in os.walk(k):
            for p in pliki:
                zainstalowane.add(os.path.splitext(p)[0].lower().replace(" ", ""))
    for c in CZCIONKI_ZAMIENNE:
        if c.lower().replace(" ", "") in zainstalowane:
            return c
    return CZCIONKA_DOMYSLNA


# ---------------------------------------------------------------- rozpoznanie

def transkrybuj(plik, model, jezyk):
    """Zwraca liste segmentow w jednym formacie, niezaleznie od silnika.

    Format: [{start, end, text, no_speech_prob, avg_logprob,
              words: [{word, start, end}]}]
    """
    try:
        from faster_whisper import WhisperModel  # kilka razy szybszy na CPU
    except ImportError:
        return transkrybuj_openai(plik, model, jezyk), "openai-whisper"

    print(f"Rozpoznaję mowę (faster-whisper, model {model})...")
    silnik = WhisperModel(model, device="cpu", compute_type="int8")
    segmenty_we, _ = silnik.transcribe(plik, language=jezyk, word_timestamps=True)
    wynik = []
    for s in segmenty_we:
        wynik.append({
            "start": s.start,
            "end": s.end,
            "text": s.text,
            "no_speech_prob": getattr(s, "no_speech_prob", 0.0),
            "avg_logprob": getattr(s, "avg_logprob", 0.0),
            "words": [
                {"word": w.word, "start": w.start, "end": w.end}
                for w in (s.words or [])
            ],
        })
    return wynik, "faster-whisper"


def transkrybuj_openai(plik, model, jezyk):
    try:
        import whisper
    except ImportError:
        print(
            "Brak silnika rozpoznawania mowy. Zainstaluj jeden z dwóch:\n"
            "  pip install faster-whisper      (zalecany, szybszy)\n"
            "  pip install openai-whisper",
            file=sys.stderr,
        )
        sys.exit(1)
    print(f"Rozpoznaję mowę (openai-whisper, model {model})... to może potrwać kilka minut.")
    print("Wskazówka: pip install faster-whisper skraca to kilkukrotnie.")
    silnik = whisper.load_model(model)
    wynik = silnik.transcribe(plik, language=jezyk, word_timestamps=True)
    return [
        {
            "start": s["start"],
            "end": s["end"],
            "text": s["text"],
            "no_speech_prob": s.get("no_speech_prob", 0.0),
            "avg_logprob": s.get("avg_logprob", 0.0),
            "words": [
                {"word": w.get("word", ""), "start": w.get("start"), "end": w.get("end")}
                for w in (s.get("words") or [])
                if w.get("start") is not None and w.get("end") is not None
            ],
        }
        for s in wynik.get("segments", [])
    ]


def bez_halucynacji(segmenty):
    """Wyrzuca stopki i segmenty rozpoznane z niska pewnoscia na ciszy."""
    czyste = []
    odrzucone = []
    poprzedni_tekst = None
    powtorzenia = 0
    for s in segmenty:
        tekst = (s.get("text") or "").strip()
        if not tekst:
            continue
        maly = tekst.lower()

        if any(re.search(w, maly) for w in STOPKI):
            odrzucone.append(tekst)
            continue
        # cisza rozpoznana jako mowa
        if s.get("no_speech_prob", 0) > 0.6 and s.get("avg_logprob", 0) < -1.0:
            odrzucone.append(tekst)
            continue
        # ta sama linijka w petli (klasyczne zaciecie modelu)
        if maly == poprzedni_tekst:
            powtorzenia += 1
            if powtorzenia >= 2:
                odrzucone.append(tekst)
                continue
        else:
            powtorzenia = 0
        poprzedni_tekst = maly
        czyste.append(s)

    if odrzucone:
        print(f"Pominąłem {len(odrzucone)} fragment(ów) wyglądających na zmyślone przez model:")
        for t in odrzucone[:4]:
            print("  - " + (t[:70] + ("..." if len(t) > 70 else "")))
    return czyste


# ------------------------------------------------------------------- napisy

def wybierz_klucz(grupa):
    """Ktore slowo w linijce podswietlic. Najdluzsze slowo znaczace, albo liczba."""
    najlepszy, ocena_najlepszego = None, 0
    for i, w in enumerate(grupa):
        czysty = re.sub(r"[^\wąćęłńóśźżĄĆĘŁŃÓŚŹŻ]", "", w["word"]).strip()
        if not czysty or czysty.lower() in SLOWA_PUSTE:
            continue
        ocena = len(czysty)
        if any(c.isdigit() for c in czysty):
            ocena += 8       # liczby zawsze warto podswietlic
        if len(czysty) >= 7:
            ocena += 2
        if ocena > ocena_najlepszego:
            najlepszy, ocena_najlepszego = i, ocena
    return najlepszy


MIN_CZAS_LINIJKI = 0.7   # sekundy; krocej i napis tylko mignie
MIN_SLOW_LINIJKI = 2     # jedno slowo w linijce czyta sie jak blad


# Kazda linijka wjezdza lekkim "popem": pojawia sie o dziesiec procent mniejsza
# i w 130 ms dochodzi do pelnej wielkosci, z krotkim przenikaniem. Roznica jest
# niepozorna na papierze, a na gotowej rolce to ona odroznia napisy zywe od
# napisow, ktore po prostu sa. Zadnych dodatkowych narzedzi to nie wymaga.
WEJSCIE_LINIJKI = "{FAD(70,60)FSCX90FSCY90T(0,130,FSCX100FSCY100)}".replace(
    "FAD", chr(92) + "fad").replace("FSCX", chr(92) + "fscx").replace(
    "FSCY", chr(92) + "fscy").replace("T(", chr(92) + "t(")


def linia_karaoke(grupa, kolorowanie=True, koniec_wymuszony=None):
    """
    Linijka karaoke: kolor plynie przez slowa w rytm mowy i po kolei znika.

    ZMIANA 08.09.2026. Wczesniej dzialaly tu DWA mechanizmy koloru naraz:
    plynny sweep (kf) oraz jedno slowo pomalowane na pomaranczowo NA STALE
    (przez \\c i powrot do bieli). Sweep robil swoje, a obok niego wisiala
    druga, nieruchoma plama koloru, czesto w slowie, do ktorego sweep jeszcze
    nie dotarl. W kadrze wygladalo to jak usterka: caly czas zostawal jakis
    element pomaranczowy, w losowym miejscu linijki.

    Zostaje sam sweep, czyli to, co widac w rolkach autora: linijka wchodzi
    w kolorze drugorzednym (pomarancz ECHO) i bieleje slowo po slowie, dokladnie
    tak, jak sa wypowiadane. Na koniec linijki nie zostaje zadna plama.
    `kolorowanie=False` wylacza sweep i daje napisy jednolicie biale.
    """
    start = grupa[0]["start"]
    koniec = koniec_wymuszony if koniec_wymuszony is not None else grupa[-1]["end"]
    tekst = WEJSCIE_LINIJKI
    znacznik = chr(92) + "kf"
    for w in grupa:
        trwanie = max(1, int((w["end"] - w["start"]) * 100))  # setne sekundy
        slowo = w["word"].strip().upper()
        tekst += "{%s%d}%s " % (znacznik, trwanie if kolorowanie else 0, slowo)
    return f"Dialogue: 0,{czas_ass(start)},{czas_ass(koniec)},ECHO,,0,0,0,,{tekst.strip()}"


def dlugosc_znakow(grupa):
    return sum(len(g["word"].strip()) + 1 for g in grupa) - 1


def scal_migajace(grupy):
    """Laczy linijki, ktore tylko mignelyby na ekranie.

    Whisper zamyka grupe na kazdym przecinku, wiec przy szybkiej mowie wychodzily
    linijki jednoslowne trwajace 0,2 s. Na gotowej rolce wyglada to jak usterka:
    cos mignelo i zniklo, zanim dalo sie przeczytac. Laczymy taka linijke
    z nastepna, o ile obie zmieszcza sie w kadrze.
    """
    wynik = []
    for grupa in grupy:
        if not wynik:
            wynik.append(grupa)
            continue
        poprzednia = wynik[-1]
        czas_poprzedniej = poprzednia[-1]["end"] - poprzednia[0]["start"]
        za_krotka = czas_poprzedniej < MIN_CZAS_LINIJKI or len(poprzednia) < MIN_SLOW_LINIJKI
        zmiesci_sie = dlugosc_znakow(poprzednia) + 1 + dlugosc_znakow(grupa) <= MAKS_ZNAKOW
        # laczymy tylko to, co faktycznie ze soba sasiaduje w czasie
        przylega = grupa[0]["start"] - poprzednia[-1]["end"] < 0.6
        if za_krotka and zmiesci_sie and przylega:
            wynik[-1] = poprzednia + grupa
        else:
            wynik.append(grupa)
    return wynik


def zbuduj_ass(segmenty, maks_slow=3, marginv=520, fontsize=86, kolorowanie=True):
    """Napisy karaoke: 2-3 slowa na linijke, ciete na pauzach i na dlugosci."""
    linie = [
        SZABLON_ASS.format(
            czcionka=dostepna_czcionka(), fontsize=fontsize, marginv=marginv
        )
    ]
    grupy = []          # linijki z podzialem na slowa
    proste = []         # segmenty bez znacznikow slow: (start, end, tekst)

    for seg in segmenty:
        slowa = [w for w in (seg.get("words") or []) if w.get("start") is not None]
        if not slowa:
            # brak znacznikow slow: cala linijka bez karaoke
            proste.append((seg["start"], seg["end"], seg["text"].strip().upper()))
            continue

        grupa = []
        for w in slowa:
            czysty = w["word"].strip()
            if not czysty:
                continue
            dlugosc_po = sum(len(g["word"].strip()) + 1 for g in grupa) + len(czysty)

            # Slowo nie miesci sie w biezacej linijce: zamknij ja przed nim.
            if grupa and dlugosc_po > MAKS_ZNAKOW:
                grupy.append(grupa)
                grupa = []

            grupa.append(w)
            koniec_zdania = czysty.endswith((".", ",", "!", "?", ":"))
            if len(grupa) >= maks_slow or koniec_zdania:
                grupy.append(grupa)
                grupa = []
        if grupa:
            grupy.append(grupa)

    grupy = scal_migajace(grupy)

    # Kazda linijka stoi co najmniej MIN_CZAS_LINIJKI, o ile nie wchodzi w nastepna.
    # Bez tego przy szybkiej mowie napis znika, zanim oko go zlapie.
    for i, grupa in enumerate(grupy):
        start = grupa[0]["start"]
        koniec = grupa[-1]["end"]
        if koniec - start < MIN_CZAS_LINIJKI:
            granica = grupy[i + 1][0]["start"] - 0.02 if i + 1 < len(grupy) else start + MIN_CZAS_LINIJKI
            koniec = max(koniec, min(start + MIN_CZAS_LINIJKI, granica))
        linie.append(linia_karaoke(grupa, kolorowanie, koniec_wymuszony=koniec))

    for start, koniec, tekst in proste:
        linie.append(f"Dialogue: 0,{czas_ass(start)},{czas_ass(koniec)},ECHO,,0,0,0,,{tekst}")

    return "\n".join(linie) + "\n"


# --------------------------------------------------------------------- main

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("plik")
    ap.add_argument("--model", default="medium")
    ap.add_argument("--jezyk", default="pl")
    ap.add_argument("--ass", default=None, help="gdzie zapisac napisy .ass")
    ap.add_argument("--marginv", type=int, default=520,
                    help="wysokosc napisow: 520 zwykle, 920 przy split-screenie")
    ap.add_argument("--fontsize", type=int, default=86)
    ap.add_argument("--slowa", type=int, default=3, help="ile slow na linijke")
    ap.add_argument("--bez-kluczy", action="store_true",
                    help="nie podswietlaj slowa-klucza osobnym kolorem")
    ap.add_argument("--wyczysc-cache", action="store_true")
    a = ap.parse_args()

    os.makedirs(CACHE, exist_ok=True)
    if a.wyczysc_cache:
        for f in os.listdir(CACHE):
            os.remove(os.path.join(CACHE, f))
        print("Cache wyczyszczony.")

    if not os.path.exists(a.plik):
        print(f"Nie ma pliku: {a.plik}", file=sys.stderr)
        sys.exit(1)

    klucz = f"{skrot_pliku(a.plik)}-{a.model}-{a.jezyk}-v2.json"
    sciezka_cache = os.path.join(CACHE, klucz)

    if os.path.exists(sciezka_cache):
        print("Biorę z pamięci podręcznej (to samo nagranie liczone wcześniej).")
        with open(sciezka_cache, encoding="utf-8") as f:
            segmenty = json.load(f)
    else:
        segmenty, silnik = transkrybuj(a.plik, a.model, a.jezyk)
        segmenty = bez_halucynacji(segmenty)
        with open(sciezka_cache, "w", encoding="utf-8") as f:
            json.dump(segmenty, f, ensure_ascii=False)
        print(f"Gotowe ({silnik}). Kolejny raz na tym pliku będzie natychmiast.")

    print(f"Segmentów: {len(segmenty)}")

    if a.ass:
        with open(a.ass, "w", encoding="utf-8") as f:
            f.write(zbuduj_ass(
                segmenty,
                maks_slow=a.slowa,
                marginv=a.marginv,
                fontsize=a.fontsize,
                kolorowanie=not a.bez_kluczy,
            ))
        print(f"Napisy zapisane: {a.ass}  (czcionka: {dostepna_czcionka()}, wysokość: {a.marginv})")
    else:
        for s in segmenty:
            print(f"[{s['start']:.2f} - {s['end']:.2f}] {s['text'].strip()}")


if __name__ == "__main__":
    main()
