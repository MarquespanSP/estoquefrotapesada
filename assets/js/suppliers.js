// Script JavaScript para gerenciamento de fornecedores

// Variável para controlar modo de edição
let editingSupplierId = null;

// Função para fechar o modal de edição
function closeEditModal() {
    document.getElementById('edit-supplier-modal').style.display = 'none';
    document.getElementById('edit-supplier-form').reset();
    document.getElementById('edit-message').style.display = 'none';
    editingSupplierId = null;
}

// Carregar fornecedores quando a página carregar
document.addEventListener('DOMContentLoaded', async function() {
    await checkAuth();
    loadSuppliers();
    setupFormValidation();
    loadUserInfo();
});

// Verificar autenticação (igual ao fleet.js)
async function checkAuth() {
    const user = await getLoggedUser();
    currentUser = user;

    if (!user) {
        window.location.href = 'index.html';
        return;
    }
}

async function loadUserInfo() {
    try {
        const user = await getLoggedUser();
        if (user) {
            document.getElementById('user-info').textContent = `Usuário: ${user.fullName || user.username} (${user.role})`;
        } else {
            // Redirecionar para login se não estiver logado
            window.location.href = 'index.html';
        }
    } catch (error) {
        console.error('Erro ao carregar informações do usuário:', error);
        // Redirecionar para login em caso de erro
        window.location.href = 'index.html';
    }
}

function setupFormValidation() {
    const supplierNameInput = document.getElementById('supplier_name');

    supplierNameInput.addEventListener('input', function() {
        // Capitalizar primeira letra de cada palavra
        this.value = this.value.replace(/\b\w/g, l => l.toUpperCase());
    });

    const form = document.getElementById('supplier-form');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            registerSupplier();
        });
    }

    // Configurar validação para o formulário de edição no modal
    const editForm = document.getElementById('edit-supplier-form');
    if (editForm) {
        editForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveSupplier();
        });
    }

    // Configurar capitalização para o campo de edição
    const editSupplierNameInput = document.getElementById('edit_supplier_name');
    if (editSupplierNameInput) {
        editSupplierNameInput.addEventListener('input', function() {
            // Capitalizar primeira letra de cada palavra
            this.value = this.value.replace(/\b\w/g, l => l.toUpperCase());
        });
    }
}

async function registerSupplier() {
    try {
        const supplierName = document.getElementById('supplier_name').value.trim();
        const supplierContact = document.getElementById('supplier_contact').value.trim();

        // Validações
        if (!supplierName) {
            throw new Error('Nome do fornecedor é obrigatório');
        }

        // Verificar se o nome do fornecedor já existe
        const { data: existingSuppliers, error: checkError } = await supabaseClient
            .from('suppliers')
            .select('name')
            .eq('name', supplierName)
            .limit(1);

        if (checkError) throw checkError;

        if (existingSuppliers && existingSuppliers.length > 0) {
            throw new Error('Este fornecedor já está cadastrado');
        }

        // Obter usuário logado
        const userSession = await getLoggedUser();
        if (!userSession) {
            throw new Error('Usuário não autenticado');
        }

        // Inserir novo fornecedor
        const { data: newSupplier, error: insertError } = await supabaseClient
            .from('suppliers')
            .insert([
                {
                    name: supplierName,
                    contact_info: supplierContact || null,
                    created_by: userSession.username,
                    created_at: new Date().toISOString(),
                    is_active: true
                }
            ])
            .select()
            .single();

        if (insertError) {
            throw new Error('Erro ao cadastrar fornecedor: ' + insertError.message);
        }

        console.log('Fornecedor cadastrado com sucesso:', newSupplier);
        showMessage('Fornecedor cadastrado com sucesso!', 'success');

        // Limpar formulário e recarregar lista
        resetForm();
        loadSuppliers();

    } catch (error) {
        console.error('Erro no cadastro de fornecedor:', error.message);
        showMessage('Erro no cadastro: ' + error.message, 'error');
    }
}

