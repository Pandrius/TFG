"""Clasificacion de documentos: publico (0) / confidencial (1).

Pipeline: ``texto -> embedding BETO (768-d) -> clasificador sklearn -> etiqueta``.

Mientras el clasificador entrenado no este disponible, el servicio funciona en
MODO PLACEHOLDER (heuristica de patrones). Se activa el modo real en cuanto se
coloca el .pkl en ``servicio-ia/modelo/clasificador.pkl``.

Variables de entorno opcionales (para el modo real):
    RUTA_MODELO  - ruta al .pkl (por defecto: servicio-ia/modelo/clasificador.pkl)
    BETO_NOMBRE  - nombre del modelo HuggingFace (por defecto: bert-base-multilingual-cased)
    BETO_POOLING - estrategia de pooling: 'cls' o 'mean' (por defecto: cls)
    BETO_MAX_LEN - longitud maxima de tokens (por defecto: 128)
"""
from __future__ import annotations

import os
import re
import unicodedata

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
RUTA_MODELO = os.environ.get("RUTA_MODELO", os.path.join(BASE_DIR, "modelo", "clasificador.pkl"))
BETO_NOMBRE = os.environ.get("BETO_NOMBRE", "bert-base-multilingual-cased")
BETO_POOLING = os.environ.get("BETO_POOLING", "cls")   # 'cls' o 'mean'
BETO_MAX_LEN = int(os.environ.get("BETO_MAX_LEN", "128"))

PUBLICO = 0
CONFIDENCIAL = 1

_modo = "placeholder"
_clasificador = None   # clasificador sklearn cargado con joblib
_tokenizer = None      # tokenizer de BETO
_beto = None           # modelo de BETO (transformers)


# ---------------------------------------------------------------------------
# Heuristica (modo placeholder)
# ---------------------------------------------------------------------------
_PATRONES = [
    re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+"),
    re.compile(r"\b\d{8}[A-Za-z]\b"),
    re.compile(r"\b(?:\d[ -]?){13,19}\b"),
    re.compile(r"\bES\d{2}[ ]?\d{4}[\d ]{10,}", re.IGNORECASE),
]
_PALABRAS = (
    "confidencial", "contrasen", "password", "secret", "privad",
    "dni", "iban", "tarjeta", "nomina", "otp", "pasaporte",
    "numero de cuenta", "datos personales", "clave",
)


def _normalizar(texto: str) -> str:
    descompuesto = unicodedata.normalize("NFKD", texto.lower())
    return "".join(c for c in descompuesto if not unicodedata.combining(c))


# ---------------------------------------------------------------------------
# Carga del modelo
# ---------------------------------------------------------------------------

def cargar_modelo() -> None:
    """Carga el modelo real si el .pkl esta disponible; si no, modo placeholder.

    Llama a esta funcion una sola vez al arrancar el servicio (lifespan).
    """
    global _modo, _clasificador, _tokenizer, _beto

    if not os.path.exists(RUTA_MODELO):
        _modo = "placeholder"
        return

    try:
        import joblib
        import torch
        from transformers import AutoModel, AutoTokenizer

        print(f"[modelo] Cargando clasificador desde {RUTA_MODELO}...")
        _clasificador = joblib.load(RUTA_MODELO)

        print(f"[modelo] Cargando BETO ({BETO_NOMBRE})...")
        _tokenizer = AutoTokenizer.from_pretrained(BETO_NOMBRE)
        _beto = AutoModel.from_pretrained(BETO_NOMBRE)
        _beto.eval()

        _modo = "modelo"
        print(f"[modelo] Listo. Pooling={BETO_POOLING}, max_len={BETO_MAX_LEN}.")
    except Exception as exc:
        print(f"[modelo] Error al cargar el modelo real: {exc}. Usando placeholder.")
        _modo = "placeholder"


def modo() -> str:
    """Devuelve 'modelo' o 'placeholder'."""
    return _modo


# ---------------------------------------------------------------------------
# Inferencia
# ---------------------------------------------------------------------------

def _embedding(texto: str):
    """Genera el embedding BETO de 768 dimensiones para un texto."""
    import torch

    inputs = _tokenizer(
        texto,
        return_tensors="pt",
        max_length=BETO_MAX_LEN,
        truncation=True,
        padding=False,
    )
    with torch.no_grad():
        outputs = _beto(**inputs)

    hidden = outputs.last_hidden_state  # (1, seq_len, 768)

    if BETO_POOLING == "mean":
        mask = inputs["attention_mask"].unsqueeze(-1).float()
        vec = (hidden * mask).sum(dim=1) / mask.sum(dim=1)
    else:  # cls (por defecto)
        vec = hidden[:, 0, :]

    return vec.squeeze(0).numpy()


def _clasificar_modelo(texto: str) -> tuple[int, float | None]:
    import numpy as np

    emb = _embedding(texto).reshape(1, -1)

    probabilidad: float | None = None
    etiqueta = 0  # por defecto publico (0)

    if hasattr(_clasificador, "predict_proba"):
        proba = _clasificador.predict_proba(emb)[0]
        # proba[1] = probabilidad de la clase confidencial (1)
        clases = list(_clasificador.classes_)
        idx_confidencial = clases.index(1) if 1 in clases else -1

        if idx_confidencial >= 0:
            probabilidad = round(float(proba[idx_confidencial]), 4)
            # Umbral personalizado del 20% (0.2)
            if probabilidad >= 0.2:
                etiqueta = 1
            else:
                etiqueta = 0
    else:
        # Fallback si no tiene predict_proba
        etiqueta = int(_clasificador.predict(emb)[0])

    return etiqueta, probabilidad


def _clasificar_placeholder(texto: str) -> tuple[int, float]:
    normal = _normalizar(texto)
    indicios = sum(1 for patron in _PATRONES if patron.search(texto))
    indicios += sum(1 for palabra in _PALABRAS if palabra in normal)
    if indicios == 0:
        return PUBLICO, 0.05
    probabilidad = min(0.5 + 0.15 * indicios, 0.99)
    return CONFIDENCIAL, round(probabilidad, 4)


def clasificar(texto: str) -> tuple[int, float | None, str]:
    """Clasifica un texto.

    Devuelve ``(confidencialidad, probabilidad, modo)``.
    - confidencialidad: 0 (publico) o 1 (confidencial).
    - probabilidad: prob. de clase confidencial, o None si no disponible.
    - modo: 'modelo' o 'placeholder'.
    """
    if not texto or not texto.strip():
        return CONFIDENCIAL, None, _modo

    if _modo == "modelo":
        etiqueta, probabilidad = _clasificar_modelo(texto)
        return etiqueta, probabilidad, _modo
    etiqueta, probabilidad = _clasificar_placeholder(texto)
    return etiqueta, probabilidad, _modo
