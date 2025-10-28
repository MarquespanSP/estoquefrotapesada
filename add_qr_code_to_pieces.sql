-- Script SQL para adicionar coluna qr_code à tabela pieces
-- Execute este script no SQL Editor do Supabase

-- Adicionar coluna qr_code à tabela pieces
ALTER TABLE pieces ADD COLUMN IF NOT EXISTS qr_code VARCHAR(255) UNIQUE;

-- Adicionar comentário à coluna
COMMENT ON COLUMN pieces.qr_code IS 'Código QR ou código de barras da peça (opcional, único)';

-- Criar índice para performance na busca por qr_code
CREATE INDEX IF NOT EXISTS idx_pieces_qr_code ON pieces(qr_code);
