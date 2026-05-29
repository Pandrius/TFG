"""Traza local del pipeline IA con un ejemplo real del dataset desbalanceado."""
from __future__ import annotations

import csv
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SERVICIO_IA = ROOT / "servicio-ia"
DATASET = ROOT / "ml" / "train_EXPERIMENTO_A_desbalanceado.csv"

sys.path.insert(0, str(SERVICIO_IA))

import modelo  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from main import app  # noqa: E402


def cargar_ejemplo_privado() -> dict[str, str]:
    with DATASET.open(encoding="utf-8-sig", newline="") as archivo:
        lector = csv.DictReader(archivo)
        return next(fila for fila in lector if fila.get("label") == "1" and fila.get("texto"))


def main() -> None:
    fila = cargar_ejemplo_privado()
    texto = fila["texto"]

    print(f"DATASET={DATASET.relative_to(ROOT)}")
    print(f"LABEL_ESPERADO={fila['label']}")
    print(f"BETO_NOMBRE_CONFIG={modelo.BETO_NOMBRE}")
    print(f"BETO_MAX_LEN={modelo.BETO_MAX_LEN}")
    print(f"RUTA_MODELO={modelo.RUTA_MODELO}")
    print(f"MODELO_PKL_EXISTE={Path(modelo.RUTA_MODELO).exists()}")
    print(f"TEXTO_MUESTRA={texto[:220].replace(chr(10), ' ')}")

    archivo = (
        "ejemplo_dataset_desbalanceado.txt",
        texto.encode("utf-8"),
        "text/plain",
    )

    with TestClient(app) as cliente:
        salud = cliente.get("/salud")
        print(f"STATUS_SALUD={salud.status_code}")
        print("SALUD=" + json.dumps(salud.json(), ensure_ascii=False))

        respuesta = cliente.post("/procesar", files={"archivo": archivo})
        print(f"STATUS_PROCESAR={respuesta.status_code}")
        print("RESPUESTA=" + json.dumps(respuesta.json(), ensure_ascii=False))


if __name__ == "__main__":
    main()
