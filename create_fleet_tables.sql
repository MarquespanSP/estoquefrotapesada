-- Tabela para armazenar informações dos veículos da frota
CREATE TABLE IF NOT EXISTS vehicles (
    id SERIAL PRIMARY KEY,
    filial VARCHAR(255) NOT NULL,
    placa VARCHAR(20) UNIQUE NOT NULL,
    chassi VARCHAR(50) UNIQUE NOT NULL,
    marca VARCHAR(100) NOT NULL,
    modelo VARCHAR(100) NOT NULL,
    frota VARCHAR(50) NOT NULL,
    grupo VARCHAR(100) NOT NULL,
    ano_fabricacao INTEGER NOT NULL CHECK (ano_fabricacao >= 1900 AND ano_fabricacao <= 2100),
    status VARCHAR(20) NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo', 'Manutenção', 'Vendido')),
    qrcode VARCHAR(255),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhorar performance das buscas
CREATE INDEX IF NOT EXISTS idx_vehicles_placa ON vehicles(placa);
CREATE INDEX IF NOT EXISTS idx_vehicles_chassi ON vehicles(chassi);
CREATE INDEX IF NOT EXISTS idx_vehicles_marca ON vehicles(marca);
CREATE INDEX IF NOT EXISTS idx_vehicles_modelo ON vehicles(modelo);
CREATE INDEX IF NOT EXISTS idx_vehicles_frota ON vehicles(frota);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_qrcode ON vehicles(qrcode);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Políticas RLS (Row Level Security) para controle de acesso
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

-- Política para permitir que usuários autenticados vejam todos os veículos
CREATE POLICY "Enable read access for authenticated users" ON vehicles
    FOR SELECT USING (auth.role() = 'authenticated');

-- Política para permitir que usuários autenticados insiram veículos
CREATE POLICY "Enable insert for authenticated users" ON vehicles
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Política para permitir que usuários autenticados atualizem veículos
CREATE POLICY "Enable update for authenticated users" ON vehicles
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Política para permitir que usuários autenticados excluam veículos (se necessário)
CREATE POLICY "Enable delete for authenticated users" ON vehicles
    FOR DELETE USING (auth.role() = 'authenticated');
