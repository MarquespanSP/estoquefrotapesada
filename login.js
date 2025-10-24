// Script JavaScript para integração com Supabase para login
// Substitua 'YOUR_SUPABASE_URL' e 'YOUR_SUPABASE_ANON_KEY' pelas suas credenciais do Supabase

const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

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
            loginTime: new Date().toISOString()
        };

        localStorage.setItem('userSession', JSON.stringify(sessionData));

        console.log('Login bem-sucedido:', sessionData);
        // Redirecionar para página principal ou dashboard
        window.location.href = 'dashboard.html';

    } catch (error) {
        console.error('Erro no login:', error.message);
        alert('Erro no login: ' + error.message);
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

// Event listener para formulário de login
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            loginUser(username, password);
        });
    }

    // Verificar se há botão de logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logoutUser);
    }

    // Verificar status de login na página
    checkUser();
});