async function loadSuppliers() {
    try {
        const { data: suppliers, error } = await supabaseClient
            .from('suppliers')
            .select('id, name, contact_info, created_at, created_by')
            .eq('is_active', true)
            .order('name');

        if (error) throw error;

        const tbody = document.getElementById('suppliers-tbody');
        tbody.innerHTML = '';

        if (suppliers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #666; font-style: italic;">Nenhum fornecedor cadastrado ainda.</td></tr>';
            return;
        }

        suppliers.forEach(supplier => {
            const row = document.createElement('tr');

            // Nome do fornecedor (editável)
            const nameCell = document.createElement('td');
            const nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.value = supplier.name;
            nameInput.className = 'editable-field';
            nameInput.dataset.supplierId = supplier.id;
            nameInput.dataset.field = 'name';
            nameInput.addEventListener('blur', updateSupplierField);
            nameInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    this.blur();
                }
            });
            nameCell.appendChild(nameInput);
            row.appendChild(nameCell);

            // Informações de contato (editável)
            const contactCell = document.createElement('td');
            const contactTextarea = document.createElement('textarea');
            contactTextarea.value = supplier.contact_info || '';
            contactTextarea.className = 'editable-field';
            contactTextarea.rows = 2;
            contactTextarea.dataset.supplierId = supplier.id;
            contactTextarea.dataset.field = 'contact_info';
            contactTextarea.addEventListener('blur', updateSupplierField);
            contactTextarea.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.blur();
                }
            });
            contactCell.appendChild(contactTextarea);
            row.appendChild(contactCell);

            // Data de cadastro
            const dateCell = document.createElement('td');
            dateCell.textContent = new Date(supplier.created_at).toLocaleString('pt-BR');
            dateCell.innerHTML += `<br><small>por ${supplier.created_by}</small>`;
            row.appendChild(dateCell);

            // Ações
            const actionsCell = document.createElement('td');
            const viewBtn = document.createElement('button');
            viewBtn.className = 'btn btn-small';
            viewBtn.textContent = 'Ver Detalhes';
            viewBtn.onclick = () => viewSupplierDetails(supplier.id);
            actionsCell.appendChild(viewBtn);

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-small btn-danger';
            deleteBtn.textContent = 'Excluir';
            deleteBtn.onclick = () => deleteSupplier(supplier.id, supplier.name);
            actionsCell.appendChild(deleteBtn);
            row.appendChild(actionsCell);

            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Erro ao carregar fornecedores:', error);
        showMessage('Erro ao carregar fornecedores. Tente novamente.', 'error');
    }
}

async function deleteSupplier(supplierId, supplierName) {
    if (!confirm(`Tem certeza que deseja excluir o fornecedor "${supplierName}"?`)) {
        return;
    }

    try {
        // Verificar se o fornecedor está sendo usado em peças
        const { data: pieces, error: checkError } = await supabaseClient
            .from('pieces')
            .select('id')
            .eq('supplier_id', supplierId)
            .limit(1);

        if (checkError) throw checkError;

        if (pieces.length > 0) {
            throw new Error('Não é possível excluir este fornecedor pois existem peças associadas a ele');
        }

        // Desativar fornecedor (soft delete)
        const { error: deleteError } = await supabaseClient
            .from('suppliers')
            .update({ is_active: false })
            .eq('id', supplierId);

        if (deleteError) {
            throw new Error('Erro ao excluir fornecedor: ' + deleteError.message);
        }

        showMessage('Fornecedor excluído com sucesso!', 'success');
        loadSuppliers();

    } catch (error) {
        console.error('Erro ao excluir fornecedor:', error.message);
        showMessage('Erro ao excluir: ' + error.message, 'error');
    }
}

async function editSupplier(supplierId) {
    try {
        // Buscar dados do fornecedor
        const { data: supplier, error } = await supabaseClient
            .from('suppliers')
            .select('id, name, contact_info')
            .eq('id', supplierId)
            .single();

        if (error) throw error;

        // Preencher formulário do modal
        document.getElementById('edit_supplier_name').value = supplier.name;
        document.getElementById('edit_supplier_contact').value = supplier.contact_info || '';

        // Definir modo de edição
        editingSupplierId = supplierId;

        // Mostrar modal
        document.getElementById('edit-supplier-modal').style.display = 'block';

        // Focar no campo de nome
        document.getElementById('edit_supplier_name').focus();

    } catch (error) {
        console.error('Erro ao carregar fornecedor para edição:', error);
        showMessage('Erro ao carregar fornecedor para edição.', 'error');
    }
}

