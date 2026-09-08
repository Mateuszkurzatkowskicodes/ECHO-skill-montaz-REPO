#!/usr/bin/env python3
"""
wytnij-postac.py - wycina mowiacego z tla i zapisuje klip z przezroczystoscia.

PO CO TO JEST:
Najmocniejszy chwyt w rolkach porownawczych autora zestawu: panel z dowodem
(zrzut ekranu, wyniki, porownanie przed-po) wjezdza ZA mowiacego, a nie zamiast
niego. Widz caly czas widzi twarz, a obok niej material. Pelnoekranowa karta
wywala mowiacego z kadru na kilka sekund i rolka traci kontakt z widzem.

Zeby to zrobic, potrzebny jest klip z sama postacia, bez tla. To narzedzie
robi go z nagrania.

TO JEST NARZEDZIE ZAAWANSOWANE, nie czesc zwyklego montazu. Automat go nie
uzywa. Siegasz po nie wtedy, gdy user chce porownanie albo pokaz materialu
"za postacia".

CZEGO POTRZEBUJE:
    pip install mediapipe opencv-contrib-python numpy
Model pobiera sie sam przy pierwszym uruchomieniu (okolo 16 MB, licencja
Apache 2.0, wiec wolno go uzywac komercyjnie).

UZYCIE:
    python narzedzia/wytnij-postac.py nagranie.mp4 --sprawdz 4.0 podglad.png
    python narzedzia/wytnij-postac.py nagranie.mp4 --od 3 --do 9 postac.mov

Potem w planie montazu (plan.json) ukladasz warstwy w kolejnosci:
    1. tlo albo panel z dowodem,
    2. `postac.mov` jako nakladka na wierzchu.
Panel wjezdza wtedy ZA mowiacego.
"""
import argparse
import os
import subprocess
import sys
import urllib.request

MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/image_segmenter/"
    "selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite"
)
KORZEN = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL = os.path.join(KORZEN, "narzedzia", "selfie_multiclass.tflite")

try:
    import cv2
    import numpy as np
    from mediapipe.tasks.python import BaseOptions, vision
except ImportError:
    print("Brakuje bibliotek. Zainstaluj:")
    print("  pip install mediapipe opencv-contrib-python numpy")
    sys.exit(2)


def pobierz_model():
    if os.path.exists(MODEL):
        return
    print("Pobieram model segmentacji (okolo 16 MB, raz na komputer)...")
    urllib.request.urlretrieve(MODEL_URL, MODEL)
    print("Gotowe.")


def wymiary(plik):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0",
         "-show_entries", "stream=width,height,r_frame_rate",
         "-of", "csv=p=0", plik],
        capture_output=True, text=True,
    ).stdout.strip().split(",")
    szer, wys = int(out[0]), int(out[1])
    licznik, mianownik = out[2].split("/")
    return szer, wys, round(float(licznik) / float(mianownik))


def segmenter(tryb):
    return vision.ImageSegmenter.create_from_options(
        vision.ImageSegmenterOptions(
            base_options=BaseOptions(model_asset_path=MODEL),
            running_mode=tryb,
            output_confidence_masks=True,
            output_category_mask=False,
        )
    )


def alfa_postaci(maski, klatka_bgr, szer, wys, poprzednia=None):
    """
    Kategoria 0 to tlo, reszta (wlosy, skora, ubranie) to postac.

    Trzy rzeczy, bez ktorych wyciecie wyglada tanio:
      - guided filter dociaga kontur maski do prawdziwej krawedzi na obrazie,
      - wygladzanie w czasie, bo bez niego kontur drga miedzy klatkami,
      - lekkie zawezenie maski, zeby wokol postaci nie zostala aureola tla.
    """
    tlo = maski[0].numpy_view()
    postac = 1.0 - tlo
    postac = cv2.resize(postac, (szer, wys), interpolation=cv2.INTER_LINEAR).astype(np.float32)

    prowadnica = cv2.cvtColor(klatka_bgr, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255.0
    if hasattr(cv2, "ximgproc"):
        postac = cv2.ximgproc.guidedFilter(guide=prowadnica, src=postac, radius=14, eps=1e-4)

    a = np.clip((postac - 0.50) / 0.22, 0.0, 1.0)
    if poprzednia is not None:
        a = 0.72 * a + 0.28 * poprzednia
    wygladzona = a.copy()

    a8 = (a * 255).astype(np.uint8)
    a8 = cv2.morphologyEx(a8, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
    a8 = cv2.erode(a8, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)), iterations=1)
    a8 = cv2.GaussianBlur(a8, (0, 0), 1.6)
    return a8, wygladzona


