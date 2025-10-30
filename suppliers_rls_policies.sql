-- Script para configurar Row Level Security (RLS) na tabela suppliers
-- Execute este script no SQL Editor do Supabase

-- Habilitar RLS na tabela suppliers
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes se houver
DROP POLICY IF EXISTS "Allow select suppliers" ON suppliers;
DROP POLICY IF EXISTS "Allow insert suppliers" ON suppliers;
DROP POLICY IF EXISTS "Allow update suppliers" ON suppliers;
DROP POLICY IF EXISTS "Allow delete suppliers" ON suppliers;

-- Política para SELECT: usuários autenticados podem ver fornecedores ativos
CREATE POLICY "Allow select suppliers" ON suppliers
    FOR SELECT
    USING (
        is_active = true
        AND auth.jwt() IS NOT NULL
    );

-- Política para INSERT: usuários autenticados podem inserir fornecedores
CREATE POLICY "Allow insert suppliers" ON suppliers
    FOR INSERT
    WITH CHECK (
        auth.jwt() IS NOT NULL
        AND created_by = auth.jwt() ->> 'username'
    );

-- Política para UPDATE: administradores ou o usuário que criou podem atualizar
CREATE POLICY "Allow update suppliers" ON suppliers
    FOR UPDATE
    USING (
        auth.jwt() IS NOT NULL
        AND (
            auth.jwt() ->> 'role' = 'Administrador'
            OR created_by = auth.jwt() ->> 'username'
        )
    )
    WITH CHECK (
        auth.jwt() IS NOT NULL
        AND (
            auth.jwt() ->> 'role' = 'Administrador'
            OR created_by = auth.jwt() ->> 'username'
        )
    );

-- Política para DELETE: apenas administradores podem fazer soft delete
CREATE POLICY "Allow delete suppliers" ON suppliers
    FOR DELETE
    USING (
        auth.jwt() IS NOT NULL
        AND auth.jwt() ->> 'role' = 'Administrador'
    );