// Função para salvar fornecedor (usada no modal de edição)
async function saveSupplier() {
    try {
        const supplierName = document.getElementById('edit_supplier_name').value.trim();
        const supplierContact = document.getElementById('edit_supplier_contact').value.trim();

        // Validações
        if (!supplierName) {
            throw new Error('Nome do fornecedor é obrigatório');
        }

        // Verificar se o nome já existe em outro fornecedor
        const { data: existingSuppliers, error: checkError } = await supabaseClient
            .from('suppliers')
            .select('id, name')
            .eq('name', supplierName)
            .neq('id', editingSupplierId)
            .limit(1);

        if (checkError) throw checkError;

        if (existingSuppliers && existingSuppliers.length > 0) {
            throw new Error('Este nome de fornecedor já está sendo usado por outro fornecedor');
        }

        // Atualizar fornecedor
        const { data: updatedSupplier, error: updateError } = await supabaseClient
            .from('suppliers')
            .update({
                name: supplierName,
                contact_info: supplierContact || null
            })
            .eq('id', editingSupplierId)
            .select()
            .single();

        if (updateError) {
            throw new Error('Erro ao atualizar fornecedor: ' + updateError.message);
        }

        console.log('Fornecedor atualizado com sucesso:', updatedSupplier);

        // Fechar modal e mostrar mensagem de sucesso
        closeEditModal();
        showMessage('Fornecedor atualizado com sucesso!', 'success');

        // Recarregar lista
        loadSuppliers();

    } catch (error) {
        console.error('Erro na atualização do fornecedor:', error.message);
        showEditMessage('Erro na atualização: ' + error.message, 'error');
    }
}

// Função para mostrar mensagens no modal de edição
function showEditMessage(message, type = 'info') {
    const messageDiv = document.getElementById('edit-message');
    if (messageDiv) {
        messageDiv.textContent = message;
        messageDiv.className = `message ${type}`;
        messageDiv.style.display = 'block';
    }
}

