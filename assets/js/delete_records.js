ssets/js/delete_records.js</path>
<content">// Script JavaScript para exclusão de lançamentos

let currentDeleteItem = null;
let currentDeleteType = null;

// Funções de navegação entre abas
function showTab(tabName) {
    // Esconder todas as abas
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => tab.classList.remove('active'));

    // Remover classe active de todos os botões
    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(btn => btn.classList.remove('active'));

    // Mostrar aba selecionada
    document.getElementById(tabName + '-tab').classList.add('active');

    // Ativar botão selecionado
    event.target.classList.add('active');
}

// Carregar informações do usuário logado
document.addEventListener('DOMContentLoaded', function() {
    loadUserInfo();
});

async function loadUserInfo() {
    try {
        const user = await getLoggedUser();
        if (user) {
            document.getElementById('user-info').textContent = `Usuário: ${user.fullName || user.username} (${user.role})`;
        } else {
            window.location.href = 'index.html';
        }
    } catch (error) {
        console.error('Erro ao carregar informações do usuário:', error);
        window.location.href = 'index.html';
    }
}

// Buscar movimentações
async function searchMovements() {
    const searchTerm = document.getElementById('movement-search').value.trim();

    try {
        let query = supabaseClient
            .from('stock_movements')
            .select(`
                id,
                movement_type,
                quantity,
                movement_date,
                notes,
                pieces (code, name),
                locations (code, description),
                users (username, full_name)
            `)
            .order('movement_date', { ascending: false });

        // Se há termo de busca, filtrar; senão, buscar tudo
        if (searchTerm) {
            query = query.or(`pieces.code.ilike.%${searchTerm}%,id.eq.${searchTerm}`);
        }

        query = query.limit(100); // Aumentar limite para mostrar mais resultados

        const { data, error } = await query;

        if (error) throw error;

        displayMovements(data);
    } catch (error) {
        console.error('Erro ao buscar movimentações:', error);
        showMessage('Erro ao buscar movimentações', 'error');
    }
}

// Buscar peças
async function searchPieces() {
    const searchTerm = document.getElementById('piece-search').value.trim();

    try {
        let query = supabaseClient
            .from('pieces')
            .select(`
                id,
                code,
                name,
                suppliers (name),
                created_at
            `)
            .order('created_at', { ascending: false });

        // Se há termo de busca, filtrar; senão, buscar tudo
        if (searchTerm) {
            query = query.or(`code.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%`);
        }

        query = query.limit(100); // Aumentar limite para mostrar mais resultados

        const { data, error } = await query;

        if (error) throw error;

        displayPieces(data);
    } catch (error) {
        console.error('Erro ao buscar peças:', error);
        showMessage('Erro ao buscar peças', 'error');
    }
}

// Buscar locais
async function searchLocations() {
    const searchTerm = document.getElementById('location-search').value.trim();

    try {
        let query = supabaseClient
            .from('locations')
            .select('id, code, description, created_at')
            .order('created_at', { ascending: false });

        // Se há termo de busca, filtrar; senão, buscar tudo
        if (searchTerm) {
            query = query.ilike('code', `%${searchTerm}%`);
        }

        query = query.limit(100); // Aumentar limite para mostrar mais resultados

        const { data, error } = await query;

        if (error) throw error;

        displayLocations(data);
    } catch (error) {
        console.error('Erro ao buscar locais:', error);
        showMessage('Erro ao buscar locais', 'error');
    }
}

// Exibir movimentações
function displayMovements(movements) {
    const resultsDiv = document.getElementById('movements-results');

    if (movements.length === 0) {
        resultsDiv.innerHTML = '<p class="no-results">Nenhuma movimentação encontrada.</p>';
        return;
    }

    let html = '<div class="results-list">';

    movements.forEach(movement => {
        const date = new Date(movement.movement_date).toLocaleDateString('pt-BR');
        const type = movement.movement_type === 'in' ? 'Entrada' : 'Saída';
        const typeClass = movement.movement_type === 'in' ? 'movement-in' : 'movement-out';

        html += `
            <div class="result-item">
                <div class="result-info">
                    <strong>ID:</strong> ${movement.id}<br>
                    <strong>Peça:</strong> ${movement.pieces?.code || 'N/A'} - ${movement.pieces?.name || 'N/A'}<br>
                    <strong>Tipo:</strong> <span class="${typeClass}">${type}</span><br>
                    <strong>Quantidade:</strong> ${movement.quantity}<br>
                    <strong>Local:</strong> ${movement.locations?.code || 'N/A'}<br>
                    <strong>Data:</strong> ${date}<br>
                    <strong>Usuário:</strong> ${movement.users?.full_name || movement.users?.username || 'N/A'}
                    ${movement.notes ? `<br><strong>Observações:</strong> ${movement.notes}` : ''}
                </div>
                <div class="result-actions">
                    <button onclick="confirmDeleteMovement(${movement.id})" class="btn btn-danger btn-small">Excluir</button>
                </div>
            </div>
        `;
    });

    html += '</div>';
    resultsDiv.innerHTML = html;
}

