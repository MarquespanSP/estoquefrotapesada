// Script JavaScript para autenticação com Supabase
// Substitua 'YOUR_SUPABASE_URL' e 'YOUR_SUPABASE_ANON_KEY' pelas suas credenciais do Supabase

const SUPABASE_URL = 'https://iutwaspoegvbebaemghy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1dHdhc3BvZWd2YmViYWVtZ2h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMDg0MzIsImV4cCI6MjA3Njg4NDQzMn0.orZgrWLHhps1wpKbeP_fKLeF0Xjog-ECYdIkxC_LcCc';

// Inicializar Supabase
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

// Função para verificar se usuário está logado (usando localStorage)
function checkUser() {
    const sessionData = localStorage.getItem('userSession');
    if (sessionData) {
        const session = JSON.parse(sessionData);
        console.log('Usuário logado:', session);
        return session;
    } else {
        console.log('Nenhum usuário logado');
        return null;
    }
}

// Função para mostrar mensagens
function showMessage(message, type) {
    const messageDiv = document.getElementById('message');
    if (messageDiv) {
        messageDiv.textContent = message;
        messageDiv.className = `message ${type}-message`;
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
    const user = checkUser();
    if (user && document.getElementById('welcome-message')) {
        document.getElementById('welcome-message').textContent = `Bem-vindo, ${user.fullName || user.username}!`;
    }
    if (user && document.getElementById('user-role')) {
        document.getElementById('user-role').textContent = `Nível de Acesso: ${user.role || 'Não definido'}`;
    }
});
