// Script JavaScript para relatório de movimentações de estoque

let currentPage = 1;
const itemsPerPage = 50;
let allMovements = [];
let filteredMovements = [];

// Carregar dados quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    loadLocations();
    loadMovements();
    setupFilters();
    setupPagination();
    setupModal();
});

// Carregar locais para o filtro
async function loadLocations() {
    try {
        const { data: locations, error } = await supabaseClient
            .from('locations')
            .select('id, code, description')
            .eq('is_active', true)
            .order('code');

        if (error) throw error;

        const locationSelect = document.getElementById('filter-location');
        locations.forEach(location => {
            const option = document.createElement('option');
            option.value = location.id;
            option.textContent = `${location.code}${location.description ? ' - ' + location.description : ''}`;
            locationSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao carregar locais:', error);
    }
}

// Carregar todas as movimentações
async function loadMovements() {
    try {
        showLoading();

        const { data: movements, error } = await supabaseClient
            .from('stock_movements')
            .select(`
                id,
                quantity,
                movement_type,
                created_by,
                created_at,
                pieces (
                    id,
                    code,
                    name,
                    suppliers (
                        id,
                        name
                    )
                ),
                locations (
                    id,
                    code,
                    description
                )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        allMovements = movements || [];
        filteredMovements = [...allMovements];

        updateStatistics();
        renderTable();

    } catch (error) {
        console.error('Erro ao carregar movimentações:', error);
        showMessage('Erro ao carregar movimentações. Tente novamente.', 'error');
    }
}

// Configurar filtros
function setupFilters() {
    document.getElementById('apply-filters').addEventListener('click', applyFilters);
    document.getElementById('clear-filters').addEventListener('click', clearFilters);

    // Filtros em tempo real
    document.getElementById('filter-piece').addEventListener('input', debounce(applyFilters, 300));
    document.getElementById('filter-location').addEventListener('change', applyFilters);
    document.getElementById('filter-type').addEventListener('change', applyFilters);
    document.getElementById('filter-date-from').addEventListener('change', applyFilters);
    document.getElementById('filter-date-to').addEventListener('change', applyFilters);
}

// Aplicar filtros
function applyFilters() {
    const pieceFilter = document.getElementById('filter-piece').value.toLowerCase().trim();
    const locationFilter = document.getElementById('filter-location').value;
    const typeFilter = document.getElementById('filter-type').value;
    const dateFrom = document.getElementById('filter-date-from').value;
    const dateTo = document.getElementById('filter-date-to').value;

    filteredMovements = allMovements.filter(movement => {
        // Filtro por peça
        if (pieceFilter) {
            const pieceMatch = movement.pieces?.code?.toLowerCase().includes(pieceFilter) ||
                              movement.pieces?.name?.toLowerCase().includes(pieceFilter);
            if (!pieceMatch) return false;
        }

        // Filtro por local
        if (locationFilter && movement.locations?.id !== locationFilter) {
            return false;
        }

        // Filtro por tipo
        if (typeFilter && movement.movement_type !== typeFilter) {
            return false;
        }

        // Filtro por data
        if (dateFrom || dateTo) {
            const movementDate = new Date(movement.created_at).toISOString().split('T')[0];
            if (dateFrom && movementDate < dateFrom) return false;
            if (dateTo && movementDate > dateTo) return false;
        }

        return true;
    });

    currentPage = 1;
    updateStatistics();
    renderTable();
}

// Limpar filtros
function clearFilters() {
    document.getElementById('filter-piece').value = '';
    document.getElementById('filter-location').value = '';
    document.getElementById('filter-type').value = '';
    document.getElementById('filter-date-from').value = '';
    document.getElementById('filter-date-to').value = '';

    filteredMovements = [...allMovements];
    currentPage = 1;
    updateStatistics();
    renderTable();
}

// Atualizar estatísticas
function updateStatistics() {
    const total = filteredMovements.length;
    const entradas = filteredMovements.filter(m => m.movement_type === 'entrada').length;
    const saidas = filteredMovements.filter(m => m.movement_type === 'saida').length;

    // Calcular saldo atual (simplificado - soma de todas as entradas menos saídas)
    const saldo = filteredMovements.reduce((acc, m) => {
        return m.movement_type === 'entrada' ? acc + m.quantity : acc - Math.abs(m.quantity);
    }, 0);

    document.getElementById('total-movements').textContent = total;
    document.getElementById('total-entradas').textContent = entradas;
    document.getElementById('total-saidas').textContent = saidas;
    document.getElementById('current-balance').textContent = saldo;
}

// Renderizar tabela
function renderTable() {
    const tbody = document.getElementById('movements-tbody');
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageMovements = filteredMovements.slice(startIndex, endIndex);

    if (pageMovements.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="no-data">Nenhuma movimentação encontrada</td></tr>';
        updatePagination();
        return;
    }

    tbody.innerHTML = pageMovements.map(movement => {
        const date = new Date(movement.created_at).toLocaleString('pt-BR');
        const piece = movement.pieces || {};
        const supplier = piece.suppliers || {};
        const location = movement.locations || {};
        const quantity = movement.movement_type === 'entrada' ? `+${movement.quantity}` : `-${Math.abs(movement.quantity)}`;
        const typeClass = movement.movement_type === 'entrada' ? 'entrada' : 'saida';

        return `
            <tr class="movement-row" data-id="${movement.id}">
                <td>${date}</td>
                <td>${piece.code || 'N/A'} - ${piece.name || 'N/A'}</td>
                <td>${supplier.name || 'N/A'}</td>
                <td>${location.code || 'N/A'}</td>
                <td><span class="movement-type ${typeClass}">${movement.movement_type === 'entrada' ? 'Entrada' : 'Saída'}</span></td>
                <td class="quantity ${typeClass}">${quantity}</td>
                <td>${movement.created_by || 'N/A'}</td>
            </tr>
        `;
    }).join('');

    // Adicionar event listeners para as linhas
    document.querySelectorAll('.movement-row').forEach(row => {
        row.addEventListener('click', () => showMovementDetails(row.dataset.id));
    });

    updatePagination();
}

// Configurar paginação
function setupPagination() {
    document.getElementById('prev-page').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderTable();
        }
    });

    document.getElementById('next-page').addEventListener('click', () => {
        const maxPages = Math.ceil(filteredMovements.length / itemsPerPage);
        if (currentPage < maxPages) {
            currentPage++;
            renderTable();
        }
    });
}

// Atualizar controles de paginação
function updatePagination() {
    const maxPages = Math.ceil(filteredMovements.length / itemsPerPage);
    const pageInfo = document.getElementById('page-info');
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');

    pageInfo.textContent = `Página ${currentPage} de ${maxPages || 1}`;

    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= maxPages;
}

// Configurar modal
function setupModal() {
    const modal = document.getElementById('details-modal');
    const closeBtn = modal.querySelector('.close');

    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// Mostrar detalhes da movimentação
function showMovementDetails(movementId) {
    const movement = allMovements.find(m => m.id === movementId);
    if (!movement) return;

    const modal = document.getElementById('details-modal');
    const detailsDiv = document.getElementById('movement-details');

    const piece = movement.pieces || {};
    const supplier = piece.suppliers || {};
    const location = movement.locations || {};

    detailsDiv.innerHTML = `
        <div class="movement-details">
            <div class="detail-row">
                <strong>Data/Hora:</strong> ${new Date(movement.created_at).toLocaleString('pt-BR')}
            </div>
            <div class="detail-row">
                <strong>Peça:</strong> ${piece.code || 'N/A'} - ${piece.name || 'N/A'}
            </div>
            <div class="detail-row">
                <strong>Fornecedor:</strong> ${supplier.name || 'N/A'}
            </div>
            <div class="detail-row">
                <strong>Local:</strong> ${location.code || 'N/A'} - ${location.description || ''}
            </div>
            <div class="detail-row">
                <strong>Tipo:</strong> <span class="movement-type ${movement.movement_type}">${movement.movement_type === 'entrada' ? 'Entrada' : 'Saída'}</span>
            </div>
            <div class="detail-row">
                <strong>Quantidade:</strong> <span class="quantity ${movement.movement_type}">${movement.movement_type === 'entrada' ? '+' : '-'}${Math.abs(movement.quantity)}</span>
            </div>
            <div class="detail-row">
                <strong>Usuário:</strong> ${movement.created_by || 'N/A'}
            </div>
            <div class="detail-row">
                <strong>ID da Movimentação:</strong> ${movement.id}
            </div>
        </div>
    `;

    modal.style.display = 'block';
}

// Funções auxiliares
function showLoading() {
    const tbody = document.getElementById('movements-tbody');
    tbody.innerHTML = '<tr><td colspan="7" class="loading">Carregando movimentações...</td></tr>';
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
