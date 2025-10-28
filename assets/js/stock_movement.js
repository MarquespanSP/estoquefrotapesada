// Script JavaScript para movimentação de estoque

let selectedPiece = null;
let selectedPieces = []; // Array para armazenar múltiplas peças selecionadas
let currentEditingIndex = null; // Índice da peça sendo editada no modal

// Carregar dados quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    loadLocations();
    loadSuppliers();
    setupPieceSearch();
    setupFormValidation();
    setupAddPieceButton();
    setupSaveAllButton();
    setupLocationModal();
    setupPieceModal();
    setupSupplierModal();
});

async function loadLocations() {
    try {
        const { data: locations, error } = await supabaseClient
            .from('locations')
            .select('id, code, description')
            .eq('is_active', true)
            .order('code');

        if (error) throw error;

        const locationSelect = document.getElementById('location');
        locationSelect.innerHTML = '<option value="">Selecione um local</option>';

        locations.forEach(location => {
            const option = document.createElement('option');
            option.value = location.id;
            option.textContent = `${location.code}${location.description ? ' - ' + location.description : ''}`;
            locationSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao carregar locais:', error);
        showMessage('Erro ao carregar locais. Tente novamente.', 'error');
    }
}

function setupPieceSearch() {
    const searchInput = document.getElementById('piece_search');
    const suggestionsDiv = document.getElementById('piece_suggestions');

    searchInput.addEventListener('input', function() {
        const query = this.value.trim();
        if (query.length >= 2) {
            searchPieces(query);
        } else {
            suggestionsDiv.style.display = 'none';
        }
    });

    searchInput.addEventListener('focus', function() {
        if (this.value.trim().length >= 2) {
            searchPieces(this.value.trim());
        }
    });

    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !suggestionsDiv.contains(e.target)) {
            suggestionsDiv.style.display = 'none';
        }
    });
}

async function searchPieces(query) {
    try {
        const { data: pieces, error } = await supabaseClient
            .from('pieces')
            .select('id, code, name')
            .eq('is_active', true)
            .or(`code.ilike.%${query}%,name.ilike.%${query}%`)
            .order('code')
            .limit(10);

        if (error) throw error;

        const suggestionsDiv = document.getElementById('piece_suggestions');
        suggestionsDiv.innerHTML = '';

        if (pieces.length > 0) {
            pieces.forEach(piece => {
                const div = document.createElement('div');
                div.className = 'suggestion-item';
                div.textContent = `${piece.code} - ${piece.name}`;
                div.addEventListener('click', () => selectPiece(piece));
                suggestionsDiv.appendChild(div);
            });
            suggestionsDiv.style.display = 'block';
        } else {
            suggestionsDiv.style.display = 'none';
        }
    } catch (error) {
        console.error('Erro na busca de peças:', error);
    }
}

function selectPiece(piece) {
    selectedPiece = piece;
    document.getElementById('piece_search').value = `${piece.code} - ${piece.name}`;
    document.getElementById('piece_suggestions').style.display = 'none';
}

function setupFormValidation() {
    const form = document.getElementById('movement-form');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            registerMovement();
        });
    }
}

// Funções para gerenciar múltiplas peças
function setupAddPieceButton() {
    const addBtn = document.getElementById('add_piece_btn');
    if (addBtn) {
        addBtn.addEventListener('click', addPieceToList);
    }
}

function setupSaveAllButton() {
    const saveBtn = document.getElementById('save_all_movements_btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveAllMovements);
    }
}

