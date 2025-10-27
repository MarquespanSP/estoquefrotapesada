// Script JavaScript para movimentação de estoque

let selectedPiece = null;
let selectedPieces = []; // Array para armazenar múltiplas peças selecionadas

// Carregar dados quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    loadLocations();
    setupPieceSearch();
    setupFormValidation();
    setupAddPieceButton();
    setupSaveAllButton();
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
                .select('location_id, locations(code, description)')
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
        selectedPieces.push({
            piece: selectedPiece,
            quantity: quantity,
            location: defaultLocation
        });

        // Atualizar interface
        updateSelectedPiecesTable();

        // Limpar campos
        document.getElementById('piece_search').value = '';
        document.getElementById('quantity').value = '';
        selectedPiece = null;

        showMessage('Peça adicionada à lista!', 'success');

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
            locationCell.textContent = item.location ? `${item.location.code}${item.location.description ? ' - ' + item.location.description : ''}` : 'Local não definido';
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
