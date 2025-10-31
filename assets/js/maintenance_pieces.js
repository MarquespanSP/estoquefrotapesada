// Script JavaScript para peças de manutenção

// Carregar dados quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    setupFormValidation();
    setupSearchForm();
    setupImportExportButtons();
    checkReturnToMaintenance();
});

// Configurar validação do formulário
function setupFormValidation() {
    const form = document.getElementById('maintenance-piece-form');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            registerMaintenancePiece();
        });
    }
}

// Configurar formulário de busca
function setupSearchForm() {
    const searchForm = document.getElementById('search-form');
    if (searchForm) {
        searchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            searchMaintenancePieces();
        });
    }
}

// Configurar botões de importação e exportação
function setupImportExportButtons() {
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const downloadTemplateBtn = document.getElementById('download-template-btn');

    if (exportBtn) {
        exportBtn.addEventListener('click', exportMaintenancePieces);
    }

    if (importBtn) {
        importBtn.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.xlsx,.xls';
            input.onchange = handleImport;
            input.click();
        });
    }

    if (downloadTemplateBtn) {
        downloadTemplateBtn.addEventListener('click', downloadTemplate);
    }
}

// Cadastrar peça de manutenção
async function registerMaintenancePiece() {
    try {
        const filial = document.getElementById('filial').value.trim();
        const nome = document.getElementById('nome').value.trim();
        const valorUnitario = parseFloat(document.getElementById('valor_unitario').value);
        const tipo = document.getElementById('tipo').value;
        const status = document.getElementById('status').value;
        const descricao = document.getElementById('descricao').value.trim();

        // Validações
        if (!filial || !nome || !tipo || !status) {
            throw new Error('Filial, nome, tipo e status são obrigatórios');
        }

        if (isNaN(valorUnitario) || valorUnitario < 0) {
            throw new Error('Valor unitário deve ser um número positivo');
        }

        // Obter usuário logado
        const userSession = await getLoggedUser();
        if (!userSession) {
            throw new Error('Usuário não autenticado');
        }

        // Inserir nova peça
        const { data: newPiece, error: insertError } = await supabaseClient
            .from('maintenance_pieces')
            .insert([{
                filial: filial,
                nome: nome,
                valor_unitario: valorUnitario,
                tipo: tipo,
                status: status,
                descricao: descricao || null,
                created_by: userSession.id
            }])
            .select()
            .single();

        if (insertError) {
            throw new Error('Erro ao cadastrar peça: ' + insertError.message);
        }

        console.log('Peça cadastrada com sucesso:', newPiece);
        showMessage('Peça cadastrada com sucesso!', 'success');

        // Limpar formulário
        document.getElementById('maintenance-piece-form').reset();

    } catch (error) {
        console.error('Erro no cadastro de peça:', error.message);
        showMessage('Erro no cadastro: ' + error.message, 'error');
    }
}

// Buscar peças de manutenção
async function searchMaintenancePieces() {
    try {
        const filial = document.getElementById('search_filial').value;
        const nome = document.getElementById('search_nome').value.trim();
        const tipo = document.getElementById('search_tipo').value;
        const status = document.getElementById('search_status').value;

        let query = supabaseClient.from('maintenance_pieces').select('*');

        if (filial) query = query.eq('filial', filial);
        if (nome) query = query.ilike('nome', `%${nome}%`);
        if (tipo) query = query.eq('tipo', tipo);
        if (status) query = query.eq('status', status);

        const { data: pieces, error } = await query.order('nome');

        if (error) throw error;

        displaySearchResults(pieces);
        showMessage('search-message', `Encontradas ${pieces.length} peça(s).`, 'success');

    } catch (error) {
        console.error('Erro ao buscar peças:', error);
        showMessage('search-message', 'Erro ao buscar peças: ' + error.message, 'error');
    }
}

