// Script JavaScript para registro de usuários com Supabase

// Função para registrar novo usuário
async function registerUser(fullName, username, password, confirmPassword, role) {
    try {
        // Validações básicas
        if (password !== confirmPassword) {
            throw new Error('As senhas não coincidem');
        }

        if (password.length < 6) {
            throw new Error('A senha deve ter pelo menos 6 caracteres');
        }

        // Verificar se o username já existe
        const { data: existingUser, error: checkError } = await supabaseClient
            .from('users')
            .select('username')
            .eq('username', username)
            .single();

        if (existingUser) {
            throw new Error('Este nome de usuário já está em uso');
        }



        // Inserir novo usuário
        const { data: newUser, error: insertError } = await supabaseClient
            .from('users')
            .insert([
                {
                    full_name: fullName,
                    username: username,
                    password_hash: password, // Nota: em produção, use hash seguro
                    role: role,
                    is_active: true
                }
            ])
            .select()
            .single();

        if (insertError) {
            throw new Error('Erro ao criar usuário: ' + insertError.message);
        }

        console.log('Usuário registrado com sucesso:', newUser);
        showMessage('Usuário registrado com sucesso! Você pode fazer login agora.', 'success');

        // Redirecionar para login após 2 segundos
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);

    } catch (error) {
        console.error('Erro no registro:', error.message);
        showMessage('Erro no registro: ' + error.message, 'error');
    }
}

// Event listeners quando DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const fullName = document.getElementById('full_name').value.trim();
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm_password').value;
            const role = document.getElementById('role').value;

            // Desabilitar botão durante registro
            const submitBtn = registerForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Cadastrando...';

            registerUser(fullName, username, password, confirmPassword, role).finally(() => {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Cadastrar';
            });
        });
    }
});
