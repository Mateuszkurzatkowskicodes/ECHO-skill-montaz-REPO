#!/usr/bin/env python3
"""
transkrypcja.py - whisper z pamiecia podreczna (wersja Premium).

PO CO TO JEST:
Whisper na dluzszym nagraniu potrafi mielic kilka minut. Przy poprawianiu
montazu wraca sie do tego samego pliku po kilka razy i za kazdym razem
transkrypcja liczy sie od nowa. Tutaj wynik zapisuje sie pod skrotem pliku,
wiec drugie i kazde kolejne uruchomienie jest natychmiastowe.

Dodatkowo od razu wypluwa gotowy plik .ass z napisami karaoke w stylu ECHO,
zamiast zostawiac to do recznego skladania.

UZYCIE:
  python narzedzia/transkrypcja.py nagranie.mp4
  python narzedzia/transkrypcja.py nagranie.mp4 --model small --ass napisy.ass
  python narzedzia/transkrypcja.py nagranie.mp4 --wyczysc-cache
"""

import argparse
import hashlib
import json
import os
import subprocess
import sys
import tempfile

CACHE = os.path.join(tempfile.gettempdir(), "echo-transkrypcje")

# Styl napisow: Bahnschrift / MarginV=520, zgodnie z ustalonym stylem ECHO.
STYL_ASS = """[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: ECHO,Bahnschrift,86,&H00FFFFFF,&H000B4DFF,&H00000000,&H00000000,1,0,0,0,100,100,0,0,1,6,0,2,60,60,520,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""


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
    g = int(sek // 3600)
    m = int((sek % 3600) // 60)
    s = sek % 60
    return f"{g}:{m:02d}:{s:05.2f}"


# Przy Fontsize 86 i marginesach 60 w kadr 1080 wchodzi bezpiecznie okolo
# 20 znakow. Dluzsza linijka wyjezdza poza oba brzegi - sprawdzone na realnym
# montazu ("SYSTEM POZYSKIWANIA KLIENTOW" bylo ucinane).
MAKS_ZNAKOW = 20


def zbuduj_ass(segmenty, maks_slow=3):
    """Napisy karaoke: 2-3 slowa na linijke, ciete na pauzach i na dlugosci."""
    linie = [STYL_ASS]
    for seg in segmenty:
        slowa = seg.get("words") or []
        if not slowa:
            # brak znacznikow slow: cala linijka bez karaoke
            linie.append(
                f"Dialogue: 0,{czas_ass(seg['start'])},{czas_ass(seg['end'])},ECHO,,0,0,0,,{seg['text'].strip()}"
            )
            continue

        grupa = []
        for w in slowa:
            czysty = w["word"].strip()
            dlugosc_po = sum(len(g["word"].strip()) + 1 for g in grupa) + len(czysty)

            # Slowo nie miesci sie w biezacej linijce: zamknij ja przed nim.
            if grupa and dlugosc_po > MAKS_ZNAKOW:
                linie.append(linia_karaoke(grupa))
                grupa = []

            grupa.append(w)
            koniec_zdania = czysty.endswith((".", ",", "!", "?", ":"))
            if len(grupa) >= maks_slow or koniec_zdania:
                linie.append(linia_karaoke(grupa))
                grupa = []
        if grupa:
            linie.append(linia_karaoke(grupa))
    return "\n".join(linie) + "\n"


def linia_karaoke(grupa):
    start, koniec = grupa[0]["start"], grupa[-1]["end"]
    tekst = ""
    for w in grupa:
        trwanie = max(1, int((w["end"] - w["start"]) * 100))  # setne sekundy
        tekst += "{\\kf%d}%s " % (trwanie, w["word"].strip().upper())
    return f"Dialogue: 0,{czas_ass(start)},{czas_ass(koniec)},ECHO,,0,0,0,,{tekst.strip()}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("plik")
    ap.add_argument("--model", default="medium")
    ap.add_argument("--jezyk", default="pl")
    ap.add_argument("--ass", default=None, help="gdzie zapisac napisy .ass")
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

    klucz = f"{skrot_pliku(a.plik)}-{a.model}-{a.jezyk}.json"
    sciezka_cache = os.path.join(CACHE, klucz)

    if os.path.exists(sciezka_cache):
        print(f"Z pamieci podrecznej: {sciezka_cache}")
        with open(sciezka_cache, encoding="utf-8") as f:
            wynik = json.load(f)
    else:
        print(f"Transkrybuje modelem {a.model}... (kolejny raz bedzie natychmiast)")
        try:
            import whisper
        except ImportError:
            print("Brak openai-whisper. Zainstaluj: pip install openai-whisper", file=sys.stderr)
            sys.exit(1)
        model = whisper.load_model(a.model)
        wynik = model.transcribe(a.plik, language=a.jezyk, word_timestamps=True)
        with open(sciezka_cache, "w", encoding="utf-8") as f:
            json.dump(wynik, f, ensure_ascii=False)

    segmenty = wynik.get("segments", [])
    print(f"Segmentow: {len(segmenty)}")

    if a.ass:
        with open(a.ass, "w", encoding="utf-8") as f:
            f.write(zbuduj_ass(segmenty))
        print(f"Napisy zapisane: {a.ass}")
    else:
        for s in segmenty:
            print(f"[{s['start']:.2f} - {s['end']:.2f}] {s['text'].strip()}")


if __name__ == "__main__":
    main()
