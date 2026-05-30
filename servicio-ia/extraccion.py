"""Extraccion estructurada de texto mediante Microsoft MarkItDown.

Este modulo utiliza MarkItDown para convertir documentos a formato Markdown,
preservando la jerarquia y estructura del contenido original.
"""
from __future__ import annotations

import os
import tempfile
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
