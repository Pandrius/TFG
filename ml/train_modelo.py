import os
import sys
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.metrics import classification_report, confusion_matrix

class Logger(object):
    def __init__(self, filename):
        self.terminal = sys.stdout
        self.log = open(filename, "a", encoding="utf-8")

    def write(self, message):
        self.terminal.write(message)
        self.log.write(message)
        self.log.flush()

    def flush(self):
        self.terminal.flush()
        self.log.flush()

def entrenar_y_evaluar_con_validacion(nombre_modelo, modelo, X_train, y_train, X_val, y_val, threshold=None):
    """
    Entrena el modelo y lo evalúa. Si hay umbral y el modelo lo soporta, lo usa.
    """
    modelo.fit(X_train, y_train)
    
    # SVC necesita probability=True para tener predict_proba
    if threshold is not None and hasattr(modelo, "predict_proba"):
        probs = modelo.predict_proba(X_val)[:, 1]
        y_preds = (probs >= threshold).astype(int)
        desc_umbral = f" (Umbral: {threshold})"
    else:
        y_preds = modelo.predict(X_val)
        desc_umbral = ""
    
    cm = confusion_matrix(y_val, y_preds)
    reporte = classification_report(y_val, y_preds, target_names=["Clase 0 (Pub)", "Clase 1 (Priv)"], digits=4)
    
    print(f"\n📊 --- {nombre_modelo}{desc_umbral} ---")
    print(f"📝 Reporte:\n{reporte}")
    print(f"🧩 Matriz:")
    print(f"                      Predicho: Pub     Predicho: Priv")
    print(f"      Real Clase 0 (Pub):  {cm[0][0]:<10d} {cm[0][1]:<10d}")
    print(f"      Real Clase 1 (Priv): {cm[1][0]:<10d} {cm[1][1]:<10d}")
    print("-" * 60)

def ejecutar_experimento_svm(X_a, y_a, X_val, y_val, svm_params, descripcion):
    path_base = os.path.dirname(os.path.abspath(__file__))
    path_resultado = os.path.join(path_base, "resultado_train.txt")
    sys.stdout = Logger(path_resultado)

    print(f"\n>>> EXPERIMENTO SVM: {descripcion}")
    print(f">>> PARÁMETROS: {svm_params}\n")

    entrenar_y_evaluar_con_validacion(f"SVM {svm_params.get('kernel', 'rbf')}", SVC(**svm_params), X_a, y_a, X_val, y_val)

if __name__ == "__main__":
    path_base = os.path.dirname(os.path.abspath(__file__))
    path_root = os.path.dirname(path_base)

    print("🚀 Cargando datos (Solo Desbalanceado)...")
    df_a = pd.read_csv(os.path.join(path_base, "train_EXPERIMENTO_A_desbalanceado.csv"))
    X_a = np.load(os.path.join(path_base, "embeddings_unbalanced.npy"))
    y_a = df_a['label'].values

    path_val_csv = os.path.join(path_base, "validation_congelado.csv")
    if not os.path.exists(path_val_csv): path_val_csv = os.path.join(path_root, "validation_congelado.csv")
    path_val_emb = os.path.join(path_base, "embeddings_validation_1prueba.npy")
    if not os.path.exists(path_val_emb): path_val_emb = os.path.join(path_root, "embeddings_validation_1prueba.npy")
    
    df_val = pd.read_csv(path_val_csv)
    y_val = df_val['label'].values
    X_val = np.load(path_val_emb)

    # 1. SVM Lineal estándar (C=1.0)
    ejecutar_experimento_svm(X_a, y_a, X_val, y_val, 
        {"kernel": "linear", "C": 1.0, "random_state": 42}, 
        "SVM Lineal Base")

    # 2. SVM RBF (No lineal) - Suele ser más potente pero más lento
    ejecutar_experimento_svm(X_a, y_a, X_val, y_val, 
        {"kernel": "rbf", "C": 1.0, "random_state": 42}, 
        "SVM RBF Base")

    # 3. SVM Lineal con Regularización Fuerte (C pequeño)
    ejecutar_experimento_svm(X_a, y_a, X_val, y_val, 
        {"kernel": "linear", "C": 0.01, "random_state": 42}, 
        "SVM Lineal - Regularización Fuerte")

    # 4. SVM Lineal con Balanceo
    ejecutar_experimento_svm(X_a, y_a, X_val, y_val, 
        {"kernel": "linear", "C": 1.0, "class_weight": "balanced", "random_state": 42}, 
        "SVM Lineal - Balanceado")

    print("\n✅ Experimentos SVM completados. Revisa 'resultado_train.txt'.")
