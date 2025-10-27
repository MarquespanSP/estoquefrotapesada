-- Script para adicionar coluna location_id à tabela pieces
-- Execute este script no SQL Editor do Supabase

ALTER TABLE pieces ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE SET NULL;

-- Adicionar comentário
COMMENT ON COLUMN pieces.location_id IS 'Localização padrão da peça (opcional)';
