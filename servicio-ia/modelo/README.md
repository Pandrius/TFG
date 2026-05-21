# Modelo entrenado

Aquí va el clasificador entrenado del objetivo O3, como `clasificador.pkl`
(serializado con `joblib`).

Mientras este fichero no exista, el servicio funciona en **modo placeholder**
(ver `../modelo.py`). La integración del modelo real es el Hito 9.

La ruta se puede cambiar con la variable de entorno `RUTA_MODELO`.

> Los ficheros `.pkl` están excluidos del control de versiones (`.gitignore`);
> el modelo se entrega aparte.
