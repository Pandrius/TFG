"""Clasificación de documentos: público (0) / confidencial (1).

Pipeline previsto (objetivo O3): ``texto -> embedding BETO (768-d) -> clasificador
scikit-learn -> etiqueta``. Mientras el modelo entrenado no esté disponible, este
módulo funciona en MODO PLACEHOLDER: una heurística basada en patrones de datos
sensibles. NO es el modelo del TFG; se sustituye por el modelo real en el Hito 9
(ver implementation-notes.md). El contrato de ``clasificar()`` no cambiará.
"""
from __future__ import annotations

import os
import re
import unicodedata

# Ruta del clasificador sklearn entrenado (.pkl de joblib). Si el fichero no
# existe, el servicio arranca en modo placeholder.
RUTA_MODELO = os.environ.get("RUTA_MODELO", os.path.join("modelo", "clasificador.pkl"))

PUBLICO = 0
CONFIDENCIAL = 1

_modo = "placeholder"
_clasificador = None  # se rellena al cargar el modelo real


# --- Heurística del modo placeholder ----------------------------------------
# Patrones de información personal/sensible. Es solo un sustituto temporal para
# poder desarrollar el resto de la plataforma; NO es el modelo del TFG.
_PATRONES = [
    re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+"),                    # correos
    re.compile(r"\b\d{8}[A-Za-z]\b"),                            # DNI español
    re.compile(r"\b(?:\d[ -]?){13,19}\b"),                       # tarjetas/cuentas
    re.compile(r"\bES\d{2}[ ]?\d{4}[\d ]{10,}", re.IGNORECASE),  # IBAN español
]
# Raíces de palabras (sin acentos) que sugieren contenido sensible. Se buscan
# como subcadena sobre el texto normalizado, de modo que "contrasena" y
# "contraseña", o "secreto"/"secreta", se detectan por igual.
_PALABRAS = (
    "confidencial", "contrasen", "password", "secret", "privad",
    "dni", "iban", "tarjeta", "nomina", "otp", "pasaporte",
    "numero de cuenta", "datos personales", "clave",
)


def _normalizar(texto: str) -> str:
    """Pasa a minúsculas y elimina acentos, para comparar de forma robusta."""
    descompuesto = unicodedata.normalize("NFKD", texto.lower())
    return "".join(c for c in descompuesto if not unicodedata.combining(c))


def cargar_modelo() -> None:
    """Carga el modelo real si está disponible; si no, modo placeholder.

    Debe llamarse una sola vez al arrancar el servicio.
    """
    global _modo, _clasificador
    if os.path.exists(RUTA_MODELO):
        try:
            import joblib

            _clasificador = joblib.load(RUTA_MODELO)
            _modo = "modelo"
            return
        except Exception as e:  # noqa: BLE001
            print(f"[modelo] No se pudo cargar {RUTA_MODELO}: {e}. Uso placeholder.")
    _modo = "placeholder"


def modo() -> str:
    """Devuelve 'modelo' (modelo real cargado) o 'placeholder'."""
    return _modo


def _clasificar_placeholder(texto: str) -> tuple[int, float]:
    normal = _normalizar(texto)
    indicios = sum(1 for patron in _PATRONES if patron.search(texto))
    indicios += sum(1 for palabra in _PALABRAS if palabra in normal)
    if indicios == 0:
        return PUBLICO, 0.05
    # La probabilidad crece con el número de indicios, acotada a 0.99.
    probabilidad = min(0.5 + 0.15 * indicios, 0.99)
    return CONFIDENCIAL, round(probabilidad, 4)


def _clasificar_modelo(texto: str) -> tuple[int, float | None]:
    # Hito 9: texto -> embedding BETO -> _clasificador.predict / predict_proba.
    raise NotImplementedError(
        "La inferencia con el modelo real se implementa en el Hito 9."
    )


def clasificar(texto: str) -> tuple[int, float | None, str]:
    """Clasifica un texto.

    Devuelve ``(confidencialidad, probabilidad, modo)``: confidencialidad es 0
    (público) o 1 (confidencial); probabilidad es la prob. de la clase 1 (puede
    ser ``None``); modo es 'modelo' o 'placeholder'.
    """
    if not texto or not texto.strip():
        # Sin texto extraíble (p. ej. PDF escaneado): por precaución, confidencial.
        return CONFIDENCIAL, None, _modo
    if _modo == "modelo":
        etiqueta, probabilidad = _clasificar_modelo(texto)
        return etiqueta, probabilidad, _modo
    etiqueta, probabilidad = _clasificar_placeholder(texto)
    return etiqueta, probabilidad, _modo
