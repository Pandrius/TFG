import pandas as pd
from datasets import load_dataset
import emoji
import os
import numpy as np

# ==========================================
# 1. FUNCIONES DE PROCESAMIENTO
# ==========================================

def procesar_pii_y_limpieza(df):
    """Limpia emojis y ELIMINA (purga) registros si contienen teléfonos o emails."""
    patron_tel = r'(?:(?:\+|00)34[- ]?)?([6789]\d{2}[- ]?\d{3}[- ]?\d{3})'
    patron_email = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
    
    df['texto'] = df['texto'].astype(str).apply(lambda x: emoji.replace_emoji(x, replace=''))
    
    # Identificamos las filas que contienen datos privados
    mask_pii = df['texto'].str.contains(patron_tel, regex=True, na=False) | \
               df['texto'].str.contains(patron_email, regex=True, na=False)
    
    # Contamos cuántos elementos se van a purgar para la auditoría informada
    n_eliminados = mask_pii.sum()
    print(f"   -> Filtrado Regex: detectados y eliminados {n_eliminados} registros con PII accidental.")
    
    # Nos quedamos únicamente con las filas que NO contienen PII usando el operador ALT/NOT (~)
    df_filtrado = df[~mask_pii].copy()
    
    return df_filtrado.dropna().drop_duplicates(subset=['texto'])

def balanceo_por_distribucion(df_priv, df_pub, max_w=80):
    """
    Selecciona registros de ambos grupos para que tengan 
    la misma distribución de longitud (bins).
    """
    # Filtramos por longitud máxima primero
    def count_w(t): return len(str(t).split())
    df_priv['n_words'] = df_priv['texto'].apply(count_w)
    df_pub['n_words'] = df_pub['texto'].apply(count_w)
    
    df_pub = df_pub[df_pub['n_words'] <= max_w].copy()
    df_priv = df_priv[df_priv['n_words'] <= max_w].copy()

    # Definimos los "cubos" de longitud (bins)
    bins = [0, 5, 10, 15, 20, 25, 30, 40, 50, 65, 81]
    df_priv['bin'] = pd.cut(df_priv['n_words'], bins=bins, labels=False)
    df_pub['bin'] = pd.cut(df_pub['n_words'], bins=bins, labels=False)

    priv_final = []
    pub_final = []

    for b in range(len(bins)-1):
        p_bin = df_priv[df_priv['bin'] == b]
        u_bin = df_pub[df_pub['bin'] == b]
        
        # Tomamos el mínimo de ambos para que en este rango de longitud haya 50/50
        n_min = min(len(p_bin), len(u_bin))
        
        if n_min > 0:
            priv_final.append(p_bin.sample(n=n_min, random_state=42))
            pub_final.append(u_bin.sample(n=n_min, random_state=42))

    df_p = pd.concat(priv_final)
    df_u = pd.concat(pub_final)
    
    return df_p.drop(columns=['n_words', 'bin']), df_u.drop(columns=['n_words', 'bin'])

# ==========================================
# 2. EJECUCIÓN
# ==========================================

def ejecutar_preparacion():
    path_base = r"C:\Users\prestamo\Documents\GitHub\TFG"
    
    # --- CARGA ---
    print("⏳ Cargando AI4Privacy...")
    ds = load_dataset("ai4privacy/pii-masking-400k", split='train+validation')
    df_priv_base = ds.filter(lambda x: x["language"] == "es").to_pandas()
    df_priv_base = df_priv_base[['source_text']].rename(columns={'source_text': 'texto'})
    df_priv_base['label'] = 1

    print("⏳ Cargando archivos locales...")
    locales = []
    for f in ["data.csv", "train.csv", "test.csv", "sentiment_analysis_dataset.csv"]:
        p = os.path.join(path_base, f)
        if os.path.exists(p):
            df_temp = pd.read_csv(p)
            col = 'text' if 'text' in df_temp.columns else 'texto'
            if col in df_temp.columns:
                df_temp = df_temp[[col]].rename(columns={col: 'texto'})
                df_temp['label'] = 0
                locales.append(df_temp)
    
    df_pub_raw = pd.concat(locales, ignore_index=True)

    # --- LIMPIEZA ---
    print("🧹 Limpiando y purgando PII de las fuentes públicas...")
    # La función ahora devuelve directamente el dataset público sin PII
    df_pub_solo = procesar_pii_y_limpieza(df_pub_raw)
    
    # Al eliminar en vez de reclasificar, la clase privada final se compone únicamente del dataset base
    df_priv_final = df_priv_base.dropna().drop_duplicates(subset=['texto']).copy()

    # --- GUARDAR DESBALANCEADO ---
    df_desb = pd.concat([df_priv_final, df_pub_solo], ignore_index=True).sample(frac=1, random_state=42)
    df_desb.to_csv(os.path.join(path_base, "dataset_DESBALANCEADO.csv"), index=False)
    print(f"✅ Guardado Desbalanceado ({len(df_priv_final)} P / {len(df_pub_solo)} B)")

    # --- GUARDAR BALANCEADO POR DISTRIBUCIÓN ---
    print("⚖️ Ejecutando balanceo por distribución de longitud...")
    # El balanceo por distribución se calcula dinámicamente con el dataset público ya purgado
    df_p_bal, df_u_bal = balanceo_por_distribucion(df_priv_final, df_pub_solo, max_w=80)
    
    df_bal_dist = pd.concat([df_p_bal, df_u_bal], ignore_index=True).sample(frac=1, random_state=42)
    df_bal_dist.to_csv(os.path.join(path_base, "dataset_BALANCEADO_DISTRIB.csv"), index=False)
    
    print(f"✅ Guardado Balanceado Distribución: {len(df_bal_dist)} registros.")
    print(f"   (Muestra: {len(df_p_bal)} por clase)")

if __name__ == "__main__":
    ejecutar_preparacion()