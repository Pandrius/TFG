import os
import numpy as np
import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import recall_score, accuracy_score

def generar_grafica_umbrales():
    # Configuración de estilo de Seaborn
    sns.set_theme(style="whitegrid")
    
    path_base = os.path.dirname(os.path.abspath(__file__))
    path_root = os.path.dirname(path_base)
    
    # Cargar datos de Validación
    path_val_csv = os.path.join(path_base, "validation_congelado.csv")
    if not os.path.exists(path_val_csv):
        path_val_csv = os.path.join(path_root, "validation_congelado.csv")
    path_val_emb = os.path.join(path_base, "embeddings_validation_1prueba.npy")
    if not os.path.exists(path_val_emb):
        path_val_emb = os.path.join(path_root, "embeddings_validation_1prueba.npy")
    
    df_val = pd.read_csv(path_val_csv)
    y_val = df_val['label'].values
    X_val = np.load(path_val_emb)

    # Cargar y entrenar solo con Dataset DESBALANCEADO (Exp A)
    print("Entrenando modelo DESBALANCEADO...")
    df_train_a = pd.read_csv(os.path.join(path_base, "train_EXPERIMENTO_A_desbalanceado.csv"))
    X_train_a = np.load(os.path.join(path_base, "embeddings_unbalanced.npy"))
    y_train_a = df_train_a['label'].values
    
    lr_a = LogisticRegression(max_iter=1000, random_state=42, n_jobs=-1)
    lr_a.fit(X_train_a, y_train_a)
    probs_a = lr_a.predict_proba(X_val)[:, 1]

    umbrales = [0.5, 0.4, 0.3, 0.2, 0.1, 0.05, 0.025]
    
    data_list = []
    
    print("Calculando métricas para cada umbral...")
    for t in umbrales:
        y_preds_a = (probs_a >= t).astype(int)
        data_list.append({"Umbral": t, "Valor": accuracy_score(y_val, y_preds_a), "Métrica": "Accuracy"})
        data_list.append({"Umbral": t, "Valor": recall_score(y_val, y_preds_a), "Métrica": "Recall (Privado)"})

    df_plot = pd.DataFrame(data_list)

    # Crear la gráfica con Seaborn
    plt.figure(figsize=(10, 6))
    sns.lineplot(
        data=df_plot, 
        x="Umbral", 
        y="Valor", 
        hue="Métrica", 
        markers=True, 
        dashes=False,
        palette="magma",
        linewidth=2.5
    )
    
    # Invertir el eje X
    plt.xlim(0.55, 0)
    plt.xticks(umbrales, [f"{int(u*100)}%" for u in umbrales])
    
    plt.title('Análisis de Umbrales: Dataset Desbalanceado', fontsize=16, pad=20)
    plt.xlabel('Umbral para clasificar como "Privado" (%)', fontsize=12)
    plt.ylabel('Puntuación', fontsize=12)
    plt.ylim(0.85, 1.01)
    
    plt.tight_layout()
    
    # Guardar la gráfica
    output_path = os.path.join(path_base, "grafica_umbrales_final.png")
    plt.savefig(output_path, dpi=300)
    print(f"\n✅ Gráfica final guardada en: {output_path}")

if __name__ == "__main__":
    generar_grafica_umbrales()