// Função para ver detalhes do fornecedor
async function viewSupplierDetails(supplierId) {
    try {
        console.log('Buscando detalhes do fornecedor ID:', supplierId);

        // Buscar dados completos do fornecedor
        const { data: supplier, error } = await supabaseClient
            .from('suppliers')
            .select('id, name, contact_info, created_at, created_by, is_active')
            .eq('id', supplierId)
            .single();

        if (error) {
            console.error('Erro ao buscar fornecedor:', error);
            throw error;
        }

        console.log('Fornecedor encontrado:', supplier);

        // Buscar peças associadas ao fornecedor
        const { data: pieces, error: piecesError } = await supabaseClient
            .from('pieces')
            .select('id, name, quantity, min_stock, supplier_id')
            .eq('supplier_id', supplierId)
            .eq('is_active', true);

        if (piecesError) {
            console.error('Erro ao buscar peças:', piecesError);
            throw piecesError;
        }

        console.log('Peças encontradas:', pieces);

        // Construir conteúdo do modal
        const detailsContent = document.getElementById('supplier-details-content');
        detailsContent.innerHTML = `
            <div class="supplier-details">
                <div class="detail-section">
                    <h4>Informações Gerais</h4>
                    <div class="detail-row">
                        <strong>Nome:</strong> <span>${supplier.name}</span>
                    </div>
                    <div class="detail-row">
                        <strong>Contato:</strong> <span>${supplier.contact_info || 'Não informado'}</span>
                    </div>
                    <div class="detail-row">
                        <strong>Cadastrado em:</strong> <span>${new Date(supplier.created_at).toLocaleString('pt-BR')}</span>
                    </div>
                    <div class="detail-row">
                        <strong>Cadastrado por:</strong> <span>${supplier.created_by}</span>
                    </div>
                    <div class="detail-row">
                        <strong>Status:</strong> <span class="${supplier.is_active ? 'status-active' : 'status-inactive'}">${supplier.is_active ? 'Ativo' : 'Inativo'}</span>
                    </div>
                </div>

                <div class="detail-section">
                    <h4>Peças Fornecidas (${pieces ? pieces.length : 0})</h4>
                    ${pieces && pieces.length > 0 ? `
                        <div class="pieces-list">
                            ${pieces.map(piece => `
                                <div class="piece-item">
                                    <div class="piece-info">
                                        <strong>${piece.name}</strong>
                                        <span>Quantidade: ${piece.quantity} | Estoque mínimo: ${piece.min_stock}</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : '<p class="no-pieces">Nenhuma peça associada a este fornecedor.</p>'}
                </div>

                <div class="detail-actions">
                    <button class="btn" onclick="editSupplier(${supplier.id})">Editar Fornecedor</button>
                    <button class="btn btn-danger" onclick="deleteSupplier(${supplier.id}, '${supplier.name}')">Excluir Fornecedor</button>
                </div>
            </div>
        `;

        // Mostrar modal
        document.getElementById('supplier-details-modal').style.display = 'block';

    } catch (error) {
        console.error('Erro ao carregar detalhes do fornecedor:', error);
        showMessage('Erro ao carregar detalhes do fornecedor.', 'error');
    }
}

// Função para fechar o modal de detalhes
function closeDetailsModal() {
    document.getElementById('supplier-details-modal').style.display = 'none';
    document.getElementById('supplier-details-content').innerHTML = '';
}

function resetForm() {
    document.getElementById('supplier-form').reset();
    editingSupplierId = null;

    // Voltar texto do botão
    const submitBtn = document.querySelector('#supplier-form button[type="submit"]');
    submitBtn.textContent = 'Cadastrar Fornecedor';
}

// Função para atualizar campo específico do fornecedor
async function updateSupplierField(event) {
    const input = event.target;
    const supplierId = parseInt(input.dataset.supplierId);
    const field = input.dataset.field;
    const newValue = input.value.trim();

    // Validações básicas
    if (field === 'name' && !newValue) {
        showMessage('Nome do fornecedor não pode estar vazio.', 'error');
        // Reverter valor
        const { data: supplier } = await supabaseClient
            .from('suppliers')
            .select(field)
            .eq('id', supplierId)
            .single();
        input.value = supplier[field];
        return;
    }

    try {
        // Verificar duplicatas para nome
        if (field === 'name') {
            const { data: existingSuppliers, error: checkError } = await supabaseClient
                .from('suppliers')
                .select('id, name')
                .eq('name', newValue)
                .neq('id', supplierId)
                .limit(1);

            if (checkError) throw checkError;

            if (existingSuppliers && existingSuppliers.length > 0) {
                throw new Error('Este nome de fornecedor já está sendo usado por outro fornecedor');
            }
        }

        // Atualizar campo específico
        const updateData = {};
        updateData[field] = field === 'contact_info' ? (newValue || null) : newValue;

        const { error: updateError } = await supabaseClient
            .from('suppliers')
            .update(updateData)
            .eq('id', supplierId);

        if (updateError) {
            throw new Error('Erro ao atualizar fornecedor: ' + updateError.message);
        }

        console.log(`Campo ${field} atualizado com sucesso para fornecedor ${supplierId}`);
        showMessage('Fornecedor atualizado com sucesso!', 'success');

    } catch (error) {
        console.error('Erro na atualização do fornecedor:', error.message);
        showMessage('Erro na atualização: ' + error.message, 'error');

        // Reverter valor em caso de erro
        try {
            const { data: supplier } = await supabaseClient
                .from('suppliers')
                .select(field)
                .eq('id', supplierId)
                .single();
            input.value = supplier[field] || '';
        } catch (revertError) {
            console.error('Erro ao reverter valor:', revertError);
        }
    }
}
