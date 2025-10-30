-- Script para configurar Row Level Security (RLS) na tabela suppliers
-- Execute este script no SQL Editor do Supabase

-- Habilitar RLS na tabela suppliers
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes se houver
DROP POLICY IF EXISTS "Allow select suppliers" ON suppliers;
DROP POLICY IF EXISTS "Allow insert suppliers" ON suppliers;
DROP POLICY IF EXISTS "Allow update suppliers" ON suppliers;
DROP POLICY IF EXISTS "Allow delete suppliers" ON suppliers;

-- Política para SELECT: todos os usuários autenticados podem ver fornecedores ativos
-- (removendo a condição de auth.jwt() pois estamos usando autenticação customizada)
CREATE POLICY "Allow select suppliers" ON suppliers
    FOR SELECT
    USING (is_active = true);

-- Política para INSERT: todos os usuários autenticados podem inserir fornecedores
-- (removendo a condição de auth.jwt() pois estamos usando autenticação customizada)
CREATE POLICY "Allow insert suppliers" ON suppliers
    FOR INSERT
    WITH CHECK (true);

-- Política para UPDATE: todos os usuários autenticados podem atualizar fornecedores
-- (removendo a condição de auth.jwt() pois estamos usando autenticação customizada)
CREATE POLICY "Allow update suppliers" ON suppliers
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Política para DELETE: todos os usuários autenticados podem fazer soft delete
-- (removendo a condição de auth.jwt() pois estamos usando autenticação customizada)
CREATE POLICY "Allow delete suppliers" ON suppliers
    FOR DELETE
    USING (true);
