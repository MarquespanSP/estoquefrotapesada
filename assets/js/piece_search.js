// Script JavaScript para busca de peças

// Configurar busca quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    setupSearch();
    loadSuppliers();
    setupEditPieceModal();
    setupSupplierModal();
});

function setupSearch() {
    const searchInput = document.getElementById('search_term');
    const suggestionsDiv = document.getElementById('search_suggestions');

    searchInput.addEventListener('input', function() {
        const query = this.value.trim();
        if (query.length >= 2) {
            searchPiecesForLocation(query);
        } else {
            suggestionsDiv.style.display = 'none';
            document.getElementById('search-results').style.display = 'none';
        }
    });

    searchInput.addEventListener('focus', function() {
        if (this.value.trim().length >= 2) {
            searchPiecesForLocation(this.value.trim());
        }
    });

    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !suggestionsDiv.contains(e.target)) {
            suggestionsDiv.style.display = 'none';
        }
    });

    const form = document.getElementById('search-form');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            const query = searchInput.value.trim();
            performSearch(query);
        });
    }
}

async function searchPiecesForLocation(query) {
    try {
        const { data: pieces, error } = await supabaseClient
            .from('pieces')
            .select('id, code, name')
            .eq('is_active', true)
            .or(`code.ilike.%${query}%,name.ilike.%${query}%`)
            .order('code')
            .limit(10);

        if (error) throw error;

        const suggestionsDiv = document.getElementById('search_suggestions');
        suggestionsDiv.innerHTML = '';

        if (pieces.length > 0) {
            pieces.forEach(piece => {
                const div = document.createElement('div');
                div.className = 'suggestion-item';
                div.textContent = `${piece.code} - ${piece.name}`;
                div.addEventListener('click', () => performSearch(piece.code));
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

async function performSearch(searchTerm) {
    try {
        document.getElementById('search_suggestions').style.display = 'none';

        // Se o termo de busca estiver vazio, buscar todas as peças
        if (!searchTerm) {
            await performSearchAll();
            return;
        }

        // Buscar peça pelo código ou nome
        const { data: pieces, error: pieceError } = await supabaseClient
            .from('pieces')
            .select('id, code, name, supplier_id')
            .eq('is_active', true)
            .or(`code.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%`)
            .limit(1);

        if (pieceError) throw pieceError;

        if (pieces.length === 0) {
            showMessage('Peça não encontrada.', 'error');
            document.getElementById('search-results').style.display = 'none';
            return;
        }

        const piece = pieces[0];

        // Buscar fornecedor
        const { data: supplier, error: supplierError } = await supabaseClient
            .from('suppliers')
            .select('name')
            .eq('id', piece.supplier_id)
            .single();

        if (supplierError) {
            console.warn('Erro ao buscar fornecedor:', supplierError);
        }

        // Buscar movimentações de estoque para calcular quantidade por local
        const { data: movements, error: movementError } = await supabaseClient
            .from('stock_movements')
            .select(`
                quantity,
                locations (
                    code,
                    description
                )
            `)
            .eq('piece_id', piece.id);

        if (movementError) throw movementError;

        // Calcular estoque por local
        const stockByLocation = {};
        movements.forEach(movement => {
            const locationCode = movement.locations.code;
            if (!stockByLocation[locationCode]) {
                stockByLocation[locationCode] = {
                    code: locationCode,
                    description: movement.locations.description,
                    quantity: 0
                };
            }
            stockByLocation[locationCode].quantity += movement.quantity;
        });

        // Exibir resultados
        displaySearchResults(piece, supplier?.name, stockByLocation);

    } catch (error) {
        console.error('Erro na busca:', error.message);
        showMessage('Erro na busca: ' + error.message, 'error');
        document.getElementById('search-results').style.display = 'none';
    }
}

async function performSearchAll() {
    try {
        // Buscar todas as peças ativas
        const { data: pieces, error: pieceError } = await supabaseClient
            .from('pieces')
            .select('id, code, name, supplier_id')
            .eq('is_active', true)
            .order('code');

        if (pieceError) throw pieceError;

        if (pieces.length === 0) {
            showMessage('Nenhuma peça cadastrada no sistema.', 'error');
            document.getElementById('search-results').style.display = 'none';
            return;
        }

        // Para cada peça, buscar fornecedor e movimentações
        const results = [];
        for (const piece of pieces) {
            // Buscar fornecedor
            const { data: supplier, error: supplierError } = await supabaseClient
                .from('suppliers')
                .select('name')
                .eq('id', piece.supplier_id)
                .single();

            if (supplierError) {
                console.warn('Erro ao buscar fornecedor:', supplierError);
            }

            // Buscar movimentações de estoque para calcular quantidade por local
            const { data: movements, error: movementError } = await supabaseClient
                .from('stock_movements')
                .select(`
                    quantity,
                    locations (
                        code,
                        description
                    )
                `)
                .eq('piece_id', piece.id);

            if (movementError) throw movementError;

            // Calcular estoque por local
            const stockByLocation = {};
            movements.forEach(movement => {
                const locationCode = movement.locations.code;
                if (!stockByLocation[locationCode]) {
                    stockByLocation[locationCode] = {
                        code: locationCode,
                        description: movement.locations.description,
                        quantity: 0
                    };
                }
                stockByLocation[locationCode].quantity += movement.quantity;
            });

            results.push({
                piece: piece,
                supplierName: supplier?.name,
                stockByLocation: stockByLocation
            });
        }

        // Exibir todos os resultados
        displayAllSearchResults(results);

    } catch (error) {
        console.error('Erro na busca geral:', error.message);
        showMessage('Erro na busca geral: ' + error.message, 'error');
        document.getElementById('search-results').style.display = 'none';
    }
}

function displaySearchResults(piece, supplierName, stockByLocation) {
    const resultsDiv = document.getElementById('search-results');
    const detailsDiv = document.getElementById('piece-details');

    detailsDiv.innerHTML = `
        <div class="piece-info">
            <h4>${piece.code} - ${piece.name}</h4>
            <p><strong>Fornecedor:</strong> ${supplierName || 'Não informado'}</p>
            <div class="piece-actions">
                <button onclick="openEditPieceModal('${piece.id}')" class="btn btn-secondary" title="Editar peça">
                    ✏️ Editar Peça
                </button>
            </div>
            <div class="stock-locations">
                <h5>Localização e Quantidade em Estoque:</h5>
                ${Object.keys(stockByLocation).length > 0 ?
                    Object.values(stockByLocation).map(location => `
                        <div class="location-stock">
                            <strong>${location.code}</strong>${location.description ? ` - ${location.description}` : ''}: ${location.quantity} unidade(s)
                        </div>
                    `).join('') :
                    '<p>Peça não encontrada em nenhum local do estoque.</p>'
                }
            </div>
        </div>
    `;

    resultsDiv.style.display = 'block';
    showMessage('Peça localizada com sucesso!', 'success');
}

function displayAllSearchResults(results) {
    const resultsDiv = document.getElementById('search-results');
    const detailsDiv = document.getElementById('piece-details');

    if (results.length === 0) {
        detailsDiv.innerHTML = '<p>Nenhuma peça encontrada.</p>';
        resultsDiv.style.display = 'block';
        return;
    }

    // Criar tabela HTML
    let tableHTML = `
        <div class="search-results-table">
            <table class="results-table">
                <thead>
                    <tr>
                        <th>Código</th>
                        <th>Nome da Peça</th>
                        <th>Fornecedor</th>
                        <th>Localização</th>
                        <th>Quantidade</th>
                    </tr>
                </thead>
                <tbody>
    `;

    results.forEach(result => {
        const locations = Object.values(result.stockByLocation);

        if (locations.length === 0) {
            // Peça sem estoque em nenhum local
            tableHTML += `
                <tr>
                    <td class="piece-code">${result.piece.code}</td>
                    <td class="piece-name">${result.piece.name}</td>
                    <td class="supplier-info">${result.supplierName || 'Não informado'}</td>
                    <td class="no-stock">Nenhum local</td>
                    <td class="no-stock">0</td>
                </tr>
            `;
        } else {
            // Para cada local com estoque, criar uma linha separada
            locations.forEach((location, index) => {
                if (index === 0) {
                    // Primeira linha inclui código, nome e fornecedor
                    tableHTML += `
                        <tr>
                            <td class="piece-code" rowspan="${locations.length}">${result.piece.code}</td>
                            <td class="piece-name" rowspan="${locations.length}">${result.piece.name}</td>
                            <td class="supplier-info" rowspan="${locations.length}">${result.supplierName || 'Não informado'}</td>
                            <td class="location-info">${location.code}${location.description ? ` - ${location.description}` : ''}</td>
                            <td class="quantity-info">${location.quantity}</td>
                        </tr>
                    `;
                } else {
                    // Linhas subsequentes só incluem localização e quantidade
                    tableHTML += `
                        <tr>
                            <td class="location-info">${location.code}${location.description ? ` - ${location.description}` : ''}</td>
                            <td class="quantity-info">${location.quantity}</td>
                        </tr>
                    `;
                }
            });
        }
    });

    tableHTML += `
                </tbody>
            </table>
        </div>
    `;

    detailsDiv.innerHTML = `
        <h4>Todas as Peças Cadastradas (${results.length})</h4>
        ${tableHTML}
    `;

    resultsDiv.style.display = 'block';
    showMessage(`${results.length} peça(s) localizada(s) com sucesso!`, 'success');
}

// Funções do modal de edição de peça
function setupEditPieceModal() {
    const modal = document.getElementById('edit-piece-modal');
    const closeBtn = modal.querySelector('.close');
    const editPieceForm = document.getElementById('edit-piece-form');

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

    // Submeter formulário de edição da peça
    editPieceForm.addEventListener('submit', function(e) {
        e.preventDefault();
        updatePiece();
    });
}

async function openEditPieceModal(pieceId) {
    try {
        // Buscar dados da peça
        const { data: piece, error: pieceError } = await supabaseClient
            .from('pieces')
            .select('id, code, name, supplier_id')
            .eq('id', pieceId)
            .single();

        if (pieceError) throw pieceError;

        // Buscar movimentações de estoque para calcular localização atual
        const { data: movements, error: movementError } = await supabaseClient
            .from('stock_movements')
            .select(`
                quantity,
                locations (
                    code,
                    description
                )
            `)
            .eq('piece_id', piece.id);

        if (movementError) throw movementError;

        // Calcular localização atual (local com maior quantidade)
        let currentLocation = 'Nenhuma localização';
        let maxQuantity = 0;

        const stockByLocation = {};
        movements.forEach(movement => {
            const locationCode = movement.locations.code;
            if (!stockByLocation[locationCode]) {
                stockByLocation[locationCode] = {
                    code: locationCode,
                    description: movement.locations.description,
                    quantity: 0
                };
            }
            stockByLocation[locationCode].quantity += movement.quantity;
        });

        // Encontrar localização com maior quantidade
        for (const location of Object.values(stockByLocation)) {
            if (location.quantity > maxQuantity) {
                maxQuantity = location.quantity;
                currentLocation = `${location.code}${location.description ? ` - ${location.description}` : ''}`;
            }
        }

        // Preencher formulário
        document.getElementById('edit_piece_code').value = piece.code;
        document.getElementById('edit_piece_name').value = piece.name;
        document.getElementById('edit_supplier').value = piece.supplier_id;
        document.getElementById('edit_current_location').value = currentLocation;

        // Armazenar ID da peça sendo editada
        document.getElementById('edit-piece-form').dataset.pieceId = pieceId;

        // Abrir modal
        document.getElementById('edit-piece-modal').style.display = 'block';

    } catch (error) {
        console.error('Erro ao abrir modal de edição:', error);
        showMessage('Erro ao carregar dados da peça.', 'error');
    }
}

async function updatePiece() {
    try {
        const pieceId = document.getElementById('edit-piece-form').dataset.pieceId;
        const pieceCode = document.getElementById('edit_piece_code').value.trim();
        const pieceName = document.getElementById('edit_piece_name').value.trim();
        const supplierId = document.getElementById('edit_supplier').value;

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

        // Verificar se código já existe (exceto para a própria peça)
        const { data: existingPiece, error: checkError } = await supabaseClient
            .from('pieces')
            .select('id')
            .eq('code', pieceCode)
            .eq('is_active', true)
            .neq('id', pieceId);

        if (checkError) throw checkError;

        if (existingPiece && existingPiece.length > 0) {
            throw new Error('Já existe uma peça com este código');
        }

        // Obter usuário logado
        const userSession = await getLoggedUser();
        if (!userSession) {
            throw new Error('Usuário não autenticado');
        }

        // Atualizar peça
        const { data: updatedPiece, error: updateError } = await supabaseClient
            .from('pieces')
            .update({
                code: pieceCode,
                name: pieceName,
                supplier_id: supplierId,
                updated_by: userSession.username,
                updated_at: new Date().toISOString()
            })
            .eq('id', pieceId)
            .select()
            .single();

        if (updateError) {
            throw new Error('Erro ao atualizar peça: ' + updateError.message);
        }

        console.log('Peça atualizada com sucesso:', updatedPiece);

        // Fechar modal e limpar formulário
        document.getElementById('edit-piece-modal').style.display = 'none';
        document.getElementById('edit-piece-form').reset();

        showMessage('Peça atualizada com sucesso!', 'success');

        // Recarregar resultados da busca
        const searchTerm = document.getElementById('search_term').value.trim();
        if (searchTerm) {
            performSearch(searchTerm);
        }

    } catch (error) {
        console.error('Erro ao atualizar peça:', error);
        showMessage(error.message, 'error');
    }
}

// Funções do modal de fornecedor
function setupSupplierModal() {
    const addSupplierBtn = document.getElementById('edit_add_supplier_btn');
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

async function loadSuppliers() {
    try {
        const { data: suppliers, error } = await supabaseClient
            .from('suppliers')
            .select('id, name')
            .eq('is_active', true)
            .order('name');

        if (error) throw error;

        const supplierSelects = ['edit_supplier'];
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
