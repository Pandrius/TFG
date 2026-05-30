WITH repetidas AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY documento_id, user_id
      ORDER BY fecha ASC, id ASC
    ) AS posicion
  FROM "descargas_documentos"
  WHERE user_id IS NOT NULL
)
DELETE FROM "descargas_documentos" d
USING repetidas r
WHERE d.id = r.id
  AND r.posicion > 1;

CREATE UNIQUE INDEX IF NOT EXISTS descargas_documentos_doc_user_unique_idx
ON "descargas_documentos" (documento_id, user_id)
WHERE user_id IS NOT NULL;
