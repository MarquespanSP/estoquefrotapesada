# Estoque Frota Pesada

Sistema de controle de estoque para frota pesada.

## Configuração Inicial

### 1. Banco de Dados (Supabase)

1. Execute o script `create_login_tables.sql` no SQL Editor do Supabase para criar as tabelas necessárias.

2. No arquivo `login.js`, substitua:
   - `YOUR_SUPABASE_URL` pela URL do seu projeto Supabase
   - `YOUR_SUPABASE_ANON_KEY` pela chave anônima do Supabase

### 2. Arquivos Criados

- `create_login_tables.sql`: Script SQL para criar tabelas de usuários e sessões
- `login.html`: Página de login
- `login.js`: Script JavaScript para autenticação com Supabase
- `dashboard.html`: Página do dashboard após login

### 3. Como Usar

1. Abra `login.html` no navegador
2. Faça login com as credenciais criadas
3. Após login, será redirecionado para o dashboard

## Funcionalidades

- Sistema de login/logout com usuário e senha
- Controle de sessões usando localStorage
- Dashboard básico com menu de navegação
- Autenticação direta no banco de dados Supabase

## Como Usar

1. Execute o script `create_login_tables.sql` no Supabase
2. Configure as credenciais do Supabase no `login.js`
3. Abra `login.html` e faça login com:
   - Usuário: admin
   - Senha: admin123 (ou a senha que você definir no banco)

## Próximos Passos

- Implementar funcionalidades específicas do controle de estoque
- Adicionar validações de formulários
- Melhorar a interface do usuário
- Implementar controle de permissões
- Adicionar hash seguro para senhas
