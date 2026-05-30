-- Evita que un mismo usuario administre mas de una organizacion a la vez.

CREATE UNIQUE INDEX IF NOT EXISTS org_miembros_admin_unico_por_usuario_idx
    ON "org_miembros" (user_id)
    WHERE rol = 'admin';
