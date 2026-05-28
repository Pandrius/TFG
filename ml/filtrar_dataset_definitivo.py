import os
import numpy as np
import pandas as pd
import emoji
from datasets import load_dataset
from sklearn.model_selection import train_test_split

# ==========================================
# 1. FUNCIONES DE PROCESAMIENTO Y LIMPIEZA
# ==========================================

def limpiar_y_deduplicar_base(df):
    """
    Paso 0 - Higiene previa.
    Elimina nulos, celdas vacías, limpia emojis y purga PII de forma estricta.
    """
    # 1. Eliminar nulos reales (NaN) iniciales en la columna 'texto'
    df = df.dropna(subset=['texto']).copy()
    
    # 2. Limpieza de emojis PRIMERO
    # Se hace aquí para que si un texto solo tenía emojis (ej: "😂😂"), ahora quede 
    # completamente vacío y pueda ser detectado y eliminado en el siguiente paso.
    df['texto'] = df['texto'].astype(str).apply(lambda x: emoji.replace_emoji(x, replace=''))
    
    # 3. Eliminar celdas vacías o que solo tengan espacios en blanco
    df = df[df['texto'].astype(str).str.strip() != ''].copy()
    
    # 4. Filtrado Regex para purgar PII accidental de las fuentes públicas
    patron_tel = r'(?:(?:\+|00)34[- ]?)?([6789]\d{2}[- ]?\d{3}[- ]?\d{3})'
    patron_email = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
    
    mask_pii = df['texto'].str.contains(patron_tel, regex=True, na=False) | \
               df['texto'].str.contains(patron_email, regex=True, na=False)
    
    n_eliminados = mask_pii.sum()
    if n_eliminados > 0:
        print(f"   -> Filtrado Regex: detectados y eliminados {n_eliminados} registros con PII accidental.")
    
    df_filtrado = df[~mask_pii].copy()
    
    # 5. Control del texto "nan" literal y deduplicación estricta (Evitar data leakage)
    df_filtrado = df_filtrado[df_filtrado['texto'].str.lower() != 'nan']
    df_filtrado = df_filtrado.drop_duplicates(subset=['texto'])
    
    return df_filtrado

def balanceo_por_distribucion_train(df_train, max_w=80):
    """
    Aplica el balanceo por distribución de longitud ÚNICAMENTE al conjunto de Train.
    Garantiza que la clase 0 y la clase 1 tengan la misma distribución de bins de palabras.
    """
    df = df_train.copy()
    
    # Calcular longitud de palabras
    def count_w(t): return len(str(t).split())
    df['n_words'] = df['texto'].apply(count_w)
    
    # Filtrar por longitud máxima establecida
    df = df[df['n_words'] <= max_w].copy()

    # Definir los "cubos" o contenedores de longitud (bins)
    bins = [0, 5, 10, 15, 20, 25, 30, 40, 50, 65, 81]
    df['bin'] = pd.cut(df['n_words'], bins=bins, labels=False)

    df_priv = df[df['label'] == 1]
    df_pub = df[df['label'] == 0]

    priv_final = []
    pub_final = []

    # Muestrear equitativamente dentro de cada bin
    for b in range(len(bins)-1):
        p_bin = df_priv[df_priv['bin'] == b]
        u_bin = df_pub[df_pub['bin'] == b]
        
        n_min = min(len(p_bin), len(u_bin))
        
        if n_min > 0:
            priv_final.append(p_bin.sample(n=n_min, random_state=42))
            pub_final.append(u_bin.sample(n=n_min, random_state=42))

    df_p_bal = pd.concat(priv_final)
    df_u_bal = pd.concat(pub_final)
    
    df_bal = pd.concat([df_p_bal, df_u_bal], ignore_index=True)
    return df_bal.drop(columns=['n_words', 'bin']).sample(frac=1, random_state=42)

# ==========================================
# 2. EJECUCIÓN DEL PIPELINE
# ==========================================

