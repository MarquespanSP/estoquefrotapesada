-- Script SQL completo para criação da tabela de fornecedores
-- Inclui permissões necessárias para CRUD operations

-- Criar tabela de fornecedores
CREATE TABLE IF NOT EXISTS suppliers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    contact_info TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_is_active ON suppliers(is_active);
CREATE INDEX IF NOT EXISTS idx_suppliers_created_at ON suppliers(created_at);

-- Remover função e trigger relacionados a updated_at já que a coluna não existe
-- DROP TRIGGER IF EXISTS update_suppliers_updated_at ON suppliers;
-- DROP FUNCTION IF EXISTS update_updated_at_column();

-- Conceder permissões básicas para usuários autenticados
-- NOTA: Ajuste o nome do usuário/role conforme necessário
-- GRANT USAGE ON SCHEMA public TO authenticated;
-- GRANT ALL ON suppliers TO authenticated;
-- GRANT USAGE, SELECT ON SEQUENCE suppliers_id_seq TO authenticated;

-- Políticas RLS (Row Level Security) para Supabase
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura para usuários autenticados
CREATE POLICY "Enable read access for authenticated users" ON suppliers
    FOR SELECT USING (auth.role() = 'authenticated');

-- Política para permitir inserção para usuários autenticados
CREATE POLICY "Enable insert for authenticated users" ON suppliers
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Política para permitir atualização para usuários autenticados
CREATE POLICY "Enable update for authenticated users" ON suppliers
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Política para permitir exclusão para usuários autenticados
CREATE POLICY "Enable delete for authenticated users" ON suppliers
    FOR DELETE USING (auth.role() = 'authenticated');

-- Inserir alguns fornecedores de exemplo (opcional)
INSERT INTO suppliers (name, contact_info, created_by) VALUES
    ('Auto Peças Brasil Ltda', 'Telefone: (11) 99999-9999 | Email: contato@autopecasbrasil.com.br | Endereço: Rua das Peças, 123 - São Paulo/SP', 'system'),
    ('Fornecedor Nacional de Peças', 'Telefone: (21) 88888-8888 | Email: vendas@fornecedor.com.br | Endereço: Av. Industrial, 456 - Rio de Janeiro/RJ', 'system'),
    ('Peças e Componentes Ltda', 'Telefone: (31) 77777-7777 | Email: comercial@pecascomponentes.com.br | Endereço: Rua dos Componentes, 789 - Belo Horizonte/MG', 'system')
ON CONFLICT (name) DO NOTHING;

-- Comentários na tabela para documentação
COMMENT ON TABLE suppliers IS 'Tabela de fornecedores de peças e componentes';
COMMENT ON COLUMN suppliers.id IS 'Identificador único do fornecedor';
COMMENT ON COLUMN suppliers.name IS 'Nome do fornecedor';
COMMENT ON COLUMN suppliers.contact_info IS 'Informações de contato (telefone, email, endereço, etc.)';
COMMENT ON COLUMN suppliers.is_active IS 'Indica se o fornecedor está ativo no sistema';
COMMENT ON COLUMN suppliers.created_by IS 'Usuário que criou o registro';
COMMENT ON COLUMN suppliers.created_at IS 'Data e hora de criação do registro';

-- Verificar se a tabela foi criada corretamente
SELECT
    t.schemaname,
    t.tablename,
    t.tableowner
FROM pg_tables t
WHERE t.tablename = 'suppliers';

-- Verificar se as políticas RLS foram aplicadas
SELECT
    t.schemaname,
    t.tablename,
    t.rowsecurity,
    p.policyname,
    p.cmd,
    p.roles
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename
WHERE t.tablename = 'suppliers'
ORDER BY t.tablename, p.policyname;