async function addPieceToList() {
    try {
        const quantity = parseInt(document.getElementById('quantity').value);

        // Validações
        if (!selectedPiece) {
            throw new Error('Selecione uma peça primeiro');
        }

        if (!quantity || quantity <= 0) {
            throw new Error('Quantidade deve ser maior que zero');
        }

        // Verificar se a peça já foi adicionada
        const existingPiece = selectedPieces.find(p => p.piece.id === selectedPiece.id);
        if (existingPiece) {
            throw new Error('Esta peça já foi adicionada à lista');
        }

        // Buscar local padrão da peça (último local usado)
        let defaultLocation = null;
        try {
            const { data: lastMovement, error } = await supabaseClient
                .from('stock_movements')
                .select('location_id, locations(id, code, description)')
                .eq('piece_id', selectedPiece.id)
                .order('created_at', { ascending: false })
                .limit(1);

            if (!error && lastMovement && lastMovement.length > 0) {
                defaultLocation = lastMovement[0].locations;
            }
        } catch (error) {
            console.log('Não foi possível buscar local padrão:', error);
        }

        // Adicionar à lista
        const newIndex = selectedPieces.length;
        selectedPieces.push({
            piece: selectedPiece,
            quantity: quantity,
            location: defaultLocation
        });

        // Atualizar interface
        updateSelectedPiecesTable();

        // Se não há local padrão, abrir modal para seleção obrigatória
        if (!defaultLocation) {
            showMessage('Selecione o local para esta peça.', 'info');
            openLocationModal(newIndex);
        }

        // Limpar campos
        document.getElementById('piece_search').value = '';
        document.getElementById('quantity').value = '';
        selectedPiece = null;

        if (defaultLocation) {
            showMessage('Peça adicionada à lista!', 'success');
        }

    } catch (error) {
        console.error('Erro ao adicionar peça:', error);
        showMessage(error.message, 'error');
    }
}

function updateSelectedPiecesTable() {
    const table = document.getElementById('selected-pieces-table');
    const tbody = document.getElementById('selected-pieces-body');
    const noPiecesMsg = document.getElementById('no-pieces-message');
    const saveBtn = document.getElementById('save_all_movements_btn');

    if (selectedPieces.length > 0) {
        table.style.display = 'table';
        noPiecesMsg.style.display = 'none';
        saveBtn.style.display = 'block';

        tbody.innerHTML = '';

        selectedPieces.forEach((item, index) => {
            const row = document.createElement('tr');

            const pieceCell = document.createElement('td');
            pieceCell.textContent = `${item.piece.code} - ${item.piece.name}`;
            row.appendChild(pieceCell);

            const quantityCell = document.createElement('td');
            quantityCell.textContent = item.quantity;
            row.appendChild(quantityCell);

            const locationCell = document.createElement('td');
            const locationText = item.location ? `${item.location.code}${item.location.description ? ' - ' + item.location.description : ''}` : 'Local não definido';
            locationCell.innerHTML = `
                <span>${locationText}</span>
                <button onclick="openLocationModal(${index})" class="btn-small" style="margin-left: 10px;" title="Editar local">
                    ✏️
                </button>
            `;
            row.appendChild(locationCell);

            const actionsCell = document.createElement('td');
            const removeBtn = document.createElement('button');
            removeBtn.className = 'btn-small btn-danger';
            removeBtn.textContent = 'Remover';
            removeBtn.onclick = () => removePieceFromList(index);
            actionsCell.appendChild(removeBtn);
            row.appendChild(actionsCell);

            tbody.appendChild(row);
        });
    } else {
        table.style.display = 'none';
        noPiecesMsg.style.display = 'block';
        saveBtn.style.display = 'none';
    }
}

function removePieceFromList(index) {
    selectedPieces.splice(index, 1);
    updateSelectedPiecesTable();
    showMessage('Peça removida da lista!', 'info');
}

