// Script JavaScript para relatório de movimentações de estoque

let currentPage = 1;
const itemsPerPage = 50;
let allMovements = [];
let filteredMovements = [];
let currentUser = null;

// Carregar dados quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    loadUserInfo();
    loadLocations();
    loadMovements();
    setupFilters();
    setupPagination();
    setupModal();
    setupDeleteModal();
});

// Carregar informações do usuário logado
async function loadUserInfo() {
    try {
        currentUser = await getLoggedUser();
        if (currentUser) {
            document.getElementById('user-info').textContent = `Usuário: ${currentUser.fullName || currentUser.username} (${currentUser.role})`;
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
        tbody.innerHTML = '<tr><td colspan="8" class="no-data">Nenhuma movimentação encontrada</td></tr>';
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

        // Verificar se usuário é administrador
        const isAdmin = currentUser && currentUser.role === 'admin';
        // Ícone de PDF apenas para saídas
        const pdfIcon = movement.movement_type === 'saida' ?
            `<button class="btn-small btn-pdf" data-id="${movement.id}" title="Gerar PDF">
                <i class="fa fa-file-pdf-o"></i>
             </button>` : '';

        let actionsCell = '';
        if (isAdmin) {
            actionsCell = `${pdfIcon}<button class="btn-small btn-danger delete-movement" data-id="${movement.id}" title="Excluir Movimentação">
                <i class="fa fa-trash"></i> Excluir
             </button>`;
        } else {
            actionsCell = pdfIcon || '-';
        }

        return `
            <tr class="movement-row" data-id="${movement.id}">
                <td>${date}</td>
                <td>${piece.code || 'N/A'} - ${piece.name || 'N/A'}</td>
                <td>${supplier.name || 'N/A'}</td>
                <td>${location.code || 'N/A'}</td>
                <td><span class="movement-type ${typeClass}">${movement.movement_type === 'entrada' ? 'Entrada' : 'Saída'}</span></td>
                <td class="quantity ${typeClass}">${quantity}</td>
                <td>${movement.created_by || 'N/A'}</td>
                <td>${actionsCell}</td>
            </tr>
        `;
    }).join('');

    // Adicionar event listeners para as linhas
    document.querySelectorAll('.movement-row').forEach(row => {
        row.addEventListener('click', () => showMovementDetails(row.dataset.id));
    });

    // Adicionar event listeners para botões de exclusão
    document.querySelectorAll('.delete-movement').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // Evitar abrir modal de detalhes
            confirmDeleteMovement(btn.dataset.id);
        });
    });

    // Adicionar event listeners para botões de PDF
    document.querySelectorAll('.btn-pdf').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // Evitar abrir modal de detalhes
            generateMovementPDF(btn.dataset.id);
        });
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

