-- Tabela para armazenar informações das manutenções
CREATE TABLE IF NOT EXISTS maintenances (
    id SERIAL PRIMARY KEY,
    filial VARCHAR(255) NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    tipo_manutencao VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ABERTO' CHECK (status IN ('ABERTO', 'MANUTENÇÃO', 'FINALIZADO')),
    data_manutencao DATE NOT NULL,
    veiculo_placa VARCHAR(20) NOT NULL REFERENCES vehicles(placa),
    hodometro INTEGER,
    fornecedor_id UUID REFERENCES suppliers(id),
    nfe VARCHAR(100),
    nfse VARCHAR(100),
    numero_os VARCHAR(100),
    descricao TEXT,
    total_valor DECIMAL(10,2) DEFAULT 0,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para itens de manutenção
CREATE TABLE IF NOT EXISTS maintenance_items (
    id SERIAL PRIMARY KEY,
    maintenance_id INTEGER NOT NULL REFERENCES maintenances(id) ON DELETE CASCADE,
    qtd INTEGER NOT NULL DEFAULT 1,
    item_peca VARCHAR(255) NOT NULL,
    valor_unitario DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para uploads de documentos de manutenção
CREATE TABLE IF NOT EXISTS maintenance_uploads (
    id SERIAL PRIMARY KEY,
    maintenance_id INTEGER NOT NULL REFERENCES maintenances(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(100),
    file_size INTEGER,
    uploaded_by UUID REFERENCES auth.users(id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_maintenances_veiculo_placa ON maintenances(veiculo_placa);
CREATE INDEX IF NOT EXISTS idx_maintenances_status ON maintenances(status);
CREATE INDEX IF NOT EXISTS idx_maintenances_data ON maintenances(data_manutencao);
CREATE INDEX IF NOT EXISTS idx_maintenance_items_maintenance_id ON maintenance_items(maintenance_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_uploads_maintenance_id ON maintenance_uploads(maintenance_id);

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_maintenances_updated_at BEFORE UPDATE ON maintenances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Políticas RLS (Row Level Security) para controle de acesso
ALTER TABLE maintenances DISABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_uploads DISABLE ROW LEVEL SECURITY;