def ejecutar_preparacion():
    path_base = r"C:\Users\prestamo\Documents\GitHub\TFG"
    
    # --- PASO 0: CARGA Y HIGIENE PREVIA ---
    print("⏳ Cargando y limpiando AI4Privacy (Clase 1)...")
    ds = load_dataset("ai4privacy/pii-masking-400k", split='train+validation')
    df_priv_base = ds.filter(lambda x: x["language"] == "es").to_pandas()
    df_priv_base = df_priv_base[['source_text']].rename(columns={'source_text': 'texto'})
    df_priv_base['label'] = 1
    df_priv_limpio = limpiar_y_deduplicar_base(df_priv_base)

    print("⏳ Cargando y limpiando archivos locales públicos (Clase 0)...")
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
    df_pub_limpio = limpiar_y_deduplicar_base(df_pub_raw)

    # Concatenamos todo en el dataset real desbalanceado original
    df_completo_raw = pd.concat([df_priv_limpio, df_pub_limpio], ignore_index=True)
    
    # Deduplicación global final por si acaso un mismo texto estaba en ambas fuentes
    df_completo_raw = df_completo_raw.drop_duplicates(subset=['texto']).copy()
    
    X = df_completo_raw[['texto']]
    y = df_completo_raw['label']
    
    print(f"\n📊 Dataset Completo Desbalanceado: {len(df_completo_raw)} registros.")
    print(f"   - Clase 0 (Público): {list(y).count(0)}")
    print(f"   - Clase 1 (Privado): {list(y).count(1)}")

    # --- PASO 1: SPLIT ESTRATIFICADO SOBRE EL DATASET REAL ---
    print("\n✂️ Realizando divisiones estasificadas...")
    
    # 1er corte: Separamos el Test Set congelado (17.5% del total para cumplir el rango de ~11,000 registros)
    X_temp, X_test, y_temp, y_test = train_test_split(
        X, y, test_size=0.175, stratify=y, random_state=42
    )
    
    # 2º corte: Del subset temporal, separamos Train y Validation (~15% del total original equivale a un ~18.2% del temporal)
    X_train_desb, X_val, y_train_desb, y_val = train_test_split(
        X_temp, y_temp, test_size=0.182, stratify=y_temp, random_state=42
    )

    # Recomponer DataFrames para guardar fácilmente
    df_test = pd.concat([X_test, y_test], axis=1).sample(frac=1, random_state=42)
    df_val = pd.concat([X_val, y_val], axis=1).sample(frac=1, random_state=42)
    df_train_desb = pd.concat([X_train_desb, y_train_desb], axis=1).sample(frac=1, random_state=42)

    # --- PASO 3: BALANCEO EXCLUSIVO DEL TRAIN (EXPERIMENTO B) ---
    print("⚖️ Balanceando por distribución de longitud SOLO el conjunto de Train...")
    df_train_bal = balanceo_por_distribucion_train(df_train_desb, max_w=80)

    # --- GUARDAR CONJUNTOS DE DATOS ---
    print("\n💾 Guardando archivos en el disco...")
    
    # Test y Validación son idénticos, reales y congelados para ambos experimentos
    df_test.to_csv(os.path.join(path_base, "test_congelado.csv"), index=False)
    df_val.to_csv(os.path.join(path_base, "validation_congelado.csv"), index=False)
    
    # Conjuntos de entrenamiento distribuidos por experimento
    df_train_desb.to_csv(os.path.join(path_base, "train_EXPERIMENTO_A_desbalanceado.csv"), index=False)
    df_train_bal.to_csv(os.path.join(path_base, "train_EXPERIMENTO_B_balanceado.csv"), index=False)

    # --- AUDITORÍA INFORMATIVA FINAL ---
    print("\n✅ Proceso completado exitosamente. Resumen de registros:")
    print(f"   - [CONGELADO] Validation (Real Desb.): {len(df_val)} filas. Clases: {df_val['label'].value_counts().to_dict()}")
    print(f"   - [CONGELADO] Test       (Real Desb.): {len(df_test)} filas. Clases: {df_test['label'].value_counts().to_dict()}")
    print(f"   - [EXP A]     Train Desbalanceado:     {len(df_train_desb)} filas. Clases: {df_train_desb['label'].value_counts().to_dict()}")
    print(f"   - [EXP B]     Train Balanceado Long:   {len(df_train_bal)} filas. Clases: {df_train_bal['label'].value_counts().to_dict()}")

if __name__ == "__main__":
    ejecutar_preparacion()