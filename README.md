# Estoque Frota Pesada

Sistema de controle de estoque para frota pesada com autenticação de usuário e senha.

## 📁 Estrutura do Projeto

```
estoque-frota-pesada/
├── index.html              # Página de login (página inicial)
├── dashboard.html          # Dashboard principal após login
├── create_login_tables.sql # Script SQL para criar tabelas no Supabase
├── assets/
│   ├── css/
│   │   └── styles.css      # Estilos CSS globais
│   └── js/
│       └── auth.js         # Script de autenticação
└── README.md               # Este arquivo
```

## 🚀 Configuração Inicial

### 1. Banco de Dados (Supabase)

1. **Crie um projeto no Supabase** (https://supabase.com)
2. **Execute o script SQL**:
   - Abra o SQL Editor no painel do Supabase
   - Execute o conteúdo do arquivo `create_login_tables.sql`
3. **Configure as credenciais**:
   - Abra `assets/js/auth.js`
   - Substitua `YOUR_SUPABASE_URL` pela URL do seu projeto
   - Substitua `YOUR_SUPABASE_ANON_KEY` pela chave anônima

### 2. Como Usar

1. **Execute o projeto**:
   - Abra `index.html` no navegador (pode usar um servidor local)
2. **Faça login** com as credenciais padrão:
   - **Usuário**: admin
   - **Senha**: admin123
3. **Acesse o dashboard** após login bem-sucedido

## ✨ Funcionalidades

- 🔐 **Login seguro** com usuário e senha
- 👤 **Controle de usuários** no banco de dados
- 📱 **Interface responsiva** para desktop e mobile
- 🎨 **Design moderno** com CSS organizado
- 🔄 **Sessões persistentes** usando localStorage
- 🚪 **Logout automático** e manual

## 📋 Funcionalidades do Dashboard

- 📦 **Controle de Estoque**: Gerenciar peças e equipamentos
- 📊 **Relatórios**: Visualizar movimentação e inventário
- 🔧 **Manutenção**: Agendar manutenções preventivas/corretivas
- 🏢 **Fornecedores**: Gerenciar fornecedores e pedidos
- 🚛 **Frota**: Controle da frota de veículos
- 👥 **Usuários**: Administrar usuários e permissões

## 🛠️ Tecnologias Utilizadas

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Supabase (PostgreSQL + Auth)
- **Bibliotecas**: Supabase JS Client
- **Estilos**: CSS Grid e Flexbox

## 🔧 Desenvolvimento

### Adicionar Novos Módulos

1. Crie novas páginas HTML na raiz do projeto
2. Adicione estilos em `assets/css/styles.css`
3. Implemente funcionalidades em arquivos JS separados em `assets/js/`
4. Atualize a navegação no header das páginas

### Personalização

- **Cores**: Modifique as variáveis CSS em `styles.css`
- **Layout**: Ajuste o grid do dashboard conforme necessário
- **Funcionalidades**: Estenda o script `auth.js` para novas features

## 📝 Notas de Segurança

- ⚠️ **Em produção**: Implemente hash seguro para senhas (bcrypt)
- 🔒 **Validação**: Adicione validações robustas nos formulários
- 🚫 **RLS**: As políticas Row Level Security estão configuradas no Supabase
- 🔐 **Chaves**: Nunca commite chaves reais do Supabase no código

## 🎯 Próximos Passos

- [ ] Implementar hash seguro para senhas
- [ ] Adicionar validações de formulários
- [ ] Criar módulos específicos do controle de estoque
- [ ] Implementar controle de permissões por usuário
- [ ] Adicionar sistema de notificações
- [ ] Criar API REST para integração com outros sistemas

## 📞 Suporte

Para dúvidas ou problemas, verifique:
1. Configuração correta das credenciais do Supabase
2. Execução do script SQL no banco
3. Console do navegador para erros JavaScript
4. Logs do Supabase para erros de banco