// Exibir resultados da busca
function displaySearchResults(pieces) {
    const resultsContainer = document.getElementById('search-results');
    const resultsBody = document.getElementById('pieces-results-body');

    if (pieces.length === 0) {
        resultsContainer.style.display = 'none';
        return;
    }

    resultsBody.innerHTML = '';

    pieces.forEach(piece => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${piece.filial}</td>
            <td>${piece.nome}</td>
            <td>R$ ${piece.valor_unitario.toFixed(2).replace('.', ',')}</td>
            <td>${piece.tipo}</td>
            <td>${piece.status}</td>
            <td>
                <button class="btn btn-small" onclick="editPiece(${piece.id})">Editar</button>
                <button class="btn btn-danger btn-small" onclick="deletePiece(${piece.id})">Excluir</button>
            </td>
        `;
        resultsBody.appendChild(row);
    });

    resultsContainer.style.display = 'block';
}

// Editar peça
async function editPiece(pieceId) {
    // Implementar edição de peça
    console.log('Editar peça:', pieceId);
    showMessage('Funcionalidade de edição em desenvolvimento.', 'info');
}

// Excluir peça
async function deletePiece(pieceId) {
    if (!confirm('Tem certeza que deseja excluir esta peça?')) {
        return;
    }

    try {
        const { error } = await supabaseClient
            .from('maintenance_pieces')
            .delete()
            .eq('id', pieceId);

        if (error) throw error;

        showMessage('Peça excluída com sucesso!', 'success');
        // Recarregar busca
        searchMaintenancePieces();

    } catch (error) {
        console.error('Erro ao excluir peça:', error);
        showMessage('Erro ao excluir peça: ' + error.message, 'error');
    }
}

// Exportar peças
async function exportMaintenancePieces() {
    try {
        showMessage('Exportando peças...', 'info');

        const { data: pieces, error } = await supabaseClient
            .from('maintenance_pieces')
            .select('*')
            .order('filial, nome');

        if (error) throw error;

        // Preparar dados para Excel
        const excelData = pieces.map(piece => ({
            'Filial': piece.filial,
            'Nome': piece.nome,
            'Valor Unitário': piece.valor_unitario,
            'Tipo': piece.tipo,
            'Status': piece.status,
            'Descrição': piece.descricao || ''
        }));

        // Criar workbook
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(excelData);

        // Ajustar largura das colunas
        const colWidths = [
            { wch: 10 }, // Filial
            { wch: 30 }, // Nome
            { wch: 15 }, // Valor Unitário
            { wch: 15 }, // Tipo
            { wch: 10 }, // Status
            { wch: 40 }  // Descrição
        ];
        ws['!cols'] = colWidths;

        XLSX.utils.book_append_sheet(wb, ws, 'Peças_Manutenção');

        // Baixar arquivo
        const fileName = `pecas_manutencao_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);

        showMessage('Peças exportadas com sucesso!', 'success');

    } catch (error) {
        console.error('Erro ao exportar peças:', error);
        showMessage('Erro ao exportar peças: ' + error.message, 'error');
    }
}

// Baixar modelo de importação
function downloadTemplate() {
    try {
        // Criar dados de exemplo
        const templateData = [
            {
                'Filial': 'MS',
                'Nome': 'Filtro de Óleo',
                'Valor Unitário': 25.50,
                'Tipo': 'Peças',
                'Status': 'ATIVO',
                'Descrição': 'Filtro de óleo para motores diesel'
            },
            {
                'Filial': 'MG',
                'Nome': 'Troca de Óleo',
                'Valor Unitário': 150.00,
                'Tipo': 'Serviço',
                'Status': 'ATIVO',
                'Descrição': 'Serviço completo de troca de óleo'
            },
            {
                'Filial': 'PR',
                'Nome': 'Revisão Preventiva',
                'Valor Unitário': 500.00,
                'Tipo': 'Manutenção',
                'Status': 'ATIVO',
                'Descrição': 'Revisão preventiva completa do veículo'
            }
        ];

        // Criar workbook
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(templateData);

        // Ajustar largura das colunas
        const colWidths = [
            { wch: 10 }, // Filial
            { wch: 30 }, // Nome
            { wch: 15 }, // Valor Unitário
            { wch: 15 }, // Tipo
            { wch: 10 }, // Status
            { wch: 40 }  // Descrição
        ];
        ws['!cols'] = colWidths;

        XLSX.utils.book_append_sheet(wb, ws, 'Modelo_Peças_Manutenção');

        // Baixar arquivo
        XLSX.writeFile(wb, 'modelo_importacao_pecas_manutencao.xlsx');

        showMessage('Modelo baixado com sucesso!', 'success');

    } catch (error) {
        console.error('Erro ao baixar modelo:', error);
        showMessage('Erro ao baixar modelo: ' + error.message, 'error');
    }
}