// Configurar modal de exclusão
function setupDeleteModal() {
    const modal = document.getElementById('delete-modal');
    const closeBtn = modal.querySelector('.close');
    const cancelBtn = document.getElementById('cancel-delete');
    const confirmBtn = document.getElementById('confirm-delete');

    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    cancelBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    confirmBtn.addEventListener('click', () => {
        deleteMovement();
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

// Confirmar exclusão de movimentação
function confirmDeleteMovement(movementId) {
    const modal = document.getElementById('delete-modal');
    modal.dataset.movementId = movementId;
    modal.style.display = 'block';
}

// Excluir movimentação
async function deleteMovement() {
    const modal = document.getElementById('delete-modal');
    const movementId = modal.dataset.movementId;

    if (!movementId) return;

    try {
        const { error } = await supabaseClient
            .from('stock_movements')
            .delete()
            .eq('id', movementId);

        if (error) throw error;

        // Remover da lista local
        allMovements = allMovements.filter(m => m.id !== movementId);
        filteredMovements = filteredMovements.filter(m => m.id !== movementId);

        // Atualizar interface
        updateStatistics();
        renderTable();

        showMessage('Movimentação excluída com sucesso!', 'success');

    } catch (error) {
        console.error('Erro ao excluir movimentação:', error);
        showMessage('Erro ao excluir movimentação. Tente novamente.', 'error');
    }
}

// Funções auxiliares
function showLoading() {
    const tbody = document.getElementById('movements-tbody');
    tbody.innerHTML = '<tr><td colspan="8" class="loading">Carregando movimentações...</td></tr>';
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

// Função para gerar PDF da movimentação
async function generateMovementPDF(movementId) {
    try {
        const movement = allMovements.find(m => m.id === movementId);
        if (!movement) {
            throw new Error('Movimentação não encontrada');
        }

        // Verificar se é saída - apenas saídas geram PDF
        if (movement.movement_type !== 'saida') {
            showMessage('PDF só pode ser gerado para movimentações de saída.', 'error');
            return;
        }

        // Obter usuário logado
        const userSession = await getLoggedUser();
        if (!userSession) {
            throw new Error('Usuário não autenticado');
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Configurações da página
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20;
        let currentY = margin;

        // Logo da empresa (usando texto estilizado já que não temos imagem)
        doc.setFillColor(46, 139, 87); // Verde escuro
        doc.rect(margin, currentY - 5, pageWidth - 2 * margin, 20, 'F');
        doc.setTextColor(255, 255, 255); // Branco
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('ESTOQUE FROTA PESADA', pageWidth / 2, currentY + 8, { align: 'center' });
        currentY += 25;

        // Linha separadora
        doc.setDrawColor(46, 139, 87); // Verde
        doc.setLineWidth(1);
        doc.line(margin, currentY, pageWidth - margin, currentY);
        currentY += 15;

        // Título da requisição
        doc.setTextColor(46, 139, 87); // Verde
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('REQUISIÇÃO DE MATERIAL', pageWidth / 2, currentY, { align: 'center' });
        currentY += 15;

        // Código da movimentação
        doc.setTextColor(220, 53, 69); // Vermelho
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`Código: ${movement.id}`, pageWidth / 2, currentY, { align: 'center' });
        currentY += 15;

        // Resetar cor para preto
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');

        // Data e hora
        doc.setFontSize(12);
        const now = new Date();
        const dateTimeStr = now.toLocaleString('pt-BR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        doc.text(`Data/Hora: ${dateTimeStr}`, margin, currentY);
        currentY += 10;

        // Usuário que fez a movimentação
        doc.text(`Atendente: ${userSession.username}`, margin, currentY);
        currentY += 20;

        // Tabela de peças com bordas
        const tableStartY = currentY;

        // Cabeçalhos da tabela
        doc.setFillColor(46, 139, 87); // Verde
        doc.rect(margin, currentY, pageWidth - 2 * margin, 12, 'F');
        doc.setTextColor(255, 255, 255); // Branco
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);

        const colWidths = [60, 80, 30]; // Larguras das colunas
        const headers = ['Código', 'Nome da Peça', 'Qtd'];

        let currentX = margin + 5;
        headers.forEach((header, index) => {
            doc.text(header, currentX, currentY + 8);
            currentX += colWidths[index];
        });

        currentY += 12;

        // Linha separadora da tabela
        doc.setDrawColor(46, 139, 87); // Verde
        doc.setLineWidth(0.5);
        doc.line(margin, currentY, pageWidth - margin, currentY);
        currentY += 5;

        // Dados da peça
        doc.setTextColor(0, 0, 0); // Preto
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);

        // Fundo alternado para a linha de dados
        doc.setFillColor(248, 249, 250); // Cinza claro
        doc.rect(margin, currentY, pageWidth - 2 * margin, 12, 'F');

        currentX = margin + 5;
        const piece = movement.pieces || {};
        const pieceData = [
            movement.id.toString(), // Código da movimentação do banco de dados
            piece.name || 'N/A',
            Math.abs(movement.quantity).toString()
        ];

        pieceData.forEach((data, index) => {
            doc.text(data, currentX, currentY + 8);
            currentX += colWidths[index];
        });

        currentY += 12;

        // Bordas da tabela
        doc.setDrawColor(46, 139, 87); // Verde
        doc.setLineWidth(0.5);
        doc.rect(margin, tableStartY, pageWidth - 2 * margin, currentY - tableStartY);

        currentY += 20;

        // Espaço para assinaturas
        currentY += 10;

        // Linha para assinatura do atendente
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        doc.setDrawColor(0, 0, 0); // Preto
        doc.setLineWidth(0.3);
        doc.line(margin, currentY, margin + 80, currentY);
        currentY += 8;
        doc.text('Assinatura do Atendente', margin, currentY);
        currentY += 20;

        // Linha para assinatura do solicitante
        doc.line(margin, currentY, margin + 80, currentY);
        currentY += 8;
        doc.text('Assinatura do Solicitante', margin, currentY);

        // Salvar o PDF
        const fileName = `requisicao_${movement.id}.pdf`;
        doc.save(fileName);

        console.log('PDF gerado com sucesso:', fileName);
        showMessage('PDF gerado com sucesso!', 'success');

    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        showMessage('Erro ao gerar PDF da requisição.', 'error');
    }
}
