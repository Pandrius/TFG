import pandas as pd
from datasets import load_dataset
import emoji
import re
import os

# ==========================================
# 1. FUNCIONES DE APOYO
# ==========================================

def filtrar_datos_sensibles(df):
    """Detecta teléfonos y correos. Si encuentra, marca como Privado (1)."""
    # Regex España: 9 dígitos empezando por 6,7,8,9 + prefijos opcionales
    patron_tel = r'(?:(?:\+|00)34[- ]?)?([6789]\d{2}[- ]?\d{3}[- ]?\d{3})'
    # Regex Email estándar
    patron_email = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
    
    tiene_tel = df['texto'].str.contains(patron_tel, regex=True, na=False)
    tiene_email = df['texto'].str.contains(patron_email, regex=True, na=False)
    
    es_sensible = tiene_tel | tiene_email
    cantidad_detectada = es_sensible.sum()
    
    # Reclasificar a etiqueta 1
    df.loc[es_sensible, 'label'] = 1
    return df, cantidad_detectada

def auditar_longitudes(df_priv, df_pub):
    """Analiza si hay sesgo de longitud entre las clases."""
    print("\n" + "="*45)
    print("📊 AUDITORÍA DE LONGITUDES (Palabras)")
    stats = []
    for nombre, df in [("Privados (1)", df_priv), ("Públicos (0)", df_pub)]:
        textos = df['texto'].astype(str)
        long_palabras = textos.str.split().str.len()
        stats.append({
            "Grupo": nombre,
            "Total": len(df),
            "Media": round(long_palabras.mean(), 2),
            "Máximo": long_palabras.max()
        })
    
    df_stats = pd.DataFrame(stats)
    print(df_stats.to_string(index=False))
    
    diff = abs(stats[0]["Media"] - stats[1]["Media"])
    if diff > 15:
        print(f"\n⚠️ SESGO DETECTADO: Diferencia de {round(diff,2)} palabras.")
    else:
        print(f"\n✅ LONGITUD BALANCEADA: Diferencia de {round(diff,2)} palabras.")
    print("="*45)

# ==========================================
# 2. PROCESO PRINCIPAL
# ==========================================

def crear_dataset_tfg_final():
    ruta_salida = r"C:\Users\prestamo\Documents\GitHub\TFG\dataset_final_tfg.csv"
    datasets_publicos = []

    # --- FASE 1: CARGAR PRIVADOS (AI4Privacy) ---
    print("⏳ Cargando base privada (ai4privacy)...")
    try:
        ds_priv = load_dataset("ai4privacy/pii-masking-400k", split='train+validation')
        df_priv_base = ds_priv.filter(lambda x: x["language"] == "es").to_pandas()
        df_priv_base = df_priv_base[['source_text']].rename(columns={'source_text': 'texto'})
        df_priv_base['label'] = 1
        print(f"✅ Privados iniciales: {len(df_priv_base)}")
    except Exception as e:
        print(f"❌ Error crítico en AI4Privacy: {e}"); return

    # --- FASE 2: CARGAR PÚBLICOS (HuggingFace + Locales) ---
    print("\n⏳ Recolectando datos públicos...")
    
    # Fuente A: Tweets (50k registros)
    try:
        ds_tw = load_dataset("pablomesas/sentiment_analysis_spanish", split='train')
        df_tw = ds_tw.to_pandas()[['text']].rename(columns={'text': 'texto'})
        df_tw['label'] = 0
        datasets_publicos.append(df_tw)
        print("   + 50k Tweets de HuggingFace añadidos.")
    except: print("   ⚠️ Fallo en dataset 'pablomesas'")

    # Fuente B: Tus archivos locales
    rutas_locales = [
        r"C:\Users\prestamo\Documents\GitHub\TFG\data.csv",
        r"C:\Users\prestamo\Documents\GitHub\TFG\train.csv",
        r"C:\Users\prestamo\Documents\GitHub\TFG\test.csv",
        r"C:\Users\prestamo\Documents\GitHub\TFG\sentiment_analysis_dataset.csv"
    ]
    for ruta in rutas_locales:
        if os.path.exists(ruta):
            try:
                df_l = pd.read_csv(ruta)
                col = 'text' if 'text' in df_l.columns else 'texto'
                if col in df_l.columns:
                    df_l = df_l[[col]].rename(columns={col: 'texto'})
                    df_l['label'] = 0
                    datasets_publicos.append(df_l)
                    print(f"   + Local {os.path.basename(ruta)}: {len(df_l)} filas.")
            except: continue

    # --- FASE 3: LIMPIEZA Y RECLASIFICACIÓN ---
    df_pub_bruto = pd.concat(datasets_publicos, ignore_index=True)
    
    print("\n🧹 Limpiando emojis y duplicados...")
    df_pub_bruto['texto'] = df_pub_bruto['texto'].apply(lambda x: emoji.replace_emoji(str(x), replace=''))
    df_pub_bruto = df_pub_bruto.drop_duplicates(subset=['texto']).dropna()

    print("🔍 Buscando PII (Teléfonos/Emails) en datos públicos...")
    df_pub_bruto, n_movidos = filtrar_datos_sensibles(df_pub_bruto)
    
    # Separar reclasificados
    df_nuevos_privados = df_pub_bruto[df_pub_bruto['label'] == 1]
    df_publicos_limpios = df_pub_bruto[df_pub_bruto['label'] == 0]
    
    # Unir todos los privados finales
    df_priv_final = pd.concat([df_priv_base, df_nuevos_privados], ignore_index=True)
    print(f"✅ Se movieron {n_movidos} registros a la clase PRIVADA.")

    # --- FASE 4: AUDITORÍA Y BALANCEO ---
    auditar_longitudes(df_priv_final, df_publicos_limpios)
    
    n_objetivo = len(df_priv_final)
    print(f"⚖️ Ajustando públicos a {n_objetivo} registros...")
    
    if len(df_publicos_limpios) >= n_objetivo:
        df_publicos_final = df_publicos_limpios.sample(n=n_objetivo, random_state=42)
    else:
        print("⚠️ No hay suficientes públicos para balanceo perfecto.")
        df_publicos_final = df_publicos_limpios

    # --- FASE 5: GUARDADO ---
    df_final = pd.concat([df_priv_final, df_publicos_final], ignore_index=True)
    df_final = df_final.sample(frac=1, random_state=42).reset_index(drop=True)
    
    df_final.to_csv(ruta_salida, index=False, encoding='utf-8')
    
    print("\n" + "🚀" * 15)
    print(f"ARCHIVO FINAL CREADO: {ruta_salida}")
    print(f"Total Privados (1): {len(df_priv_final)}")
    print(f"Total Públicos (0): {len(df_publicos_final)}")
    print(f"Total Registros: {len(df_final)}")
    print("🚀" * 15)

if __name__ == "__main__":
    crear_dataset_tfg_final()