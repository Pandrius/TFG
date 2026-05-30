"""Pruebas de la API del servicio (FastAPI TestClient)."""
from fastapi.testclient import TestClient

from main import app

cliente = TestClient(app)


def test_salud():
    respuesta = cliente.get("/salud")
    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["estado"] == "ok"
    assert "txt" in cuerpo["formatos_soportados"]
    assert "mp3" in cuerpo["formatos_soportados"]
    assert "mpeg" in cuerpo["formatos_soportados"]


def test_clasificar_publico():
    respuesta = cliente.post("/clasificar", json={"texto": "Receta de tarta de manzana."})
    assert respuesta.status_code == 200
    assert respuesta.json()["confidencialidad"] == 0


def test_clasificar_confidencial():
    respuesta = cliente.post("/clasificar", json={"texto": "Mi DNI es 12345678Z."})
    assert respuesta.status_code == 200
    assert respuesta.json()["confidencialidad"] == 1


def test_procesar_txt():
    archivo = ("prueba.txt", b"Documento con una contrasena secreta.", "text/plain")
    respuesta = cliente.post("/procesar", files={"archivo": archivo})
    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["confidencialidad"] == 1
    assert cuerpo["tipo_archivo"] == "txt"
    assert "secreta" in cuerpo["texto_extraido"]
    assert cuerpo["advertencias"] == []


def test_procesar_sin_texto_clasifica_privado():
    archivo = ("vacio.txt", b"   ", "text/plain")
    respuesta = cliente.post("/procesar", files={"archivo": archivo})
    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert cuerpo["confidencialidad"] == 1
    assert cuerpo["probabilidad"] == 1.0
    assert cuerpo["texto_extraido"] == ""
    assert any("No se pudo extraer texto" in aviso for aviso in cuerpo["advertencias"])


def test_procesar_formato_no_soportado():
    archivo = ("imagen.bmp", b"datos binarios", "image/bmp")
    respuesta = cliente.post("/procesar", files={"archivo": archivo})
    assert respuesta.status_code == 415
