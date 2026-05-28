import pandas as pd
from datasets import load_dataset
import emoji

def crear_dataset_balanceado_tfg():
    # --- CONFIGURACIÓN DE RUTAS ---
    ruta_privado = "ai4privacy/pii-masking-400k"
    rutas_publicas = [
        r"C:\Users\prestamo\Documents\GitHub\TFG\data.csv",
        r"C:\Users\prestamo\Documents\GitHub\TFG\train.csv",
        r"C:\Users\prestamo\Documents\GitHub\TFG\test.csv",
        r"C:\Users\prestamo\Documents\GitHub\TFG\sentiment_analysis_dataset.csv"
    ]
    ruta_salida = r"C:\Users\prestamo\Documents\GitHub\TFG\dataset_final_tfg.csv"

    # 1. CARGAR DATOS PRIVADOS (Etiqueta 1)
    print("--- FASE 1: DATOS PRIVADOS ---")
    try:
        ds_priv = load_dataset(ruta_privado, split='train+validation')
        df_priv = ds_priv.filter(lambda x: x["language"] == "es").to_pandas()
        df_priv = df_priv[['source_text']].rename(columns={'source_text': 'texto'})
        df_priv['label'] = 1
        
        n_objetivo = len(df_priv)
        print(f"✅ Dataset AI4Privacy: {n_objetivo} registros (Clase 1)")
    except Exception as e:
        print(f"❌ Error cargando privados: {e}")
        return

    # 2. CARGAR Y LIMPIAR DATOS PÚBLICOS (Etiqueta 0)
    print("\n--- FASE 2: DATOS PÚBLICOS (EXTRACCIÓN Y LIMPIEZA) ---")
    list_pub = []
    
    for ruta in rutas_publicas:
        nombre_archivo = ruta.split('\\')[-1]
        try:
            df_temp = pd.read_csv(ruta)
            
            # Normalizar nombre de columna
            if 'text' in df_temp.columns:
                df_temp = df_temp.rename(columns={'text': 'texto'})
            
            if 'texto' in df_temp.columns:
                filas_originales = len(df_temp)
                
                # Limpieza de Emojis
                df_temp['texto'] = df_temp['texto'].apply(lambda x: emoji.replace_emoji(str(x), replace=''))
                
                # Quitar filas vacías tras limpieza
                df_temp = df_temp[df_temp['texto'].str.strip() != ""].copy()
                df_temp['label'] = 0
                
                list_pub.append(df_temp)
                print(f"✅ {nombre_archivo}: {len(df_temp)} registros (de {filas_originales} originales tras quitar emojis)")
            else:
                print(f"⚠️ {nombre_archivo}: No se encontró columna 'text' o 'texto'.")
        except Exception as e:
            print(f"❌ Error en {nombre_archivo}: {e}")

    # 3. UNIÓN Y BALANCEO
    print("\n--- FASE 3: BALANCEO Y CONSOLIDACIÓN ---")
    df_pub_total = pd.concat(list_pub, ignore_index=True)
    
    # Quitar duplicados entre todos los públicos
    antes_dup = len(df_pub_total)
    df_pub_total = df_pub_total.drop_duplicates(subset=['texto'])
    print(f"🧹 Registros públicos únicos totales: {len(df_pub_total)} (se eliminaron {antes_dup - len(df_pub_total)} duplicados)")
    
    # Recorte para balancear 50/50
    if len(df_pub_total) > n_objetivo:
        df_pub_total = df_pub_total.sample(n=n_objetivo, random_state=42)
        print(f"⚖️ Balanceo: Se seleccionaron aleatoriamente {n_objetivo} públicos para igualar a los privados.")
    else:
        print(f"⚠️ Balanceo: Solo hay {len(df_pub_total)} públicos. El dataset tendrá más privados que públicos.")

    # 4. MEZCLA FINAL Y GUARDADO
    df_final = pd.concat([df_priv, df_pub_total], ignore_index=True)
    df_final = df_final.sample(frac=1, random_state=42).reset_index(drop=True)
    
    df_final.to_csv(ruta_salida, index=False, encoding='utf-8')
    
    print("\n" + "="*40)
    print(f"🚀 PROCESO COMPLETADO CON ÉXITO")
    print(f"📊 CONTEO FINAL POR CLASE:")
    print(df_final['label'].value_counts().rename({0: 'Público (0)', 1: 'Privado (1)'}))
    print(f"📦 Total registros en CSV final: {len(df_final)}")
    print(f"📍 Ruta: {ruta_salida}")
    print("="*40)

# Ejecutar
crear_dataset_balanceado_tfg()