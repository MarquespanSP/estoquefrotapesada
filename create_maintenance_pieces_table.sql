-- Script para criar tabela de peças de manutenção
-- Execute este script no SQL Editor do Supabase

-- Tabela para peças específicas de manutenção
CREATE TABLE IF NOT EXISTS maintenance_pieces (
    id SERIAL PRIMARY KEY,
    filial VARCHAR(255) NOT NULL,
    nome VARCHAR(255) NOT NULL,
    valor_unitario DECIMAL(10,2) NOT NULL,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('Manutenção', 'Peças', 'Serviço')),
    status VARCHAR(20) NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'INATIVO')),
    descricao TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_maintenance_pieces_filial ON maintenance_pieces(filial);
CREATE INDEX IF NOT EXISTS idx_maintenance_pieces_tipo ON maintenance_pieces(tipo);
CREATE INDEX IF NOT EXISTS idx_maintenance_pieces_status ON maintenance_pieces(status);

-- Trigger para atualizar updated_at automaticamente
DROP TRIGGER IF EXISTS update_maintenance_pieces_updated_at ON maintenance_pieces;
CREATE TRIGGER update_maintenance_pieces_updated_at BEFORE UPDATE ON maintenance_pieces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Desabilitar RLS seguindo o padrão do projeto
ALTER TABLE maintenance_pieces DISABLE ROW LEVEL SECURITY;
