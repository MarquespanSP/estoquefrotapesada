// Script JavaScript para cadastro de peças

// Carregar fornecedores quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    loadSuppliers();
    setupFormValidation();
    setupSupplierModal();
});

async function loadSuppliers() {
    try {
        const { data: suppliers, error } = await supabaseClient
            .from('suppliers')
            .select('id, name')
            .eq('is_active', true)
            .order('name');

        if (error) throw error;

        const supplierSelect = document.getElementById('supplier');
        supplierSelect.innerHTML = '<option value="">Selecione um fornecedor</option>';

        suppliers.forEach(supplier => {
            const option = document.createElement('option');
            option.value = supplier.id;
            option.textContent = supplier.name;
            supplierSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao carregar fornecedores:', error);
        showMessage('Erro ao carregar fornecedores. Tente novamente.', 'error');
    }
}

function setupFormValidation() {
    const pieceCodeInput = document.getElementById('piece_code');

    pieceCodeInput.addEventListener('input', function() {
        this.value = this.value.toUpperCase();
    });

    const form = document.getElementById('piece-form');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            registerPiece();
        });
    }
}

function setupSupplierModal() {
    const addSupplierBtn = document.getElementById('add-supplier-btn');
    const modal = document.getElementById('supplier-modal');
    const closeBtn = modal.querySelector('.close');
    const supplierForm = document.getElementById('supplier-form');

    // Abrir modal
    addSupplierBtn.addEventListener('click', function() {
        modal.style.display = 'block';
    });

    // Fechar modal
    closeBtn.addEventListener('click', function() {
        modal.style.display = 'none';
        supplierForm.reset();
    });

    // Fechar modal clicando fora
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
            supplierForm.reset();
        }
    });

    // Submeter formulário do fornecedor
    supplierForm.addEventListener('submit', function(e) {
        e.preventDefault();
        addSupplier();
    });
}

async function addSupplier() {
    try {
        const supplierName = document.getElementById('supplier_name').value.trim();
        const supplierContact = document.getElementById('supplier_contact').value.trim();

        if (!supplierName) {
            throw new Error('Nome do fornecedor é obrigatório');
        }

        // Verificar se o fornecedor já existe
        const { data: existingSupplier, error: checkError } = await supabaseClient
            .from('suppliers')
            .select('name')
            .eq('name', supplierName)
            .single();

        if (existingSupplier) {
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

        // Fechar modal e recarregar fornecedores
        document.getElementById('supplier-modal').style.display = 'none';
        document.getElementById('supplier-form').reset();
        await loadSuppliers();

    } catch (error) {
        console.error('Erro no cadastro de fornecedor:', error.message);
        showMessage('Erro no cadastro: ' + error.message, 'error');
    }
}

async function registerPiece() {
    try {
        const pieceCode = document.getElementById('piece_code').value.trim().toUpperCase();
        const pieceName = document.getElementById('piece_name').value.trim();
        const supplierId = document.getElementById('supplier').value;

        // Validações
        if (!pieceCode || !pieceName || !supplierId) {
            throw new Error('Todos os campos são obrigatórios');
        }

        // Verificar se o código da peça já existe
        const { data: existingPiece, error: checkError } = await supabaseClient
            .from('pieces')
            .select('code')
            .eq('code', pieceCode)
            .single();

        if (existingPiece) {
            throw new Error('Este código de peça já está cadastrado');
        }

        // Obter usuário logado
        const userSession = await getLoggedUser();
        if (!userSession) {
            throw new Error('Usuário não autenticado');
        }

        // Inserir nova peça
        const { data: newPiece, error: insertError } = await supabaseClient
            .from('pieces')
            .insert([
                {
                    code: pieceCode,
                    name: pieceName,
                    supplier_id: supplierId,
                    created_by: userSession.username,
                    created_at: new Date().toISOString(),
                    is_active: true
                }
            ])
            .select()
            .single();

        if (insertError) {
            throw new Error('Erro ao cadastrar peça: ' + insertError.message);
        }

        console.log('Peça cadastrada com sucesso:', newPiece);
        showMessage('Peça cadastrada com sucesso!', 'success');

        // Limpar formulário
        document.getElementById('piece-form').reset();

    } catch (error) {
        console.error('Erro no cadastro de peça:', error.message);
        showMessage('Erro no cadastro: ' + error.message, 'error');
    }
}
