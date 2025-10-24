-- Script SQL para criar tabelas de autenticação de usuário no Supabase
-- Execute este script no SQL Editor do Supabase

-- Habilitar a extensão UUID se não estiver habilitada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Criar tabela de usuários
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
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

-- Trigger para atualizar updated_at na tabela users
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Políticas RLS (Row Level Security) para segurança
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Política para usuários verem apenas seus próprios dados
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (auth.uid() = id);

-- Política para usuários atualizarem seus próprios dados
CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Política para sessões
CREATE POLICY "Users can view own sessions" ON user_sessions
    FOR SELECT USING (auth.uid() = user_id);

-- Inserir um usuário de exemplo (remova em produção)
-- Senha: 'admin123' (atualize para hash seguro em produção)
INSERT INTO users (username, password_hash, full_name)
VALUES ('admin', 'admin123', 'Administrador')
ON CONFLICT (username) DO NOTHING;
