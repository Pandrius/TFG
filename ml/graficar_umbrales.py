import os
import numpy as np
import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.metrics import recall_score, accuracy_score

def generar_grafica_comparativa_modelos():
    # Configuración de estilo
    sns.set_theme(style="whitegrid")
    
    path_base = os.path.dirname(os.path.abspath(__file__))
    path_root = os.path.dirname(path_base)
    
    # Cargar datos (Solo Desbalanceado Exp A)
    print("🚀 Cargando datos...")
    df_train = pd.read_csv(os.path.join(path_base, "train_EXPERIMENTO_A_desbalanceado.csv"))
    X_train = np.load(os.path.join(path_base, "embeddings_unbalanced.npy"))
    y_train = df_train['label'].values
    
    df_val = pd.read_csv(os.path.join(path_base, "validation_congelado.csv") if os.path.exists(os.path.join(path_base, "validation_congelado.csv")) else os.path.join(path_root, "validation_congelado.csv"))
    X_val = np.load(os.path.join(path_base, "embeddings_validation_1prueba.npy") if os.path.exists(os.path.join(path_base, "embeddings_validation_1prueba.npy")) else os.path.join(path_root, "embeddings_validation_1prueba.npy"))
    y_val = df_val['label'].values

    # 1. Entrenar Regresión Logística (Base)
    print("🤖 Entrenando Regresión Logística...")
    lr = LogisticRegression(max_iter=1000, random_state=42, n_jobs=-1)
    lr.fit(X_train, y_train)
    probs_lr = lr.predict_proba(X_val)[:, 1]

    # 2. Entrenar SVM Lineal (Balanced) - Activamos probability=True
    print("🤖 Entrenando SVM Lineal (Balanced)... Esto puede tardar un poco...")
    svm = SVC(kernel='linear', C=1.0, class_weight='balanced', probability=True, random_state=42)
    svm.fit(X_train, y_train)
    probs_svm = svm.predict_proba(X_val)[:, 1]
    
    umbrales = [0.5, 0.4, 0.3, 0.2, 0.1, 0.05, 0.025]
    data_list = []
    
    print("📊 Calculando métricas para cada umbral...")
    for t in umbrales:
        # Métricas LR
        preds_lr = (probs_lr >= t).astype(int)
        data_list.append({"Umbral": t, "Valor": accuracy_score(y_val, preds_lr), "Métrica": "Accuracy", "Modelo": "Log. Regression"})
        data_list.append({"Umbral": t, "Valor": recall_score(y_val, preds_lr), "Métrica": "Recall (Privado)", "Modelo": "Log. Regression"})
        
        # Métricas SVM
        preds_svm = (probs_svm >= t).astype(int)
        data_list.append({"Umbral": t, "Valor": accuracy_score(y_val, preds_svm), "Métrica": "Accuracy", "Modelo": "SVM Lineal (Bal)"})
        data_list.append({"Umbral": t, "Valor": recall_score(y_val, preds_svm), "Métrica": "Recall (Privado)", "Modelo": "SVM Lineal (Bal)"})

    df_plot = pd.DataFrame(data_list)

    # Gráfica Seaborn
    plt.figure(figsize=(14, 8))
    sns.lineplot(
        data=df_plot, 
        x="Umbral", 
        y="Valor", 
        hue="Modelo", 
        style="Métrica", 
        markers=True, 
        dashes=True,
        palette="rocket",
        linewidth=2.5
    )
    
    plt.xlim(0.55, 0)
    plt.xticks(umbrales, [f"{int(u*100)}%" for u in umbrales])
    plt.ylim(0.85, 1.01)
    
    plt.title('Comparativa Final: Logistic Regression vs SVM (Dataset Desbalanceado)', fontsize=16, pad=20)
    plt.xlabel('Umbral para clasificar como "Privado" (%)', fontsize=12)
    plt.ylabel('Puntuación', fontsize=12)
    plt.legend(bbox_to_anchor=(1.05, 1), loc='upper left')
    plt.tight_layout()
    
    output_path = os.path.join(path_base, "grafica_comparativa_lr_svm.png")
    plt.savefig(output_path, dpi=300)
    print(f"\n✅ Gráfica comparativa guardada en: {output_path}")

    # Tabla resumen con 4 decimales
    print("\nResumen comparativo (Accuracy / Recall):")
    print(f"{'Umbral':<8} | {'LR (Acc/Rec)':<20} | {'SVM (Acc/Rec)':<20}")
    print("-" * 55)
    for t in umbrales:
        acc_lr = accuracy_score(y_val, (probs_lr >= t).astype(int))
        rec_lr = recall_score(y_val, (probs_lr >= t).astype(int))
        acc_svm = accuracy_score(y_val, (probs_svm >= t).astype(int))
        rec_svm = recall_score(y_val, (probs_svm >= t).astype(int))
        print(f"{int(t*100):>4}%    | {acc_lr:.4f} / {rec_lr:.4f} | {acc_svm:.4f} / {rec_svm:.4f}")

if __name__ == "__main__":
    generar_grafica_comparativa_modelos()