// Importar peças
async function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        showMessage('Processando arquivo...', 'info');

        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                // Pegar primeira planilha
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];

                // Converter para JSON
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                // Remover cabeçalho
                jsonData.shift();

                // Processar dados
                await processImportData(jsonData);

            } catch (error) {
                console.error('Erro ao processar arquivo:', error);
                showMessage('Erro ao processar arquivo: ' + error.message, 'error');
            }
        };

        reader.readAsArrayBuffer(file);

    } catch (error) {
        console.error('Erro ao importar arquivo:', error);
        showMessage('Erro ao importar arquivo: ' + error.message, 'error');
    }
}

// Processar dados de importação
async function processImportData(rows) {
    try {
        const userSession = await getLoggedUser();
        if (!userSession) {
            throw new Error('Usuário não autenticado');
        }

        let successCount = 0;
        let errorCount = 0;
        const errors = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const [filial, nome, valorUnitario, tipo, status, descricao] = row;

            // Pular linhas vazias
            if (!filial && !nome) continue;

            try {
                // Validações obrigatórias
                if (!filial || !nome || !tipo || !status) {
                    throw new Error(`Linha ${i + 2}: Filial, Nome, Tipo e Status são obrigatórios`);
                }

                const valor = parseFloat(valorUnitario);
                if (isNaN(valor) || valor < 0) {
                    throw new Error(`Linha ${i + 2}: Valor unitário deve ser um número positivo`);
                }

                // Validar filial
                const validFiliais = ['Mato Grosso do Sul', 'Minas Gerais', 'Paraná', 'São Paulo'];
                if (!validFiliais.includes(filial)) {
                    throw new Error(`Linha ${i + 2}: Filial inválida`);
                }

                // Validar tipo
                const validTipos = ['Manutenção', 'Peças', 'Serviço'];
                if (!validTipos.includes(tipo)) {
                    throw new Error(`Linha ${i + 2}: Tipo inválido`);
                }

                // Validar status
                const validStatus = ['ATIVO', 'INATIVO'];
                if (!validStatus.includes(status)) {
                    throw new Error(`Linha ${i + 2}: Status inválido`);
                }

                // Inserir peça
                const { error: insertError } = await supabaseClient
                    .from('maintenance_pieces')
                    .insert([{
                        filial: filial,
                        nome: nome.toString().trim(),
                        valor_unitario: valor,
                        tipo: tipo,
                        status: status,
                        descricao: descricao ? descricao.toString().trim() : null,
                        created_by: userSession.id
                    }]);

                if (insertError) throw insertError;

                successCount++;

            } catch (error) {
                errorCount++;
                errors.push(`Linha ${i + 2}: ${error.message}`);
            }
        }

        // Mostrar resultado
        let message = `Importação concluída! ${successCount} peças importadas com sucesso.`;
        if (errorCount > 0) {
            message += ` ${errorCount} erros encontrados.`;
            console.error('Erros de importação:', errors);
        }

        showMessage(message, errorCount > 0 ? 'warning' : 'success');

    } catch (error) {
        console.error('Erro no processamento da importação:', error);
        showMessage('Erro na importação: ' + error.message, 'error');
    }
}

// Verificar se deve mostrar botão de voltar para manutenção
function checkReturnToMaintenance() {
    const urlParams = new URLSearchParams(window.location.search);
    const fromMaintenance = urlParams.get('from') === 'maintenance';

    if (fromMaintenance) {
        const backBtn = document.getElementById('back-to-maintenance-btn');
        if (backBtn) {
            backBtn.style.display = 'inline-block';
        }
    }
}

// Função para voltar para a página de manutenção
function goBackToMaintenance() {
    // Verificar se há dados não salvos
    const form = document.getElementById('maintenance-piece-form');
    const formData = new FormData(form);
    let hasData = false;

    for (let [key, value] of formData.entries()) {
        if (value && value.trim() !== '') {
            hasData = true;
            break;
        }
    }

    if (hasData) {
        if (!confirm('Há dados não salvos no formulário. Deseja realmente voltar sem salvar?')) {
            return;
        }
    }

    // Voltar para a página de manutenção
    window.location.href = 'maintenance.html';
}

// Função para mostrar mensagens
function showMessage(message, type) {
    const element = document.getElementById('message');
    element.textContent = message;
    element.className = `message ${type}-message`;
    element.style.display = 'block';

    setTimeout(() => {
        element.style.display = 'none';
    }, 5000);
}
