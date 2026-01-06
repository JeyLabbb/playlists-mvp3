-- Agregar columnas para trackear envío de email de Reyes
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS reyes_email_sent BOOLEAN DEFAULT FALSE;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS reyes_email_sent_at TIMESTAMPTZ DEFAULT NULL;

-- Crear índice para mejorar performance en consultas
CREATE INDEX IF NOT EXISTS idx_users_reyes_email_sent 
ON users(reyes_email_sent) 
WHERE reyes_email_sent = FALSE;

-- Comentarios para documentación
COMMENT ON COLUMN users.reyes_email_sent IS 
  'Flag to track if the user has received the Reyes gift email';

COMMENT ON COLUMN users.reyes_email_sent_at IS 
  'Timestamp when the Reyes email was sent';

