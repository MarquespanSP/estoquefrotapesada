-- Script SQL completo para criar tabelas do sistema de controle de estoque no Supabase
-- Execute este script no SQL Editor do Supabase

-- Habilitar a extensão UUID se não estiver habilitada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Criar enum para níveis de acesso (se não existir)
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('Administrador', 'Diretoria', 'Supervisor', 'Operador');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Criar enum para tipos de movimentação (se não existir)
DO $$ BEGIN
    CREATE TYPE movement_type AS ENUM ('entrada', 'saida');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Criar tabela de usuários (se não existir)
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

-- Criar tabela de fornecedores
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    contact_info TEXT,
    created_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Criar tabela de locais de armazenamento
CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Criar tabela de peças
CREATE TABLE IF NOT EXISTS pieces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    created_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Criar tabela de movimentações de estoque
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    piece_id UUID NOT NULL REFERENCES pieces(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity != 0),
    movement_type movement_type NOT NULL,
    created_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_locations_code ON locations(code);
CREATE INDEX IF NOT EXISTS idx_pieces_code ON pieces(code);
CREATE INDEX IF NOT EXISTS idx_pieces_name ON pieces(name);
CREATE INDEX IF NOT EXISTS idx_stock_movements_piece_id ON stock_movements(piece_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_location_id ON stock_movements(location_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at);
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

-- Triggers para atualizar updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_suppliers_updated_at ON suppliers;
CREATE TRIGGER update_suppliers_updated_at
    BEFORE UPDATE ON suppliers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_locations_updated_at ON locations;
CREATE TRIGGER update_locations_updated_at
    BEFORE UPDATE ON locations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pieces_updated_at ON pieces;
CREATE TRIGGER update_pieces_updated_at
    BEFORE UPDATE ON pieces
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Políticas RLS (Row Level Security) para segurança
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pieces ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes se houver
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Users can view own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Allow anonymous read for login" ON users;
DROP POLICY IF EXISTS "Allow all operations on suppliers" ON suppliers;
DROP POLICY IF EXISTS "Allow all operations on locations" ON locations;
DROP POLICY IF EXISTS "Allow all operations on pieces" ON pieces;
DROP POLICY IF EXISTS "Allow all operations on stock_movements" ON stock_movements;

-- Políticas para usuários (login)
CREATE POLICY "Allow anonymous read for login" ON users
    FOR SELECT USING (true);

CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Políticas para fornecedores (acesso total para usuários autenticados)
CREATE POLICY "Allow all operations on suppliers" ON suppliers
    FOR ALL USING (auth.role() = 'authenticated');

-- Políticas para locais (acesso total para usuários autenticados)
CREATE POLICY "Allow all operations on locations" ON locations
    FOR ALL USING (auth.role() = 'authenticated');

-- Políticas para peças (acesso total para usuários autenticados)
CREATE POLICY "Allow all operations on pieces" ON pieces
    FOR ALL USING (auth.role() = 'authenticated');

-- Políticas para movimentações de estoque (acesso total para usuários autenticados)
CREATE POLICY "Allow all operations on stock_movements" ON stock_movements
    FOR ALL USING (auth.role() = 'authenticated');

-- Políticas para sessões
CREATE POLICY "Users can view own sessions" ON user_sessions
    FOR SELECT USING (auth.uid() = user_id);

-- Inserir dados de exemplo

-- Fornecedores de exemplo
INSERT INTO suppliers (name, contact_info, created_by)
VALUES
    ('Auto Peças Brasil', 'contato@autopecasbrasil.com.br', 'admin'),
    ('Frota Pesada Parts', 'vendas@frotapesada.com', 'admin'),
    ('Industrial Components', 'info@industrialcomp.com', 'admin'),
    ('Heavy Duty Supplies', 'sales@heavyduty.com', 'admin')
ON CONFLICT (name) DO NOTHING;

-- Locais de exemplo
INSERT INTO locations (code, description, created_by)
VALUES
    ('DB C1 L1', 'Depósito B - Corredor 1 - Prateleira 1', 'admin'),
    ('DB C1 L2', 'Depósito B - Corredor 1 - Prateleira 2', 'admin'),
    ('DB C2 L1', 'Depósito B - Corredor 2 - Prateleira 1', 'admin'),
    ('DB C2 L2', 'Depósito B - Corredor 2 - Prateleira 2', 'admin'),
    ('DA A1 P1', 'Depósito A - Ala 1 - Palete 1', 'admin'),
    ('DA A1 P2', 'Depósito A - Ala 1 - Palete 2', 'admin'),
    ('DA A2 P1', 'Depósito A - Ala 2 - Palete 1', 'admin'),
    ('DA A2 P2', 'Depósito A - Ala 2 - Palete 2', 'admin')
ON CONFLICT (code) DO NOTHING;

-- Usuários de exemplo (remova em produção)
INSERT INTO users (username, password_hash, full_name, role)
VALUES
    ('admin', 'admin123', 'Administrador', 'Administrador'),
    ('diretoria', 'dir123', 'Diretor Executivo', 'Diretoria'),
    ('supervisor', 'sup123', 'Supervisor Geral', 'Supervisor'),
    ('operador', 'op123', 'Operador de Estoque', 'Operador')
ON CONFLICT (username) DO NOTHING;

-- Peças de exemplo (depende dos fornecedores inseridos acima)
INSERT INTO pieces (code, name, supplier_id, created_by)
SELECT
    'PEC001',
    'Filtro de Óleo Motor',
    s.id,
    'admin'
FROM suppliers s WHERE s.name = 'Auto Peças Brasil'
UNION ALL
SELECT
    'PEC002',
    'Pastilha de Freio',
    s.id,
    'admin'
FROM suppliers s WHERE s.name = 'Frota Pesada Parts'
UNION ALL
SELECT
    'PEC003',
    'Correia de Acessórios',
    s.id,
    'admin'
FROM suppliers s WHERE s.name = 'Industrial Components'
UNION ALL
SELECT
    'PEC004',
    'Bateria 12V',
    s.id,
    'admin'
FROM suppliers s WHERE s.name = 'Heavy Duty Supplies'
ON CONFLICT (code) DO NOTHING;

-- Movimentações de exemplo
INSERT INTO stock_movements (piece_id, location_id, quantity, movement_type, created_by)
SELECT
    p.id,
    l.id,
    50,
    'entrada'::movement_type,
    'admin'
FROM pieces p, locations l
WHERE p.code = 'PEC001' AND l.code = 'DB C1 L1'
UNION ALL
SELECT
    p.id,
    l.id,
    30,
    'entrada'::movement_type,
    'admin'
FROM pieces p, locations l
WHERE p.code = 'PEC002' AND l.code = 'DB C1 L2'
UNION ALL
SELECT
    p.id,
    l.id,
    20,
    'entrada'::movement_type,
    'admin'
FROM pieces p, locations l
WHERE p.code = 'PEC003' AND l.code = 'DB C2 L1'
ON CONFLICT DO NOTHING;

-- Comentários finais
COMMENT ON TABLE users IS 'Tabela de usuários do sistema';
COMMENT ON TABLE suppliers IS 'Tabela de fornecedores de peças';
COMMENT ON TABLE locations IS 'Tabela de locais de armazenamento';
COMMENT ON TABLE pieces IS 'Tabela de peças cadastradas';
COMMENT ON TABLE stock_movements IS 'Tabela de movimentações de estoque';
COMMENT ON TABLE user_sessions IS 'Tabela de sessões de usuário (opcional)';
