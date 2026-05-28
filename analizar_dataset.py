import pandas as pd
import os

def analizar_mi_dataset(ruta_csv):
    print(f"🔍 Iniciando análisis del archivo: {ruta_csv}")
    
    if not os.path.exists(ruta_csv):
        print(f"❌ ERROR: No se encuentra el archivo en la ruta especificada.")
        return

    try:
        # 1. Cargar el dataset
        df = pd.read_csv(ruta_csv)
        
        # 2. Preparar el informe
        informe = []
        informe.append("="*50)
        informe.append("ESTADÍSTICAS DEL DATASET PARA TFG")
        informe.append("="*50)

        # 3. Balanceo de Clases
        conteo = df['confidencialidad'].value_counts()
        total = len(df)
        informe.append(f"\n[1] BALANCEO DE CLASES")
        informe.append(f"Total de registros: {total}")
        for clase, num in conteo.items():
            label = "Confidencial (1)" if clase == 1 else "Público (0)"
            informe.append(f"- {label}: {num} filas ({ (num/total)*100 :.2f}%)")

        # 4. Análisis de Texto
        df['longitud'] = df['texto'].astype(str).apply(len)
        informe.append(f"\n[2] ANÁLISIS DE LONGITUD (Caracteres)")
        stats = df.groupby('confidencialidad')['longitud'].agg(['mean', 'min', 'max']).round(2)
        informe.append(f"Media de caracteres (Público): {stats.loc[0, 'mean']}")
        informe.append(f"Media de caracteres (Confidencial): {stats.loc[1, 'mean']}")
        informe.append(f"Documento más largo: {df['longitud'].max()} caracteres")

        # 5. Muestras para la memoria
        informe.append(f"\n[3] MUESTRAS ALEATORIAS PARA AUDITORÍA")
        for clase in [1, 0]:
            tipo = "CONFIDENCIAL" if clase == 1 else "PÚBLICO"
            ejemplo = df[df['confidencialidad'] == clase].sample(1)['texto'].values[0]
            informe.append(f"\n--- Ejemplo {tipo} ---")
            informe.append(ejemplo[:500] + "...") # Primeros 500 caracteres

        # Mostrar en pantalla
        texto_final = "\n".join(informe)
        print(texto_final)

        # Guardar en un archivo TXT para la memoria del TFG
        with open("informe_dataset_tfg.txt", "w", encoding="utf-8") as f:
            f.write(texto_final)
        print(f"\nAnálisis completado. Se ha guardado un informe en: 'informe_dataset_tfg.txt'")

    except Exception as e:
        print(f"Error al procesar el dataset: {e}")

if __name__ == "__main__":
    # Ruta específica de tu proyecto
    ruta_al_dataset = r"C:\Users\prestamo\Documents\GitHub\TFG\dataset_final.csv"
    
    analizar_mi_dataset(ruta_al_dataset)