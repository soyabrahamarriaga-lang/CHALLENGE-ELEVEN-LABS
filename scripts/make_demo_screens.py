#!/usr/bin/env python3
"""Genera dos capturas FICTICIAS de un ERP (factura 4471, centro de costos 4711 → 0400).

Uso: python3 scripts/make_demo_screens.py <carpeta>   (requiere Pillow: pip install pillow)
Las imágenes no se versionan; se crean en la carpeta indicada.
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


def font(size):
    for path in ["/System/Library/Fonts/Supplemental/Arial.ttf", "/Library/Fonts/Arial.ttf",
                 "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"]:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def screen(out, name, cost_center, label, highlight):
    image = Image.new("RGB", (1280, 800), "#f3f4f6")
    draw = ImageDraw.Draw(image)
    draw.rectangle([0, 0, 1280, 56], fill="#1f3a5f")
    draw.text((24, 16), "ERP Demo  ·  Cuentas por pagar  ·  DATOS FICTICIOS", fill="white", font=font(22))
    draw.text((40, 90), "Factura 4471", fill="#111", font=font(34))
    rows = [("Proveedor", "Maschinenbau Krüger GmbH"), ("Descripción", "Fresadora CNC compacta"),
            ("Importe", "EUR 7,200.00"), ("Número de activo", "(vacío)"),
            ("Centro de costos", f"{cost_center}  ({label})"), ("Estado", "Borrador — sin guardar")]
    y = 160
    for field, value in rows:
        marked = highlight and field == "Centro de costos"
        draw.text((40, y), field, fill="#555", font=font(22))
        draw.rectangle([360, y - 6, 900, y + 30], outline="#e11d48" if marked else "#9ca3af",
                       width=3 if marked else 1, fill="white")
        draw.text((372, y), value, fill="#111", font=font(22))
        y += 70
    draw.rectangle([40, 640, 220, 690], fill="#2563eb")
    draw.text((80, 652), "Guardar", fill="white", font=font(22))
    image.save(out / name, "PNG")


if __name__ == "__main__":
    target = Path(sys.argv[1] if len(sys.argv) > 1 else ".")
    target.mkdir(parents=True, exist_ok=True)
    screen(target, "pantalla_1.png", "4711", "opex", False)
    screen(target, "pantalla_2.png", "0400", "capex", True)
    print(f"Capturas ficticias en {target}")