// Exibir peças
function displayPieces(pieces) {
    const resultsDiv = document.getElementById('pieces-results');

    if (pieces.length === 0) {
        resultsDiv.innerHTML = '<p class="no-results">Nenhuma peça encontrada.</p>';
        return;
    }

    let html = '<div class="results-list">';

    pieces.forEach(piece => {
        const date = new Date(piece.created_at).toLocaleDateString('pt-BR');

        html += `
            <div class="result-item">
                <div class="result-info">
                    <strong>Código:</strong> ${piece.code}<br>
                    <strong>Nome:</strong> ${piece.name}<br>
                    <strong>Fornecedor:</strong> ${piece.suppliers?.name || 'N/A'}<br>
                    <strong>Data Cadastro:</strong> ${date}
                </div>
                <div class="result-actions">
                    <button onclick="confirmDeletePiece(${piece.id})" class="btn btn-danger btn-small">Excluir</button>
                </div>
            </div>
        `;
    });

    html += '</div>';
    resultsDiv.innerHTML = html;
}

// Exibir locais
function displayLocations(locations) {
    const resultsDiv = document.getElementById('locations-results');

    if (locations.length === 0) {
        resultsDiv.innerHTML = '<p class="no-results">Nenhum local encontrado.</p>';
        return;
    }

    let html = '<div class="results-list">';

    locations.forEach(location => {
        const date = new Date(location.created_at).toLocaleDateString('pt-BR');

        html += `
            <div class="result-item">
                <div class="result-info">
                    <strong>Código:</strong> ${location.code}<br>
                    <strong>Descrição:</strong> ${location.description}<br>
                    <strong>Data Cadastro:</strong> ${date}
                </div>
                <div class="result-actions">
                    <button onclick="confirmDeleteLocation(${location.id})" class="btn btn-danger btn-small">Excluir</button>
                </div>
            </div>
        `;
    });

    html += '</div>';
    resultsDiv.innerHTML = html;
}

// Funções de confirmação de exclusão
function confirmDeleteMovement(id) {
    currentDeleteItem = id;
    currentDeleteType = 'movement';
    document.getElementById('confirm-message').textContent = 'Tem certeza que deseja excluir esta movimentação? Esta ação não pode ser desfeita.';
    document.getElementById('confirm-modal').style.display = 'block';
}

function confirmDeletePiece(id) {
    currentDeleteItem = id;
    currentDeleteType = 'piece';
    document.getElementById('confirm-message').textContent = 'Tem certeza que deseja excluir esta peça? Todas as movimentações relacionadas também serão afetadas.';
    document.getElementById('confirm-modal').style.display = 'block';
}

function confirmDeleteLocation(id) {
    currentDeleteItem = id;
    currentDeleteType = 'location';
    document.getElementById('confirm-message').textContent = 'Tem certeza que deseja excluir este local? As peças neste local precisarão ser realocadas.';
    document.getElementById('confirm-modal').style.display = 'block';
}

// Executar exclusão
async function confirmDelete() {
    if (!currentDeleteItem || !currentDeleteType) return;

    try {
        let error;

        switch (currentDeleteType) {
            case 'movement':
                ({ error } = await supabaseClient
                    .from('stock_movements')
                    .delete()
                    .eq('id', currentDeleteItem));
                break;

            case 'piece':
                ({ error } = await supabaseClient
                    .from('pieces')
                    .delete()
                    .eq('id', currentDeleteItem));
                break;

            case 'location':
                ({ error } = await supabaseClient
                    .from('locations')
                    .delete()
                    .eq('id', currentDeleteItem));
                break;
        }

        if (error) throw error;

        showMessage('Item excluído com sucesso!', 'success');
        closeModal();

        // Recarregar resultados
        switch (currentDeleteType) {
            case 'movement':
                searchMovements();
                break;
            case 'piece':
                searchPieces();
                break;
            case 'location':
                searchLocations();
                break;
        }

        currentDeleteItem = null;
        currentDeleteType = null;

    } catch (error) {
        console.error('Erro ao excluir item:', error);
        showMessage('Erro ao excluir item', 'error');
    }
}

// Fechar modal
function closeModal() {
    document.getElementById('confirm-modal').style.display = 'none';
    currentDeleteItem = null;
    currentDeleteType = null;
}
