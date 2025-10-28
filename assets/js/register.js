// Script JavaScript para registro de usuários com Supabase

let currentEditingUserId = null;

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

        // Limpar formulário
        document.getElementById('register-form').reset();

        // Recarregar lista de usuários
        loadUsers();

        // Redirecionar para login após 2 segundos (opcional)
        // setTimeout(() => {
        //     window.location.href = 'index.html';
        // }, 2000);

    } catch (error) {
        console.error('Erro no registro:', error.message);
        showMessage('Erro no registro: ' + error.message, 'error');
    }
}

// Função para carregar usuários
async function loadUsers() {
    try {
        const loadingDiv = document.getElementById('loading-users');
        const noUsersDiv = document.getElementById('no-users');
        const table = document.getElementById('users-table');
        const tbody = document.getElementById('users-table-body');

        loadingDiv.style.display = 'block';
        noUsersDiv.style.display = 'none';
        table.style.display = 'none';

        const { data: users, error } = await supabaseClient
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        loadingDiv.style.display = 'none';

        if (users && users.length > 0) {
            table.style.display = 'table';
            tbody.innerHTML = '';

            users.forEach(user => {
                const row = document.createElement('tr');

                // Nome completo
                const fullNameCell = document.createElement('td');
                fullNameCell.textContent = user.full_name || '';
                row.appendChild(fullNameCell);

                // Usuário
                const usernameCell = document.createElement('td');
                usernameCell.textContent = user.username;
                row.appendChild(usernameCell);

                // Nível de acesso
                const roleCell = document.createElement('td');
                roleCell.textContent = user.role;
                row.appendChild(roleCell);

                // Status
                const statusCell = document.createElement('td');
                const statusBadge = document.createElement('span');
                statusBadge.className = user.is_active ? 'status-active' : 'status-inactive';
                statusBadge.textContent = user.is_active ? 'Ativo' : 'Inativo';
                statusCell.appendChild(statusBadge);
                row.appendChild(statusCell);

                // Data de criação
                const createdAtCell = document.createElement('td');
                const createdDate = new Date(user.created_at).toLocaleDateString('pt-BR');
                createdAtCell.textContent = createdDate;
                row.appendChild(createdAtCell);

                // Ações
                const actionsCell = document.createElement('td');
                const editBtn = document.createElement('button');
                editBtn.className = 'btn-small';
                editBtn.textContent = 'Editar';
                editBtn.onclick = () => openEditUserModal(user);
                actionsCell.appendChild(editBtn);
                row.appendChild(actionsCell);

                tbody.appendChild(row);
            });
        } else {
            noUsersDiv.style.display = 'block';
        }

    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        showMessage('Erro ao carregar usuários. Tente novamente.', 'error');
        document.getElementById('loading-users').style.display = 'none';
    }
}

// Função para abrir modal de edição
function openEditUserModal(user) {
    currentEditingUserId = user.id;

    document.getElementById('edit_full_name').value = user.full_name || '';
    document.getElementById('edit_username').value = user.username;
    document.getElementById('edit_role').value = user.role;
    document.getElementById('edit_is_active').value = user.is_active.toString();

    document.getElementById('edit-user-modal').style.display = 'block';
}

// Função para salvar edição do usuário
async function saveUserEdit(fullName, username, role, isActive) {
    try {
        const { data: updatedUser, error } = await supabaseClient
            .from('users')
            .update({
                full_name: fullName,
                username: username,
                role: role,
                is_active: isActive,
                updated_at: new Date().toISOString()
            })
            .eq('id', currentEditingUserId)
            .select()
            .single();

        if (error) throw error;

        console.log('Usuário atualizado:', updatedUser);
        showMessage('Usuário atualizado com sucesso!', 'success');

        // Fechar modal
        document.getElementById('edit-user-modal').style.display = 'none';
        currentEditingUserId = null;

        // Recarregar lista
        loadUsers();

    } catch (error) {
        console.error('Erro ao atualizar usuário:', error);
        showMessage('Erro ao atualizar usuário: ' + error.message, 'error');
    }
}

// Função para configurar modal de edição
function setupEditUserModal() {
    const modal = document.getElementById('edit-user-modal');
    const closeBtn = modal.querySelector('.close');
    const editForm = document.getElementById('edit-user-form');

    // Fechar modal
    closeBtn.addEventListener('click', function() {
        modal.style.display = 'none';
        currentEditingUserId = null;
    });

    // Fechar modal clicando fora
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
            currentEditingUserId = null;
        }
    });

    // Submeter formulário de edição
    editForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const fullName = document.getElementById('edit_full_name').value.trim();
        const username = document.getElementById('edit_username').value.trim();
        const role = document.getElementById('edit_role').value;
        const isActive = document.getElementById('edit_is_active').value === 'true';

        saveUserEdit(fullName, username, role, isActive);
    });
}

// Event listeners quando DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    // Carregar usuários na inicialização
    loadUsers();

    // Configurar modal de edição
    setupEditUserModal();

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
