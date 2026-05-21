# Servicio de IA

Servicio FastAPI que **extrae texto** de documentos multiformato y los **clasifica**
como público (0) o confidencial (1). Cubre los puntos 1 y 2 del objetivo O4.

## Estado del modelo

Funciona en **modo placeholder** (heurística de detección de datos sensibles) hasta
integrar el modelo real entrenado (`texto → embedding BETO → clasificador sklearn`)
en el Hito 9. El contrato de la API no cambiará al integrarlo.

## Formatos soportados

`.pdf`, `.docx`, `.txt`, `.csv`, `.xlsx`, `.pptx`

## Puesta en marcha

```bash
cd servicio-ia
pip install -r requirements.txt
uvicorn main:app --reload
```

Servicio en `http://localhost:8000`; documentación interactiva en `/docs`.

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET  | `/salud`      | Estado del servicio y formatos soportados. |
| POST | `/procesar`   | Sube un archivo (`multipart`, campo `archivo`): extrae texto y clasifica. |
| POST | `/clasificar` | Clasifica un texto ya extraído (JSON `{"texto": "..."}`). |

## Pruebas

```bash
cd servicio-ia
pytest
```
