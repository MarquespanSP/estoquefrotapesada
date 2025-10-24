-- Script SQL para criar tabelas de autenticação de usuário no Supabase
-- Execute este script no SQL Editor do Supabase

-- Habilitar a extensão UUID se não estiver habilitada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Criar enum para níveis de acesso
CREATE TYPE user_role AS ENUM ('Administrador', 'Diretoria', 'Supervisor', 'Operador');

-- Criar tabela de usuários
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role user_role DEFAULT 'Operador',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Criar tabela de sessões (opcional, para controle de sessões)
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at na tabela users (remover se já existir)
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Políticas RLS (Row Level Security) para segurança
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes se houver
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Users can view own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Allow anonymous read for login" ON users;

-- Política para permitir leitura anônima para login (temporária para desenvolvimento)
CREATE POLICY "Allow anonymous read for login" ON users
    FOR SELECT USING (true);

-- Política para usuários verem apenas seus próprios dados
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (auth.uid() = id);

-- Política para usuários atualizarem seus próprios dados
CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Política para sessões
CREATE POLICY "Users can view own sessions" ON user_sessions
    FOR SELECT USING (auth.uid() = user_id);

-- Inserir usuários de exemplo com diferentes níveis de acesso (remova em produção)
-- Senha: 'admin123' (atualize para hash seguro em produção)
INSERT INTO users (username, password_hash, full_name, role)
VALUES
    ('admin', 'admin123', 'Administrador', 'Administrador'),
    ('diretoria', 'dir123', 'Diretor Executivo', 'Diretoria'),
    ('supervisor', 'sup123', 'Supervisor Geral', 'Supervisor'),
    ('operador', 'op123', 'Operador de Estoque', 'Operador')
ON CONFLICT (username) DO NOTHING;
