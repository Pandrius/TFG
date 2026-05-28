import pandas as pd
from datasets import load_dataset

def crear_dataset_limpio_tfg(n_objetivo=41523):
    # ==========================================
    # 1. DATOS PRIVADOS (Etiqueta 1) - ai4privacy
    # ==========================================
    print("⏳ Cargando datos PRIVADOS (ai4privacy - ES)...")
    try:
        # Cargamos el dataset completo
        ds_priv = load_dataset("ai4privacy/pii-masking-400k", split='train+validation')
        
        # Filtramos por español y convertimos a pandas
        df_priv = ds_priv.filter(lambda x: x["language"] == "es").to_pandas()
        
        # Seleccionamos columna, renombramos y tomamos la muestra
        df_priv = df_priv[['source_text']].rename(columns={'source_text': 'texto'})
        df_priv = df_priv.sample(n=min(len(df_priv), n_objetivo), random_state=42)
        df_priv['label'] = 1
        print(f"✅ Privados listos: {len(df_priv)} filas.")
    except Exception as e:
        print(f"❌ Error en Privados: {e}")
        return

    # ==========================================
    # 2. DATOS PÚBLICOS/SPAM (Etiqueta 0) - Local
    # ==========================================
    print("⏳ Cargando datos PÚBLICOS (CSV local)...")
    ruta_local = r"C:\Users\prestamo\Documents\GitHub\TFG\data.csv"
    try:
        df_pub = pd.read_csv(ruta_local)
        
        # Aseguramos que solo tenemos la columna 'texto'
        # (Ajusta el nombre ['texto'] si en tu CSV original se llama distinto)
        df_pub = df_pub[['text']].copy()
        df_pub['label'] = 0
        print(f"✅ Públicos listos: {len(df_pub)} filas.")
    except Exception as e:
        print(f"❌ Error en Públicos local: {e}")
        return

    # ==========================================
    # 3. UNIÓN Y MEZCLA
    # ==========================================
    print("⏳ Combinando datasets...")
    df_final = pd.concat([df_priv, df_pub], axis=0, ignore_index=True)
    
    # Mezclamos aleatoriamente para que no estén ordenados por etiqueta
    df_final = df_final.sample(frac=1, random_state=42).reset_index(drop=True)
    
    # Guardar el resultado
    ruta_guardado = r"C:\Users\prestamo\Documents\GitHub\TFG\dataset_final_tfg.csv"
    df_final.to_csv(ruta_guardado, index=False, encoding='utf-8')
    
    print(f"\n🚀 PROCESO COMPLETADO")
    print(f"📍 Archivo guardado en: {ruta_guardado}")
    print(f"📊 Total de registros: {len(df_final)}")
    print(df_final['label'].value_counts()) # Muestra cuántos hay de cada clase

# Ejecutar la función
crear_dataset_limpio_tfg()