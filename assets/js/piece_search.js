// Script JavaScript para busca de peças

// Configurar busca quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    setupSearch();
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

    detailsDiv.innerHTML = `
        <div class="piece-info">
            <h4>Todas as Peças Cadastradas (${results.length})</h4>
            ${results.map(result => `
                <div style="border-bottom: 1px solid #eee; padding: 15px 0; margin-bottom: 10px;">
                    <h5>${result.piece.code} - ${result.piece.name}</h5>
                    <p><strong>Fornecedor:</strong> ${result.supplierName || 'Não informado'}</p>
                    <div class="stock-locations">
                        <h6>Localização e Quantidade:</h6>
                        ${Object.keys(result.stockByLocation).length > 0 ?
                            Object.values(result.stockByLocation).map(location => `
                                <div class="location-stock">
                                    <strong>${location.code}</strong>${location.description ? ` - ${location.description}` : ''}: ${location.quantity} unidade(s)
                                </div>
                            `).join('') :
                            '<p>Peça não encontrada em nenhum local do estoque.</p>'
                        }
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    resultsDiv.style.display = 'block';
    showMessage(`${results.length} peça(s) localizada(s) com sucesso!`, 'success');
}
