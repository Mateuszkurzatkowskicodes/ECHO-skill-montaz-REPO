#!/usr/bin/env python3
"""
zrob-logo.py - robi znaczek marki, ktory siedzi w rogu rolki.

PO CO TO JEST:
W kazdej rolce autora zestawu w prawym gornym rogu stoi maly znaczek marki.
Wyglada to jak profesjonalny kanal, a nie jak przypadkowe nagranie, i po kilku
rolkach widz kojarzy go z Toba. W zestawie lezal do tej pory pusty plik
`brand-bug.png` z informacja "wrzuc tu swoje logo", wiec kto nie mial gotowego
logo, ten nie mial nic i jego rolki wychodzily bez znaku.

To narzedzie robi taki znaczek z samej NAZWY. Nie potrzebujesz grafika ani
gotowego logo: wpisujesz nazwe, dostajesz gotowy plik w stylu zestawu
(ciemna pigulka, zaokraglona, delikatna obwodka, jasny tekst).

UZYCIE:
    python narzedzia/zrob-logo.py "twoja marka"
    python narzedzia/zrob-logo.py "twoja marka" --kolor "#FF4D2D"
    python narzedzia/zrob-logo.py "twoja marka" --jasne

Plik ladnie: remotion-montaz/public/brand-bug.png (nadpisuje pusty).
Od tej chwili wchodzi sam we wszystkie sceny pelnoekranowe.

Masz wlasne logo? Wrzuc je zamiast tego pod ta sama nazwa, bedzie uzyte.
"""
import argparse
import os
import sys

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("Brakuje biblioteki Pillow. Zainstaluj: pip install pillow")
    sys.exit(2)

KORZEN = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CEL_DOMYSLNY = os.path.join(KORZEN, "remotion-montaz", "public", "brand-bug.png")

# Czcionka: najpierw ta dolaczona do zestawu, potem systemowe zapasowe.
CZCIONKI = [
    os.path.join(KORZEN, "remotion-montaz", "public", "fonts", "montserrat-800.ttf"),
    os.path.join(KORZEN, "remotion-montaz", "public", "fonts", "montserrat-700.ttf"),
    r"C:\Windows\Fonts\segoeuib.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
]


def znajdz_czcionke(rozmiar):
    for sciezka in CZCIONKI:
        if os.path.exists(sciezka):
            try:
                return ImageFont.truetype(sciezka, rozmiar)
            except OSError:
                continue
    return ImageFont.load_default()


def hex_na_rgb(tekst, domyslny=(255, 77, 45)):
    t = tekst.strip().lstrip("#")
    if len(t) != 6:
        return domyslny
    try:
        return tuple(int(t[i:i + 2], 16) for i in (0, 2, 4))
    except ValueError:
        return domyslny


def zrob(nazwa, cel, kolor_akcentu, jasne):
    WYS = 162
    MARGINES = 46
    ROG = 34

    font = znajdz_czcionke(92)
    prob = Image.new("RGBA", (10, 10))
    ramka = ImageDraw.Draw(prob).textbbox((0, 0), nazwa, font=font)
    szer_tekstu = ramka[2] - ramka[0]
    wys_tekstu = ramka[3] - ramka[1]

    # Kropka akcentu przed nazwa: zastepuje znak graficzny, gdy go nie ma.
    KROPKA = 26
    ODSTEP = 22
    szerokosc = MARGINES * 2 + KROPKA + ODSTEP + szer_tekstu

    tlo = (245, 247, 250, 235) if jasne else (18, 22, 29, 235)
    tekst_kolor = (18, 22, 29, 255) if jasne else (245, 247, 250, 255)

    obraz = Image.new("RGBA", (szerokosc, WYS), (0, 0, 0, 0))
    rys = ImageDraw.Draw(obraz)
    rys.rounded_rectangle([0, 0, szerokosc - 1, WYS - 1], radius=ROG, fill=tlo)

    # Delikatne rozjasnienie u gory: pigulka przestaje byc plaska plama.
    gradient = Image.new("L", (1, WYS), 0)
    for y in range(WYS):
        gradient.putpixel((0, y), int(26 * (1 - y / WYS)))
    gradient = gradient.resize((szerokosc, WYS))
    swiatlo = Image.new("RGBA", (szerokosc, WYS), (255, 255, 255, 0))
    swiatlo.putalpha(gradient)
    maska = Image.new("L", (szerokosc, WYS), 0)
    ImageDraw.Draw(maska).rounded_rectangle([0, 0, szerokosc - 1, WYS - 1], radius=ROG, fill=255)
    obraz = Image.composite(Image.alpha_composite(obraz, swiatlo), obraz, maska)
    rys = ImageDraw.Draw(obraz)

    srodek_y = WYS // 2
    x = MARGINES
    rys.ellipse(
        [x, srodek_y - KROPKA // 2, x + KROPKA, srodek_y + KROPKA // 2],
        fill=kolor_akcentu + (255,),
    )
    rys.text(
        (x + KROPKA + ODSTEP, srodek_y - wys_tekstu // 2 - ramka[1]),
        nazwa,
        font=font,
        fill=tekst_kolor,
    )
    rys.rounded_rectangle(
        [0, 0, szerokosc - 1, WYS - 1], radius=ROG, outline=kolor_akcentu + (70,), width=2
    )

    os.makedirs(os.path.dirname(cel), exist_ok=True)
    obraz.save(cel)
    return szerokosc, WYS


def main():
    ap = argparse.ArgumentParser(description="Robi znaczek marki do rogu rolki.")
    ap.add_argument("nazwa", help="nazwa marki, np. \"echo\" albo \"twoja firma\"")
    ap.add_argument("--kolor", default="#FF4D2D", help="kolor akcentu w zapisie hex")
    ap.add_argument("--jasne", action="store_true", help="jasna pigulka zamiast ciemnej")
    ap.add_argument("--zapisz", default=CEL_DOMYSLNY, help="gdzie zapisac plik")
    a = ap.parse_args()

    szer, wys = zrob(a.nazwa, a.zapisz, hex_na_rgb(a.kolor), a.jasne)
    print(f"Gotowe: {a.zapisz}  ({szer}x{wys} px)")
    print("Znaczek wchodzi sam w sceny pelnoekranowe.")
    print("Zeby pojawial sie przez cala rolke, skopiuj ten plik do folderu")
    print("montazowego jako logo.png: plan-efektow doda go wtedy do kazdego kadru.")


if __name__ == "__main__":
    main()