def sprawdz(plik, sekunda, cel):
    """Jedna klatka z wycieta postacia, zeby ocenic jakosc przed renderem klipu."""
    pobierz_model()
    szer, wys, _ = wymiary(plik)
    tmp = cel + ".src.png"
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-ss", str(sekunda), "-i", plik, "-frames:v", "1", tmp],
        check=True,
    )
    klatka = cv2.imread(tmp)
    os.remove(tmp)

    with segmenter(vision.RunningMode.IMAGE) as seg:
        import mediapipe as mp
        obraz = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(klatka, cv2.COLOR_BGR2RGB))
        maski = seg.segment(obraz).confidence_masks
        a8, _ = alfa_postaci(maski, klatka, szer, wys)

    rgba = cv2.cvtColor(klatka, cv2.COLOR_BGR2BGRA)
    rgba[:, :, 3] = a8
    cv2.imwrite(cel, rgba)
    print(f"Podglad: {cel}. Obejrzyj kontur wokol wlosow i ramion.")


def klip(plik, od, do, cel):
    """Fragment nagrania jako .mov z kanalem alfa (ProRes 4444)."""
    pobierz_model()
    szer, wys, fps = wymiary(plik)
    czytnik = cv2.VideoCapture(plik)
    czytnik.set(cv2.CAP_PROP_POS_MSEC, od * 1000)

    ffmpeg = subprocess.Popen(
        ["ffmpeg", "-y", "-v", "error",
         "-f", "rawvideo", "-pix_fmt", "bgra", "-s", f"{szer}x{wys}", "-r", str(fps),
         "-i", "-", "-c:v", "prores_ks", "-profile:v", "4444", "-pix_fmt", "yuva444p10le", cel],
        stdin=subprocess.PIPE,
    )

    import mediapipe as mp
    poprzednia = None
    ile = 0
    with segmenter(vision.RunningMode.VIDEO) as seg:
        while czytnik.isOpened():
            czas = czytnik.get(cv2.CAP_PROP_POS_MSEC) / 1000.0
            if czas > do:
                break
            ok, klatka = czytnik.read()
            if not ok:
                break
            obraz = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(klatka, cv2.COLOR_BGR2RGB))
            maski = seg.segment_for_video(obraz, int(czas * 1000)).confidence_masks
            a8, poprzednia = alfa_postaci(maski, klatka, szer, wys, poprzednia)
            rgba = cv2.cvtColor(klatka, cv2.COLOR_BGR2BGRA)
            rgba[:, :, 3] = a8
            ffmpeg.stdin.write(rgba.tobytes())
            ile += 1

    czytnik.release()
    ffmpeg.stdin.close()
    ffmpeg.wait()
    print(f"Gotowe: {cel}  ({ile} klatek)")
    print("W planie poloz to jako nakladke NA panelu, wtedy panel bedzie za postacia.")


def main():
    ap = argparse.ArgumentParser(description="Wycina postac z tla.")
    ap.add_argument("nagranie")
    ap.add_argument("wyjscie", nargs="?", default="postac.mov")
    ap.add_argument("--sprawdz", type=float, metavar="SEKUNDA",
                    help="zapisz jedna klatke zamiast klipu, zeby ocenic jakosc")
    ap.add_argument("--od", type=float, default=0.0)
    ap.add_argument("--do", type=float, default=5.0)
    a = ap.parse_args()

    if a.sprawdz is not None:
        sprawdz(a.nagranie, a.sprawdz, a.wyjscie if a.wyjscie.endswith(".png") else "podglad.png")
    else:
        klip(a.nagranie, a.od, a.do, a.wyjscie)


if __name__ == "__main__":
    main()
