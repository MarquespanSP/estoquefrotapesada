// Script JavaScript para batimento de estoque

let selectedPiece = null;

// Carregar dados quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    checkUserAccess();
    loadLocations();
    setupPieceSearch();
    setupFormValidation();
    loadUserInfo();
});

async function checkUserAccess() {
    try {
        const user = await getLoggedUser();
        if (!user) {
            window.location.href = 'index.html';
            return;
        }

        // Verificar se usuário tem permissão (Administrador, Diretoria, Supervisor)
        const allowedRoles = ['Administrador', 'Diretoria', 'Supervisor'];
        if (!allowedRoles.includes(user.role)) {
            document.getElementById('access-denied').style.display = 'block';
            document.getElementById('batimento-content').style.display = 'none';
            return;
        }

        // Usuário autorizado
        document.getElementById('access-denied').style.display = 'none';
        document.getElementById('batimento-content').style.display = 'block';

    } catch (error) {
        console.error('Erro ao verificar acesso:', error);
        window.location.href = 'index.html';
    }
}

async function loadUserInfo() {
    try {
        const user = await getLoggedUser();
        if (user) {
            document.getElementById('user-info').textContent = `Usuário: ${user.fullName || user.username} (${user.role})`;
        }
    } catch (error) {
        console.error('Erro ao carregar informações do usuário:', error);
    }
}

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

    // Quando local muda, recalcular estoque atual
    document.getElementById('location').addEventListener('change', function() {
        if (selectedPiece && this.value) {
            calculateCurrentStock(selectedPiece.id, this.value);
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

    // Calcular estoque atual se local já estiver selecionado
    const locationId = document.getElementById('location').value;
    if (locationId) {
        calculateCurrentStock(piece.id, locationId);
    }
}

async function calculateCurrentStock(pieceId, locationId) {
    try {
        const { data: movements, error } = await supabaseClient
            .from('stock_movements')
            .select('quantity')
            .eq('piece_id', pieceId)
            .eq('location_id', locationId);

        if (error) throw error;

        const currentStock = movements.reduce((sum, movement) => sum + movement.quantity, 0);
        document.getElementById('current_stock').value = currentStock;

    } catch (error) {
        console.error('Erro ao calcular estoque atual:', error);
        document.getElementById('current_stock').value = 'Erro ao calcular';
    }
}

function setupFormValidation() {
    const form = document.getElementById('batimento-form');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            performBatimento();
        });
    }
}

async function performBatimento() {
    try {
        const locationId = document.getElementById('location').value;
        const currentStock = parseInt(document.getElementById('current_stock').value) || 0;
        const physicalStock = parseInt(document.getElementById('physical_stock').value);
        const adjustmentReason = document.getElementById('adjustment_reason').value.trim();

        // Validações
        if (!selectedPiece) {
            throw new Error('Selecione uma peça');
        }

        if (!locationId) {
            throw new Error('Selecione um local');
        }

        if (physicalStock < 0) {
            throw new Error('Estoque físico não pode ser negativo');
        }

        if (!adjustmentReason) {
            throw new Error('Motivo do ajuste é obrigatório');
        }

        // Calcular diferença
        const difference = physicalStock - currentStock;

        if (difference === 0) {
            throw new Error('Não há diferença entre estoque físico e sistema. Batimento não necessário.');
        }

        // Obter usuário logado
        const userSession = await getLoggedUser();
        if (!userSession) {
            throw new Error('Usuário não autenticado');
        }

        // Registrar batimento como movimentação de ajuste
        const { data: batimento, error: insertError } = await supabaseClient
            .from('stock_movements')
            .insert([
                {
                    piece_id: selectedPiece.id,
                    location_id: locationId,
                    quantity: difference,
                    movement_type: difference > 0 ? 'entrada' : 'saida',
                    created_by: userSession.username,
                    created_at: new Date().toISOString(),
                    notes: `BATIMENTO: ${adjustmentReason}. Estoque anterior: ${currentStock}, Contagem física: ${physicalStock}`
                }
            ])
            .select()
            .single();

        if (insertError) {
            throw new Error('Erro ao registrar batimento: ' + insertError.message);
        }

        console.log('Batimento registrado com sucesso:', batimento);

        const action = difference > 0 ? 'entrada' : 'saída';
        const quantity = Math.abs(difference);
        showMessage(`Batimento realizado com sucesso! Registrada ${action} de ${quantity} unidade(s).`, 'success');

        // Limpar formulário
        document.getElementById('batimento-form').reset();
        selectedPiece = null;
        document.getElementById('selected_piece').value = '';

        // Recarregar histórico
        loadBatimentoHistory();

    } catch (error) {
        console.error('Erro no batimento:', error.message);
        showMessage('Erro no batimento: ' + error.message, 'error');
    }
}

async function loadBatimentoHistory() {
    try {
        const { data: batimentos, error } = await supabaseClient
            .from('stock_movements')
            .select(`
                id,
                quantity,
                created_at,
                created_by,
                notes,
                pieces!inner(code, name),
                locations!inner(code, description)
            `)
            .ilike('notes', '%BATIMENTO%')
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) throw error;

        const container = document.getElementById('batimento-history-container');

        if (batimentos.length === 0) {
            container.innerHTML = '<p>Nenhum batimento registrado ainda.</p>';
            return;
        }

        let html = '<table class="data-table"><thead><tr><th>Data/Hora</th><th>Peça</th><th>Local</th><th>Ajuste</th><th>Motivo</th><th>Usuário</th></tr></thead><tbody>';

        batimentos.forEach(batimento => {
            const date = new Date(batimento.created_at).toLocaleString('pt-BR');
            const adjustment = batimento.quantity > 0 ?
                `+${batimento.quantity}` :
                batimento.quantity;

            html += `
                <tr>
                    <td>${date}</td>
                    <td>${batimento.pieces.code} - ${batimento.pieces.name}</td>
                    <td>${batimento.locations.code}</td>
                    <td>${adjustment}</td>
                    <td>${batimento.notes.replace('BATIMENTO: ', '')}</td>
                    <td>${batimento.created_by}</td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        container.innerHTML = html;

    } catch (error) {
        console.error('Erro ao carregar histórico:', error);
        document.getElementById('batimento-history-container').innerHTML =
            '<p class="error">Erro ao carregar histórico de batimentos.</p>';
    }
}

// Carregar histórico ao iniciar (se usuário tiver acesso)
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        if (document.getElementById('batimento-content').style.display !== 'none') {
            loadBatimentoHistory();
        }
    }, 1000);
});
