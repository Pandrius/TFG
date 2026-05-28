import pandas as pd
from datasets import load_dataset
import emoji

def crear_dataset_balanceado_tfg():
    datasets_publicos = []

    # --- 1. CARGAR DATOS PRIVADOS (Etiqueta 1) ---
    print("⏳ Cargando datos PRIVADOS (ai4privacy)...")
    ds_priv = load_dataset("ai4privacy/pii-masking-400k", split='train+validation')
    df_priv = ds_priv.filter(lambda x: x["language"] == "es").to_pandas()
    df_priv = df_priv[['source_text']].rename(columns={'source_text': 'texto'})
    df_priv['label'] = 1
    n_objetivo = len(df_priv)
    print(f"✅ Total Privados: {n_objetivo}")

    # --- 2. CARGAR TWEETS EXTRA (Para llegar al cupo) ---
    print(f"⏳ Descargando ~50k tweets adicionales para completar...")
    try:
        # Este dataset es masivo y en español
        ds_extra = load_dataset("pablomesas/sentiment_analysis_spanish", split='train')
        df_extra = ds_extra.to_pandas()
        # En este dataset la columna se llama 'text'
        df_extra = df_extra[['text']].rename(columns={'text': 'texto'})
        df_extra['label'] = 0
        datasets_publicos.append(df_extra)
        print(f"✅ Tweets extra cargados: {len(df_extra)} registros.")
    except Exception as e:
        print(f"⚠️ No se pudo cargar el dataset extra: {e}")

    # --- 3. CARGAR TUS CSV LOCALES ---
    rutas_locales = [
        r"C:\Users\prestamo\Documents\GitHub\TFG\data.csv",
        r"C:\Users\prestamo\Documents\GitHub\TFG\train.csv",
        r"C:\Users\prestamo\Documents\GitHub\TFG\test.csv",
        r"C:\Users\prestamo\Documents\GitHub\TFG\sentiment_analysis_dataset.csv"
    ]
    
    for ruta in rutas_locales:
        try:
            df_temp = pd.read_csv(ruta)
            col = 'text' if 'text' in df_temp.columns else 'texto'
            if col in df_temp.columns:
                df_temp = df_temp[[col]].rename(columns={col: 'texto'})
                df_temp['label'] = 0
                datasets_publicos.append(df_temp)
                print(f"✅ Local {ruta.split('\\')[-1]}: {len(df_temp)} registros.")
        except: continue

    # --- 4. LIMPIEZA Y BALANCEO ---
    df_pub_total = pd.concat(datasets_publicos, ignore_index=True)
    
    # Limpiar emojis (importante en tweets)
    print("🧹 Eliminando emojis...")
    df_pub_total['texto'] = df_pub_total['texto'].apply(lambda x: emoji.replace_emoji(str(x), replace=''))
    
    # Quitar duplicados y vacíos
    df_pub_total = df_pub_total.drop_duplicates(subset=['texto'])
    df_pub_total = df_pub_total[df_pub_total['texto'].str.strip() != ""]

    print(f"📊 Públicos únicos disponibles: {len(df_pub_total)}")

    # Recortar para balancear 50/50 con los privados
    if len(df_pub_total) > n_objetivo:
        df_pub_total = df_pub_total.sample(n=n_objetivo, random_state=42)
        print(f"⚖️ Balanceo: Seleccionados {n_objetivo} públicos.")

    # --- 5. FINAL ---
    df_final = pd.concat([df_priv, df_pub_total], ignore_index=True)
    df_final = df_final.sample(frac=1, random_state=42).reset_index(drop=True)
    
    ruta_salida = r"C:\Users\prestamo\Documents\GitHub\TFG\dataset_final_tfg.csv"
    df_final.to_csv(ruta_salida, index=False, encoding='utf-8')
    print(f"🚀 LISTO. Dataset guardado con {len(df_final)} registros totales.")

crear_dataset_balanceado_tfg()