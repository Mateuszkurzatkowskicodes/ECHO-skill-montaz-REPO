#!/usr/bin/env python3
"""
Gdzie w kadrze jest twarz i gdzie WOLNO polozyc efekt.

DLACZEGO TO POWSTALO (08.09.2026):
efekty byly kladzione na stalej wysokosci kadru, dobranej "na oko" pod jedno
nagranie. Przy innym kadrowaniu ta sama liczba ladowala mowiacemu na ustach:
wielki napis "POSLUCHAJ" na twarzy, kreska przez policzek. Zasada "nic nie lezy
na twarzy" byla w skillu opisana, ale nic jej nie pilnowalo.

Narzedzie probkuje kilkanascie klatek, szuka w nich skory i zwraca:
  - `twarzDol`  : dolna krawedz obszaru twarzy w pikselach (od gory kadru),
  - `bezpieczneY`: od ktorego Y mozna klasc efekt, zeby nie wszedl na twarz,
  - `pewnosc`   : ile klatek dalo zgodny wynik.

Bez modeli ML i bez pobierania czegokolwiek: detekcja koloru skory w YCrCb.
Dla gadajacej glowy w pionie to wystarcza, a nie doklada kursantowi zaleznosci,
ktora moze nie zainstalowac sie na jego komputerze.

Uzycie:
    python narzedzia/gdzie-twarz.py nagranie.mp4
    python narzedzia/gdzie-twarz.py nagranie.mp4 --json
"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

try:
    import cv2
    import numpy as np
except ImportError:
    print("Brakuje opencv-python albo numpy. Zainstaluj: pip install opencv-python numpy")
    sys.exit(2)


def dlugosc(plik):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "csv=p=0", str(plik)],
        capture_output=True, text=True,
    )
    try:
        return float(out.stdout.strip())
    except ValueError:
        return 0.0


def klatki(plik, ile=14):
    """Rownomierne probki z calego nagrania, zapisane do katalogu tymczasowego."""
    d = dlugosc(plik)
    if d <= 0:
        return []
    katalog = Path(tempfile.mkdtemp(prefix="echo-twarz-"))
    sciezki = []
    for i in range(ile):
        t = d * (i + 0.5) / ile
        cel = katalog / f"k{i:02d}.png"
        r = subprocess.run(
            ["ffmpeg", "-y", "-v", "error", "-ss", f"{t:.2f}", "-i", str(plik),
             "-frames:v", "1", str(cel)],
            capture_output=True,
        )
        if r.returncode == 0 and cel.exists():
            sciezki.append(cel)
    return sciezki


def dol_twarzy(sciezka):
    """
    Zwraca dolna krawedz najwiekszego skupiska skory w gornej czesci kadru
    albo None. Szukamy tylko w gornych 70% kadru, bo nizej sa dlonie i szyja,
    ktore maja ten sam kolor i rozciagnelyby obszar az do dolu.
    """
    obraz = cv2.imread(str(sciezka))
    if obraz is None:
        return None
    h, w = obraz.shape[:2]
    gora = obraz[: int(h * 0.7), :]

    ycrcb = cv2.cvtColor(gora, cv2.COLOR_BGR2YCrCb)
    # Zakres skory w YCrCb. Dziala dla roznych odcieni, bo Y (jasnosc) jest luzny.
    maska = cv2.inRange(ycrcb, np.array([0, 135, 85]), np.array([255, 180, 135]))
    maska = cv2.morphologyEx(maska, cv2.MORPH_OPEN, np.ones((7, 7), np.uint8))
    maska = cv2.morphologyEx(maska, cv2.MORPH_CLOSE, np.ones((25, 25), np.uint8))

    kontury, _ = cv2.findContours(maska, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not kontury:
        return None
    najwiekszy = max(kontury, key=cv2.contourArea)
    # Za maly obszar to zwykle dlon albo odblask, nie twarz.
    if cv2.contourArea(najwiekszy) < (w * h) * 0.012:
        return None
    _, y, _, wys = cv2.boundingRect(najwiekszy)
    return y + wys


def zmierz(plik, margines=30):
    sciezki = klatki(plik)
    if not sciezki:
        return None
    obraz = cv2.imread(str(sciezki[0]))
    wysokosc_kadru = obraz.shape[0] if obraz is not None else 1920

    wyniki = [d for d in (dol_twarzy(s) for s in sciezki) if d]
    for s in sciezki:
        try:
            s.unlink()
        except OSError:
            pass
    if not wyniki:
        return {
            "wysokoscKadru": wysokosc_kadru,
            "twarzDol": None,
            "bezpieczneY": int(wysokosc_kadru * 0.62),
            "pewnosc": 0,
            "uwaga": "Nie znalazlem twarzy. Biore ostrozne 62% wysokosci kadru.",
        }

    # Mediana jest odporna na pojedyncza klatke, w ktorej mowiacy zaslonil twarz reka.
    wyniki.sort()
    mediana = wyniki[len(wyniki) // 2]
    bezpieczne = min(int(mediana + margines), int(wysokosc_kadru * 0.86))
    return {
        "wysokoscKadru": wysokosc_kadru,
        "twarzDol": int(mediana),
        "bezpieczneY": int(bezpieczne),
        "pewnosc": len(wyniki),
        "uwaga": "",
    }


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args:
        print(__doc__)
        sys.exit(1)
    wynik = zmierz(args[0])
    if wynik is None:
        print("Nie udalo sie odczytac nagrania.")
        sys.exit(1)
    if "--json" in sys.argv:
        print(json.dumps(wynik, ensure_ascii=False))
        return
    print(f"Kadr:          {wynik['wysokoscKadru']} px wysokosci")
    if wynik["twarzDol"]:
        print(f"Twarz konczy sie na:  {wynik['twarzDol']} px  (mediana z {wynik['pewnosc']} klatek)")
    else:
        print("Twarz: nie wykryta")
    print(f"Efekty kladz od:      {wynik['bezpieczneY']} px w dol")
    if wynik["uwaga"]:
        print(wynik["uwaga"])


if __name__ == "__main__":
    main()
