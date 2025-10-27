-- Script para adicionar coluna updated_by à tabela pieces
-- Execute este script no SQL Editor do Supabase

ALTER TABLE pieces ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255);

-- Adicionar comentário
COMMENT ON COLUMN pieces.updated_by IS 'Usuário que realizou a última atualização';
