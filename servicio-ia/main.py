"""Servicio de IA — extracción de texto y clasificación de documentos.

Cubre los puntos 1 y 2 del objetivo O4: extraer texto en tiempo real de
documentos multiformato y clasificarlos como público / confidencial.
"""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, File, HTTPException, UploadFile
from pydantic import BaseModel

import modelo as ia
from extraccion import FORMATOS_SOPORTADOS, FormatoNoSoportado, extraer_texto

# Tamaño máximo de archivo aceptado (10 MB).
MAX_BYTES = 10 * 1024 * 1024


@asynccontextmanager
async def ciclo_vida(app: FastAPI):
    # El modelo se carga una sola vez al arrancar el servicio.
    ia.cargar_modelo()
    yield


app = FastAPI(
    title="Servicio de IA — TFG gestión documental",
    description="Extracción de texto multiformato y clasificación público/confidencial.",
    version="0.1.0",
    lifespan=ciclo_vida,
)


class RespuestaProcesar(BaseModel):
    texto_extraido: str
    confidencialidad: int
    probabilidad: float | None
    tipo_archivo: str
    num_caracteres: int
    truncado: bool
    modo_modelo: str
    advertencias: list[str] = []


class PeticionClasificar(BaseModel):
    texto: str


class RespuestaClasificar(BaseModel):
    confidencialidad: int
    probabilidad: float | None
    modo_modelo: str
    advertencias: list[str] = []


@app.get("/salud")
def salud() -> dict:
    """Estado del servicio y formatos soportados."""
    return {
        "estado": "ok",
        "modo_modelo": ia.modo(),
        "formatos_soportados": FORMATOS_SOPORTADOS,
    }


@app.post("/procesar", response_model=RespuestaProcesar)
async def procesar(archivo: UploadFile = File(...)) -> RespuestaProcesar:
    """Recibe un documento, extrae su texto y lo clasifica."""
    datos = await archivo.read()
    if len(datos) == 0:
        raise HTTPException(status_code=400, detail="El archivo está vacío.")
    if len(datos) > MAX_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"El archivo supera el límite de {MAX_BYTES // (1024 * 1024)} MB.",
        )
    nombre_archivo = archivo.filename or ""
    try:
        texto, tipo, truncado, advertencias = extraer_texto(nombre_archivo, datos)
    except FormatoNoSoportado as e:
        raise HTTPException(status_code=415, detail=str(e))
    except Exception as e:  # noqa: BLE001
        texto = ""
        tipo = nombre_archivo.rsplit(".", 1)[-1].lower() if "." in nombre_archivo else ""
        truncado = False
        advertencias = [
            f"No se pudo extraer el texto ({e}). Clasificado como privado por seguridad."
        ]

    if not texto or not texto.strip():
        advertencias.append("No se pudo extraer texto. Clasificado como privado por seguridad.")

    confidencialidad, probabilidad, modo = ia.clasificar(texto)
    return RespuestaProcesar(
        texto_extraido=texto,
        confidencialidad=confidencialidad,
        probabilidad=probabilidad,
        tipo_archivo=tipo,
        num_caracteres=len(texto),
        truncado=truncado,
        modo_modelo=modo,
        advertencias=advertencias,
    )


@app.post("/clasificar", response_model=RespuestaClasificar)
def clasificar(peticion: PeticionClasificar) -> RespuestaClasificar:
    """Clasifica un texto ya extraído (para pruebas o reclasificación)."""
    confidencialidad, probabilidad, modo = ia.clasificar(peticion.texto)
    return RespuestaClasificar(
        confidencialidad=confidencialidad,
        probabilidad=probabilidad,
        modo_modelo=modo,
    )
