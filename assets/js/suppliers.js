// Script JavaScript para gerenciamento de fornecedores

// Variável para controlar modo de edição
let editingSupplierId = null;

// Carregar fornecedores quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    loadSuppliers();
    setupFormValidation();
    loadUserInfo();
});

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
            if (editingSupplierId) {
                updateSupplier();
            } else {
                registerSupplier();
            }
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

        const container = document.getElementById('suppliers-container');
        container.innerHTML = '';

        if (suppliers.length === 0) {
            container.innerHTML = '<p>Nenhum fornecedor cadastrado ainda.</p>';
            return;
        }

        suppliers.forEach(supplier => {
            const supplierDiv = document.createElement('div');
            supplierDiv.className = 'location-item';
            supplierDiv.innerHTML = `
                <div class="location-info">
                    <strong>${supplier.name}</strong>
                    ${supplier.contact_info ? `<br><small>${supplier.contact_info.replace(/\n/g, '<br>')}</small>` : ''}
                    <br><small>Cadastrado em: ${new Date(supplier.created_at).toLocaleString('pt-BR')} por ${supplier.created_by}</small>
                </div>
                <div class="location-actions">
                    <button class="btn btn-small" onclick="editSupplier(${supplier.id})">Editar</button>
                    <button class="btn btn-small btn-danger" onclick="deleteSupplier(${supplier.id}, '${supplier.name.replace(/'/g, "\\'")}')">Excluir</button>
                </div>
            `;
            container.appendChild(supplierDiv);
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

        // Preencher formulário
        document.getElementById('supplier_name').value = supplier.name;
        document.getElementById('supplier_contact').value = supplier.contact_info || '';

        // Definir modo de edição
        editingSupplierId = supplierId;

        // Alterar texto do botão
        const submitBtn = document.querySelector('#supplier-form button[type="submit"]');
        submitBtn.textContent = 'Salvar';

        // Focar no campo de nome
        document.getElementById('supplier_name').focus();

        showMessage('Modo de edição ativado. Faça as alterações e clique em Salvar.', 'info');

    } catch (error) {
        console.error('Erro ao carregar fornecedor para edição:', error);
        showMessage('Erro ao carregar fornecedor para edição.', 'error');
    }
}

async function updateSupplier() {
    try {
        const supplierName = document.getElementById('supplier_name').value.trim();
        const supplierContact = document.getElementById('supplier_contact').value.trim();

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
        showMessage('Fornecedor atualizado com sucesso!', 'success');

        // Limpar formulário e recarregar lista
        resetForm();
        loadSuppliers();

    } catch (error) {
        console.error('Erro na atualização do fornecedor:', error.message);
        showMessage('Erro na atualização: ' + error.message, 'error');
    }
}

function resetForm() {
    document.getElementById('supplier-form').reset();
    editingSupplierId = null;

    // Voltar texto do botão
    const submitBtn = document.querySelector('#supplier-form button[type="submit"]');
    submitBtn.textContent = 'Cadastrar Fornecedor';
}
