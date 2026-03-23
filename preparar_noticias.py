import pandas as pd
from datasets import load_dataset, concatenate_datasets
import os

def preparar_dataset_tfg(ruta_kaggle):
    # 1. Dataset Hugging Face

    try:
        dataset_dict = load_dataset("ai4privacy/pii-masking-400k")
        ds_all = concatenate_datasets([dataset_dict['train'], dataset_dict['validation']])
        hf_es = ds_all.filter(lambda x: x["language"] == "es")
        
        df_confidencial = hf_es.to_pandas()
        df_confidencial = df_confidencial[['source_text']].rename(columns={'source_text': 'texto'})
        df_confidencial['confidencialidad'] = 1
        print(f"Dataset Hugging Face: {len(df_confidencial)} filas.")
    except Exception as e:
        print(f"Error en Dataset Hugging Face: {e}")
        return

    # 2. Dataset Kaggle - AJUSTE DE SEPARADOR ;
    
    print("\nCargando dataset de Kaggle")
    try:
        df_publico_raw = pd.read_csv(
            ruta_kaggle, 
            sep=';', 
            on_bad_lines='skip', 
            engine='python',
            encoding='latin1'
        )

        # Limpiamos nombres de columnas de espacios y posibles errores
        df_publico_raw.columns = df_publico_raw.columns.str.strip()

        # print(f"Columnas detectadas: {list(df_publico_raw.columns)}")
      

        # Extraemos el cuerpo, quitamos nulos y renombramos
        df_publico = df_publico_raw[['cuerpo']].dropna()
        df_publico = df_publico.rename(columns={'cuerpo': 'texto'})
        
        # Filtro de seguridad: quitar filas donde el texto sea demasiado corto o vacío
        df_publico = df_publico[df_publico['texto'].str.len() > 10]
        
        df_publico['confidencialidad'] = 0
        print(f"Dataset Kaggle: {len(df_publico)} filas.")

    except Exception as e:
        print(f"Error en Dataset Kaggle: {e}")
        return

    # 3. Unión y Balanceo

    min_size = min(len(df_confidencial), len(df_publico))
    
    df_conf_bal = df_confidencial.sample(n=min_size, random_state=42)
    df_pub_bal = df_publico.sample(n=min_size, random_state=42)
    
    df_final = pd.concat([df_conf_bal, df_pub_bal]).sample(frac=1, random_state=42).reset_index(drop=True)
    
    nombre_salida = "dataset_final.csv"
    df_final.to_csv(nombre_salida, index=False, encoding='utf-8-sig')
    
    print("-" * 45)
    print(f"Registros totales: {len(df_final)} ({min_size} confidenciales / {min_size} públicos)")
    print("-" * 45)

if __name__ == "__main__":
    mi_ruta_csv = r"C:\Users\prestamo\Documents\GitHub\TFG\noticias.csv"
    preparar_dataset_tfg(mi_ruta_csv)