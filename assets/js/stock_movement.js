// Script JavaScript para movimentação de estoque

let selectedPiece = null;

// Carregar dados quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    loadLocations();
    setupPieceSearch();
    setupFormValidation();
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
    document.getElementById('selected_piece').value = `${piece.code} - ${piece.name}`;
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

async function registerMovement() {
    try {
        const movementType = document.getElementById('movement_type').value;
        const quantity = parseInt(document.getElementById('quantity').value);
        const locationId = document.getElementById('location').value;

        // Validações
        if (!selectedPiece) {
            throw new Error('Selecione uma peça');
        }

        if (!quantity || quantity <= 0) {
            throw new Error('Quantidade deve ser maior que zero');
        }

        if (!locationId) {
            throw new Error('Selecione um local');
        }

        // Obter usuário logado
        const userSession = await getLoggedUser();
        if (!userSession) {
            throw new Error('Usuário não autenticado');
        }

        // Verificar estoque atual se for saída
        if (movementType === 'saida') {
            const { data: currentStock, error: stockError } = await supabaseClient
                .from('stock_movements')
                .select('quantity')
                .eq('piece_id', selectedPiece.id)
                .eq('location_id', locationId);

            if (stockError) throw stockError;

            const totalStock = currentStock.reduce((sum, movement) => {
                return movement.quantity > 0 ? sum + movement.quantity : sum;
            }, 0);

            if (totalStock < quantity) {
                throw new Error(`Estoque insuficiente. Disponível: ${totalStock}`);
            }
        }

        // Registrar movimentação
        const movementQuantity = movementType === 'entrada' ? quantity : -quantity;

        const { data: movement, error: insertError } = await supabaseClient
            .from('stock_movements')
            .insert([
                {
                    piece_id: selectedPiece.id,
                    location_id: locationId,
                    quantity: movementQuantity,
                    movement_type: movementType,
                    created_by: userSession.username,
                    created_at: new Date().toISOString()
                }
            ])
            .select()
            .single();

        if (insertError) {
            throw new Error('Erro ao registrar movimentação: ' + insertError.message);
        }

        console.log('Movimentação registrada com sucesso:', movement);
        showMessage(`Movimentação de ${movementType} registrada com sucesso!`, 'success');

        // Limpar formulário
        document.getElementById('movement-form').reset();
        selectedPiece = null;
        document.getElementById('selected_piece').value = '';

    } catch (error) {
        console.error('Erro na movimentação:', error.message);
        showMessage('Erro na movimentação: ' + error.message, 'error');
    }
}
