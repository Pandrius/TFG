# Usar una imagen base oficial de Python optimizada para ML
FROM python:3.10-slim

# Evitar que Python genere archivos .pyc y permitir logs en tiempo real
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Instalar dependencias del sistema necesarias para algunas librerías de ML y extracción
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Crear y establecer el directorio de trabajo
WORKDIR /app

# Copiar requirements e instalar dependencias de Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código del servicio
COPY . .

# Exponer el puerto que usa FastAPI
EXPOSE 7860

# Comando para ejecutar la aplicación (HF Spaces espera que escuche en el puerto 7860)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
