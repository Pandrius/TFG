---
title: TFG IA Servicio
emoji: 🛡️
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# Servicio de IA — Clasificación de Documentos (TFG)

Este microservicio forma parte de un Trabajo Fin de Grado centrado en la gestión documental segura. 

## Funcionalidades
- **Extracción de texto:** Soporta PDF, DOCX, TXT, XLSX, CSV, PPTX, HTML, JSON, XML y ZIP (vía Microsoft MarkItDown).
- **Embeddings:** Generados mediante el modelo `bert-base-multilingual-cased` (alineado con la fase de entrenamiento).
- **Clasificación:** Identificación de documentos confidenciales mediante Regresión Logística con umbral optimizado (20%).

## API
El servicio expone un endpoint principal en `/procesar` que recibe un archivo y devuelve la clasificación y la probabilidad.