async function saveAllMovements() {
    if (selectedPieces.length === 0) {
        showMessage('Nenhuma peça para salvar!', 'error');
        return;
    }

    try {
        const movementType = document.getElementById('movement_type').value;

        // Obter usuário logado
        const userSession = await getLoggedUser();
        if (!userSession) {
            throw new Error('Usuário não autenticado');
        }

        // Preparar movimentações
        const movements = [];
        for (const item of selectedPieces) {
            // Se não tem local definido, tentar usar um local padrão ou pedir seleção
            if (!item.location) {
                throw new Error(`Local não definido para a peça ${item.piece.code}. Configure um local para esta peça primeiro.`);
            }

            // Verificar estoque se for saída
            if (movementType === 'saida') {
                const { data: currentStock, error: stockError } = await supabaseClient
                    .from('stock_movements')
                    .select('quantity')
                    .eq('piece_id', item.piece.id)
                    .eq('location_id', item.location.id);

                if (stockError) throw stockError;

                const totalStock = currentStock.reduce((sum, movement) => {
                    return movement.quantity > 0 ? sum + movement.quantity : sum;
                }, 0);

                if (totalStock < item.quantity) {
                    throw new Error(`Estoque insuficiente para ${item.piece.code}. Disponível: ${totalStock}, Solicitado: ${item.quantity}`);
                }
            }

            movements.push({
                piece_id: item.piece.id,
                location_id: item.location.id,
                quantity: movementType === 'entrada' ? item.quantity : -item.quantity,
                movement_type: movementType,
                created_by: userSession.username,
                created_at: new Date().toISOString()
            });
        }

        // Inserir todas as movimentações
        const { data: insertedMovements, error: insertError } = await supabaseClient
            .from('stock_movements')
            .insert(movements)
            .select();

        if (insertError) {
            throw new Error('Erro ao registrar movimentações: ' + insertError.message);
        }

        console.log('Movimentações registradas com sucesso:', insertedMovements);
        showMessage(`${movements.length} movimentações de ${movementType} registradas com sucesso!`, 'success');

        // Limpar lista
        selectedPieces = [];
        updateSelectedPiecesTable();

    } catch (error) {
        console.error('Erro ao salvar movimentações:', error);
        showMessage(error.message, 'error');
    }
}

// Funções do modal de localização
function setupLocationModal() {
    const modal = document.getElementById('location-modal');
    const closeBtn = modal.querySelector('.close');
    const locationForm = document.getElementById('location-form');

    // Fechar modal
    closeBtn.addEventListener('click', function() {
        modal.style.display = 'none';
        currentEditingIndex = null;
    });

    // Fechar modal clicando fora
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
            currentEditingIndex = null;
        }
    });

    // Submeter formulário do local
    locationForm.addEventListener('submit', function(e) {
        e.preventDefault();
        saveLocation();
    });
}

function openLocationModal(index) {
    currentEditingIndex = index;
    const item = selectedPieces[index];

    // Preencher informações da peça
    const pieceInfo = document.getElementById('selected-piece-info');
    pieceInfo.innerHTML = `
        <strong>Peça:</strong> ${item.piece.code} - ${item.piece.name}<br>
        <strong>Quantidade:</strong> ${item.quantity}
    `;

    // Preencher select com local atual
    const locationSelect = document.getElementById('location');
    if (item.location) {
        locationSelect.value = item.location.id;
    } else {
        locationSelect.value = '';
    }

    // Abrir modal
    document.getElementById('location-modal').style.display = 'block';
}

async function saveLocation() {
    if (currentEditingIndex === null) return;

    try {
        const locationId = document.getElementById('location').value;

        if (!locationId) {
            throw new Error('Selecione um local');
        }

        // Buscar dados completos do local
        const { data: location, error } = await supabaseClient
            .from('locations')
            .select('id, code, description')
            .eq('id', locationId)
            .single();

        if (error) throw error;

        // Atualizar local da peça
        selectedPieces[currentEditingIndex].location = location;

        // Atualizar tabela
        updateSelectedPiecesTable();

        // Fechar modal
        document.getElementById('location-modal').style.display = 'none';
        currentEditingIndex = null;

        showMessage('Local atualizado com sucesso!', 'success');

    } catch (error) {
        console.error('Erro ao salvar local:', error);
        showMessage(error.message, 'error');
    }
}

// Funções do modal de cadastro de peça
function setupPieceModal() {
    const addPieceBtn = document.getElementById('add-piece-btn');
    const modal = document.getElementById('piece-modal');
    const closeBtn = modal.querySelector('.close');
    const pieceForm = document.getElementById('piece-form');

    // Abrir modal
    addPieceBtn.addEventListener('click', function() {
        modal.style.display = 'block';
    });

    // Fechar modal
    closeBtn.addEventListener('click', function() {
        modal.style.display = 'none';
    });

    // Fechar modal clicando fora
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Submeter formulário da peça
    pieceForm.addEventListener('submit', function(e) {
        e.preventDefault();
        registerPiece();
    });
}

