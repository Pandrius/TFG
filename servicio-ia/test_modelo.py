"""Pruebas del clasificador (modo placeholder)."""
from modelo import CONFIDENCIAL, PUBLICO, clasificar


def test_texto_publico():
    etiqueta, _prob, modo = clasificar("Receta de tarta de manzana para el fin de semana.")
    assert etiqueta == PUBLICO
    assert modo == "placeholder"


def test_texto_confidencial():
    etiqueta, prob, _modo = clasificar("Mi DNI es 12345678Z y mi contraseña es secreta.")
    assert etiqueta == CONFIDENCIAL
    assert prob is not None and prob > 0.5


def test_texto_vacio_es_confidencial():
    # Sin texto extraíble se clasifica como confidencial por precaución.
    etiqueta, _prob, _modo = clasificar("")
    assert etiqueta == CONFIDENCIAL
