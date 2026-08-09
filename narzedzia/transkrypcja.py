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

# Styl napisow ECHO. Bahnschrift to czcionka Windows; na macOS i Linuksie
# podmieniamy ja na najblizsza dostepna, inaczej system wstawia domyslna
# szeryfowa i napisy wygladaja zupelnie inaczej niz w kursie.
CZCIONKA_DOMYSLNA = "Bahnschrift"
CZCIONKI_ZAMIENNE = ["Bahnschrift", "DIN Alternate", "Oswald", "Arial Narrow", "Arial Black", "Arial"]

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
    """Pierwsza czcionka z listy, ktora jest w systemie."""
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


def linia_karaoke(grupa, kolorowanie=True):
    start, koniec = grupa[0]["start"], grupa[-1]["end"]
    klucz = wybierz_klucz(grupa) if kolorowanie else None
    tekst = ""
    for i, w in enumerate(grupa):
        trwanie = max(1, int((w["end"] - w["start"]) * 100))  # setne sekundy
        slowo = w["word"].strip().upper()
        if i == klucz:
            # kolor tylko na tym jednym slowie, potem powrot do bialego
            tekst += "{\\kf%d\\c%s}%s{\\c&H00FFFFFF&} " % (trwanie, KOLOR_KLUCZA + "&", slowo)
        else:
            tekst += "{\\kf%d}%s " % (trwanie, slowo)
    return f"Dialogue: 0,{czas_ass(start)},{czas_ass(koniec)},ECHO,,0,0,0,,{tekst.strip()}"


def zbuduj_ass(segmenty, maks_slow=3, marginv=520, fontsize=86, kolorowanie=True):
    """Napisy karaoke: 2-3 slowa na linijke, ciete na pauzach i na dlugosci."""
    linie = [
        SZABLON_ASS.format(
            czcionka=dostepna_czcionka(), fontsize=fontsize, marginv=marginv
        )
    ]
    for seg in segmenty:
        slowa = [w for w in (seg.get("words") or []) if w.get("start") is not None]
        if not slowa:
            # brak znacznikow slow: cala linijka bez karaoke
            linie.append(
                f"Dialogue: 0,{czas_ass(seg['start'])},{czas_ass(seg['end'])},ECHO,,0,0,0,,"
                + seg["text"].strip().upper()
            )
            continue

        grupa = []
        for w in slowa:
            czysty = w["word"].strip()
            if not czysty:
                continue
            dlugosc_po = sum(len(g["word"].strip()) + 1 for g in grupa) + len(czysty)

            # Slowo nie miesci sie w biezacej linijce: zamknij ja przed nim.
            if grupa and dlugosc_po > MAKS_ZNAKOW:
                linie.append(linia_karaoke(grupa, kolorowanie))
                grupa = []

            grupa.append(w)
            koniec_zdania = czysty.endswith((".", ",", "!", "?", ":"))
            if len(grupa) >= maks_slow or koniec_zdania:
                linie.append(linia_karaoke(grupa, kolorowanie))
                grupa = []
        if grupa:
            linie.append(linia_karaoke(grupa, kolorowanie))
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
