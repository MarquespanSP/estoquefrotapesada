// Script JavaScript para autenticação com Supabase
// Importar cliente Supabase centralizado
// const supabaseClient = window.supabaseClient; // Definido pelo supabase_client.js

// Função para fazer login (usando username e password diretamente no banco)
async function loginUser(username, password) {
    try {
        // Buscar usuário pelo username
        const { data: userData, error: fetchError } = await supabaseClient
            .from('users')
            .select('*')
            .eq('username', username)
            .eq('is_active', true)
            .single();

        if (fetchError || !userData) {
            throw new Error('Usuário não encontrado ou inativo');
        }

        // Verificar senha (nota: em produção, use hash seguro)
        // Para este exemplo, assumimos que a senha está em texto plano
        // Em produção, use bcrypt ou similar para comparar hashes
        if (userData.password_hash !== password) {
            throw new Error('Senha incorreta');
        }

        // Criar sessão simples (armazenar no localStorage)
        const sessionData = {
            userId: userData.id,
            username: userData.username,
            fullName: userData.full_name,
            role: userData.role,
            loginTime: new Date().toISOString()
        };

        localStorage.setItem('userSession', JSON.stringify(sessionData));

        console.log('Login bem-sucedido:', sessionData);
        // Redirecionar para página principal ou dashboard
        window.location.href = 'dashboard.html';

    } catch (error) {
        console.error('Erro no login:', error.message);
        showMessage('Erro no login: ' + error.message, 'error');
    }
}

// Função para fazer logout
function logoutUser() {
    // Remover sessão do localStorage
    localStorage.removeItem('userSession');
    console.log('Logout bem-sucedido');
    window.location.href = 'index.html';
}

// Função para verificar se usuário está logado e validar no banco
async function checkUser() {
    try {
        const sessionData = localStorage.getItem('userSession');
        if (!sessionData) {
            console.log('Nenhum usuário logado');
            return null;
        }

        const session = JSON.parse(sessionData);

        // Validar se o usuário ainda existe e está ativo no banco
        const { data: userData, error } = await supabaseClient
            .from('users')
            .select('id, username, full_name, role, is_active')
            .eq('username', session.username)
            .eq('is_active', true)
            .single();

        if (error || !userData) {
            console.log('Usuário não encontrado ou inativo no banco');
            // Limpar sessão inválida
            localStorage.removeItem('userSession');
            return null;
        }

        // Atualizar sessão com dados mais recentes do banco
        const updatedSession = {
            userId: userData.id,
            username: userData.username,
            fullName: userData.full_name,
            role: userData.role,
            loginTime: session.loginTime // Manter horário original do login
        };

        // Salvar sessão atualizada
        localStorage.setItem('userSession', JSON.stringify(updatedSession));

        // console.log('Usuário validado:', updatedSession);
        return updatedSession;

    } catch (error) {
        console.error('Erro ao validar usuário:', error);
        // Em caso de erro, limpar sessão
        localStorage.removeItem('userSession');
        return null;
    }
}

// Função para obter usuário logado (compatibilidade com outros scripts)
async function getLoggedUser() {
    return await checkUser();
}

// Função para verificar se o usuário está logado antes de navegar
function checkLoginBeforeNavigate(href) {
    const sessionData = localStorage.getItem('userSession');
    if (!sessionData) {
        console.log('Nenhum usuário logado, redirecionando para login...');
        window.location.href = 'index.html';
        return false;
    }
    // Se logado, permitir navegação
    window.location.href = href;
    return true;
}

// Função para mostrar mensagens
function showMessage(message, type = 'info') {
    const messageDiv = document.getElementById('message');
    if (messageDiv) {
        messageDiv.textContent = message;
        messageDiv.className = `message ${type}`;
        messageDiv.style.display = 'block';

        // Esconder mensagem após 5 segundos
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 5000);
    }
}

// Event listeners quando DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            // Desabilitar botão durante login
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Entrando...';

            loginUser(username, password).finally(() => {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Entrar';
            });
        });
    }

    // Verificar se há botão de logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logoutUser);
    }

    // Verificar status de login na página
    checkUser().then(user => {
        if (user && document.getElementById('welcome-message')) {
            document.getElementById('welcome-message').textContent = `Bem-vindo, ${user.fullName || user.username}!`;
        }
        if (user && document.getElementById('user-role')) {
            document.getElementById('user-role').textContent = `Nível de Acesso: ${user.role || 'Não definido'}`;
        }
    });
});
