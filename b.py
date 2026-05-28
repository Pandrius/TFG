import pandas as pd
from datasets import load_dataset

def crear_dataset_final_unificado(n_objetivo_privados=41523):
    datasets_publicos = []
    datasets_privados = []

    # ==========================================
    # 1. DATOS PRIVADOS (Etiqueta 1) - ai4privacy
    # ==========================================
    print("⏳ Cargando ai4privacy (Privados - Etiqueta 1)...")
    try:
        ds_priv = load_dataset("ai4privacy/pii-masking-400k", split='train+validation')
        df_priv = ds_priv.filter(lambda x: x["language"] == "es").to_pandas()
        
        # Renombramos la columna de origen a 'texto'
        df_priv = df_priv[['source_text']].rename(columns={'source_text': 'texto'})
        
        # Tomamos la muestra
        df_priv = df_priv.sample(n=min(len(df_priv), n_objetivo_privados), random_state=42)
        df_priv['label'] = 1
        datasets_privados.append(df_priv)
        print(f"✅ Privados listos: {len(df_priv)} filas.")
    except Exception as e:
        print(f"❌ Error en ai4privacy: {e}")

    # ==========================================
    # 2. DATOS PÚBLICOS (Etiqueta 0) - Varios Archivos
    # ==========================================
    print("\n⏳ Procesando fuentes de datos PÚBLICOS...")
    
    # Lista de tus rutas locales
    rutas_publicas = [
        r"C:\Users\prestamo\Documents\GitHub\TFG\data.csv",
        r"C:\Users\prestamo\Documents\GitHub\TFG\train.csv",
        r"C:\Users\prestamo\Documents\GitHub\TFG\test.csv"
    ]
    
    for ruta in rutas_publicas:
        try:
            df_temp = pd.read_csv(ruta)
            
            # CORRECCIÓN DE COLUMNAS: 
            # Si se llama 'text', la renombramos a 'texto'. Si ya se llama 'texto', la dejamos.
            if 'text' in df_temp.columns:
                df_temp = df_temp.rename(columns={'text': 'texto'})
            
            # Nos aseguramos de quedarnos solo con la columna 'texto' y añadir la etiqueta
            if 'texto' in df_temp.columns:
                df_temp = df_temp[['texto']].copy()
                df_temp['label'] = 0
                datasets_publicos.append(df_temp)
                print(f"✅ Procesado con éxito: {ruta.split('\\')[-1]}")
            else:
                print(f"⚠️ Advertencia: No se encontró columna 'text' ni 'texto' en {ruta}")
                
        except Exception as e:
            print(f"❌ Error cargando {ruta}: {e}")

    # ==========================================
    # 3. UNIÓN Y LIMPIEZA DE PÚBLICOS (Duplicados)
    # ==========================================
    if datasets_publicos:
        df_pub_total = pd.concat(datasets_publicos, axis=0, ignore_index=True)
        
        # Eliminamos duplicados antes de juntar con privados
        antes = len(df_pub_total)
        df_pub_total = df_pub_total.drop_duplicates(subset=['texto'], keep='first')
        print(f"🧹 Limpieza: Se eliminaron {antes - len(df_pub_total)} registros repetidos en datos públicos.")
    else:
        df_pub_total = pd.DataFrame()

    # ==========================================
    # 4. ENSAMBLAJE FINAL
    # ==========================================
    print("\n⏳ Generando archivo final...")
    df_priv_total = pd.concat(datasets_privados, axis=0, ignore_index=True) if datasets_privados else pd.DataFrame()
    
    # Unimos todo
    df_final = pd.concat([df_pub_total, df_priv_total], axis=0, ignore_index=True)
    
    # 1. Quitamos nulos (filas vacías)
    df_final = df_final.dropna(subset=['texto'])
    
    # 2. Mezclamos (Shuffle) para que el entrenamiento sea correcto
    df_final = df_final.sample(frac=1, random_state=42).reset_index(drop=True)
    
    # 3. Guardamos
    ruta_salida = r"C:\Users\prestamo\Documents\GitHub\TFG\dataset_final_tfg.csv"
    df_final.to_csv(ruta_salida, index=False, encoding='utf-8')
    
    print("-" * 30)
    print(f"🚀 DATASET CREADO: {ruta_salida}")
    print(f"📊 Conteo por etiquetas:")
    print(df_final['label'].value_counts())
    print(f"🔝 Total registros: {len(df_final)}")
    print("-" * 30)

# Ejecutar proceso
crear_dataset_final_unificado()