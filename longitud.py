def auditar_longitudes(df_priv, df_pub):
    print("\n📊 --- AUDITORÍA DE LONGITUDES ---")
    
    # Calculamos longitud en caracteres y en palabras
    stats = []
    for nombre, df in [("Privados (Clase 1)", df_priv), ("Públicos (Clase 0)", df_pub)]:
        long_caracteres = df['texto'].str.len()
        long_palabras = df['texto'].str.split().str.len()
        
        stats.append({
            "Grupo": nombre,
            "Media Caracteres": round(long_caracteres.mean(), 2),
            "Media Palabras": round(long_palabras.mean(), 2),
            "Máx Palabras": long_palabras.max(),
            "Mín Palabras": long_palabras.min()
        })
    
    df_stats = pd.DataFrame(stats)
    print(df_stats.to_string(index=False))
    
    # Verificación de sesgo
    diff = abs(stats[0]["Media Palabras"] - stats[1]["Media Palabras"])
    if diff > 15:
        print(f"\n⚠️ ALERTA DE SESGO: Hay una diferencia de {round(diff, 2)} palabras de media.")
        print("El modelo podría clasificar por longitud en lugar de por contenido.")
    else:
        print(f"\n✅ EQUILIBRIO CORRECTO: Diferencia de solo {round(diff, 2)} palabras.")

# --- Llamada dentro de tu script principal antes de unir ---
auditar_longitudes(df_priv_final_total, df_publicos_final)