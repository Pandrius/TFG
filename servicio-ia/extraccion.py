"""Extraccion estructurada de texto mediante Microsoft MarkItDown.

Este modulo utiliza MarkItDown para convertir documentos a formato Markdown,
preservando la jerarquia y estructura del contenido original.
"""
from __future__ import annotations

import os
import tempfile
import threading
from markitdown import MarkItDown

# Tope de caracteres que se conservan para la clasificacion.
MAX_CARACTERES = 100_000

class FormatoNoSoportado(Exception):
    """El formato del archivo no tiene un extractor disponible."""

# Extensiones que MarkItDown maneja nativamente de forma robusta.
FORMATOS_SOPORTADOS = [
    "pdf", "docx", "xlsx", "pptx", "csv", "txt",
    "html", "json", "xml", "zip",
    "wav", "mp3", "mpeg", "m4a", "mp4", "aiff", "flac"
]

FORMATOS_AUDIO = {"wav", "mp3", "mpeg", "m4a", "mp4", "aiff", "flac"}

_whisper_lock = threading.Lock()
_whisper_model = None


def _obtener_whisper():
    """Carga Whisper una sola vez. Es opcional para no romper formatos no audio."""
    global _whisper_model
    if _whisper_model is not None:
        return _whisper_model

    try:
        from faster_whisper import WhisperModel
    except ImportError:
        return None

    with _whisper_lock:
        if _whisper_model is None:
            nombre_modelo = os.environ.get("WHISPER_MODEL", "tiny")
            compute_type = os.environ.get("WHISPER_COMPUTE_TYPE", "int8")
            _whisper_model = WhisperModel(
                nombre_modelo,
                device="cpu",
                compute_type=compute_type,
            )
    return _whisper_model


def _transcribir_audio_whisper(ruta: str) -> str:
    modelo = _obtener_whisper()
    if modelo is None:
        return ""

    idioma = os.environ.get("WHISPER_LANGUAGE", "es")
    segmentos, _info = modelo.transcribe(
        ruta,
        language=idioma,
        vad_filter=True,
        beam_size=1,
    )
    return " ".join(segmento.text.strip() for segmento in segmentos).strip()

def extraer_texto(nombre_archivo: str, datos: bytes) -> tuple[str, str, bool, list[str]]:
    """Extrae el texto de un documento convirtiendolo a Markdown.

    Devuelve ``(texto, tipo_archivo, truncado, advertencias)``.
    """
    extension = ""
    advertencias = []
    if "." in nombre_archivo:
        extension = nombre_archivo.rsplit(".", 1)[-1].lower()
    if extension not in FORMATOS_SOPORTADOS:
        raise FormatoNoSoportado(f"Formato '.{extension}' no soportado.")

    try:
        md = MarkItDown()

        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{extension}") as tmp:
            tmp.write(datos)
            tmp_path = tmp.name

        try:
            texto = ""
            if extension in FORMATOS_AUDIO:
                try:
                    texto = _transcribir_audio_whisper(tmp_path)
                except Exception as e:  # noqa: BLE001
                    advertencias.append(f"Whisper no pudo transcribir el audio: {e}.")

            if not texto:
                resultado = md.convert(tmp_path)
                texto = (resultado.text_content or "").strip()

            if extension == "zip" and not texto:
                advertencias.append("No se encontro contenido procesable dentro del archivo ZIP.")
            if extension in FORMATOS_AUDIO and not texto:
                advertencias.append("No se detecto voz transcribible en el archivo de audio.")

        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

        if not texto and extension in ["pdf", "docx", "pptx"]:
            advertencias.append(f"El archivo .{extension} parece estar vacio o protegido.")

        truncado = len(texto) > MAX_CARACTERES
        if truncado:
            texto = texto[:MAX_CARACTERES]

        return texto, extension, truncado, advertencias

    except Exception as e:
        if "not supported" in str(e).lower():
            raise FormatoNoSoportado(f"Formato '.{extension}' no soportado.")
        raise Exception(f"Error en la extraccion: {str(e)}")