async function loadSuppliers() {
    try {
        const { data: suppliers, error } = await supabaseClient
            .from('suppliers')
            .select('id, name')
            .eq('is_active', true)
            .order('name');

        if (error) throw error;

        const supplierSelects = ['supplier', 'modal_supplier'];
        supplierSelects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                select.innerHTML = '<option value="">Selecione um fornecedor</option>';
                suppliers.forEach(supplier => {
                    const option = document.createElement('option');
                    option.value = supplier.id;
                    option.textContent = supplier.name;
                    select.appendChild(option);
                });
            }
        });
    } catch (error) {
        console.error('Erro ao carregar fornecedores:', error);
        showMessage('Erro ao carregar fornecedores. Tente novamente.', 'error');
    }
}

async function registerPiece() {
    try {
        const pieceCode = document.getElementById('modal_piece_code').value.trim();
        const pieceName = document.getElementById('modal_piece_name').value.trim();
        const supplierId = document.getElementById('modal_supplier').value;

        // Validações
        if (!pieceCode) {
            throw new Error('Código da peça é obrigatório');
        }
        if (!pieceName) {
            throw new Error('Nome da peça é obrigatório');
        }
        if (!supplierId) {
            throw new Error('Fornecedor é obrigatório');
        }

        // Verificar se código já existe
        const { data: existingPiece, error: checkError } = await supabaseClient
            .from('pieces')
            .select('id')
            .eq('code', pieceCode)
            .eq('is_active', true);

        if (checkError) throw checkError;

        if (existingPiece && existingPiece.length > 0) {
            throw new Error('Já existe uma peça com este código');
        }

        // Obter usuário logado
        const userSession = await getLoggedUser();
        if (!userSession) {
            throw new Error('Usuário não autenticado');
        }

        // Cadastrar peça
        const { data: newPiece, error: insertError } = await supabaseClient
            .from('pieces')
            .insert({
                code: pieceCode,
                name: pieceName,
                supplier_id: supplierId,
                created_by: userSession.username,
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (insertError) {
            throw new Error('Erro ao cadastrar peça: ' + insertError.message);
        }

        console.log('Peça cadastrada com sucesso:', newPiece);

        // Fechar modal e limpar formulário
        document.getElementById('piece-modal').style.display = 'none';
        document.getElementById('piece-form').reset();

        showMessage('Peça cadastrada com sucesso!', 'success');

    } catch (error) {
        console.error('Erro ao cadastrar peça:', error);
        showMessage(error.message, 'error');
    }
}

// Funções do modal de fornecedor
function setupSupplierModal() {
    const addSupplierBtn = document.getElementById('modal_add_supplier_btn');
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
    });

    // Fechar modal clicando fora
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Submeter formulário do fornecedor
    supplierForm.addEventListener('submit', function(e) {
        e.preventDefault();
        registerSupplier();
    });
}

async function registerSupplier() {
    try {
        const supplierName = document.getElementById('supplier_name').value.trim();
        const supplierContact = document.getElementById('supplier_contact').value.trim();

        // Validações
        if (!supplierName) {
            throw new Error('Nome do fornecedor é obrigatório');
        }

        // Verificar se nome já existe
        const { data: existingSupplier, error: checkError } = await supabaseClient
            .from('suppliers')
            .select('id')
            .eq('name', supplierName)
            .eq('is_active', true);

        if (checkError) throw checkError;

        if (existingSupplier && existingSupplier.length > 0) {
            throw new Error('Já existe um fornecedor com este nome');
        }

        // Obter usuário logado
        const userSession = await getLoggedUser();
        if (!userSession) {
            throw new Error('Usuário não autenticado');
        }

        // Cadastrar fornecedor
        const { data: newSupplier, error: insertError } = await supabaseClient
            .from('suppliers')
            .insert({
                name: supplierName,
                contact_info: supplierContact,
                created_by: userSession.username,
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (insertError) {
            throw new Error('Erro ao cadastrar fornecedor: ' + insertError.message);
        }

        console.log('Fornecedor cadastrado com sucesso:', newSupplier);

        // Recarregar fornecedores nos selects
        await loadSuppliers();

        // Fechar modal e limpar formulário
        document.getElementById('supplier-modal').style.display = 'none';
        document.getElementById('supplier-form').reset();

        showMessage('Fornecedor cadastrado com sucesso!', 'success');

    } catch (error) {
        console.error('Erro ao cadastrar fornecedor:', error);
        showMessage(error.message, 'error');
    }
}
