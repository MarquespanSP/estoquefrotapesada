// Script JavaScript para gerenciamento de fornecedores

// Função para escapar caracteres HTML
function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '<',
        '>': '>',
        '"': '"',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

// Variável para controlar modo de edição
let editingSupplierId = null;

// Função para fechar o modal de edição
function closeEditModal() {
    document.getElementById('edit-supplier-modal').style.display = 'none';
    document.getElementById('edit-supplier-form').reset();
    document.getElementById('edit-message').style.display = 'none';
    editingSupplierId = null;
}

// Carregar fornecedores quando a página carregar
document.addEventListener('DOMContentLoaded', async function() {
    await checkAuth();
    loadSuppliers();
    setupFormValidation();
    loadUserInfo();
    setupImportExport();
});

// Verificar autenticação (igual ao fleet.js)
async function checkAuth() {
    const user = await getLoggedUser();
    currentUser = user;

    if (!user) {
        window.location.href = 'index.html';
        return;
    }
}

async function loadUserInfo() {
    try {
        const user = await getLoggedUser();
        if (user) {
            document.getElementById('user-info').textContent = `Usuário: ${user.fullName || user.username} (${user.role})`;
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

function setupFormValidation() {
    const supplierNameInput = document.getElementById('supplier_name');

    supplierNameInput.addEventListener('input', function() {
        // Capitalizar primeira letra de cada palavra
        this.value = this.value.replace(/\b\w/g, l => l.toUpperCase());
    });

    const form = document.getElementById('supplier-form');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            registerSupplier();
        });
    }

    // Configurar validação para o formulário de edição no modal
    const editForm = document.getElementById('edit-supplier-form');
    if (editForm) {
        editForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveSupplier();
        });
    }

    // Configurar capitalização para o campo de edição
    const editSupplierNameInput = document.getElementById('edit_supplier_name');
    if (editSupplierNameInput) {
        editSupplierNameInput.addEventListener('input', function() {
            // Capitalizar primeira letra de cada palavra
            this.value = this.value.replace(/\b\w/g, l => l.toUpperCase());
        });
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

        // Verificar se o nome do fornecedor já existe
        const { data: existingSuppliers, error: checkError } = await supabaseClient
            .from('suppliers')
            .select('name')
            .eq('name', supplierName)
            .limit(1);

        if (checkError) throw checkError;

        if (existingSuppliers && existingSuppliers.length > 0) {
            throw new Error('Este fornecedor já está cadastrado');
        }

        // Obter usuário logado
        const userSession = await getLoggedUser();
        if (!userSession) {
            throw new Error('Usuário não autenticado');
        }

        // Inserir novo fornecedor
        const { data: newSupplier, error: insertError } = await supabaseClient
            .from('suppliers')
            .insert([
                {
                    name: supplierName,
                    contact_info: supplierContact || null,
                    created_by: userSession.username,
                    created_at: new Date().toISOString(),
                    is_active: true
                }
            ])
            .select()
            .single();

        if (insertError) {
            throw new Error('Erro ao cadastrar fornecedor: ' + insertError.message);
        }

        console.log('Fornecedor cadastrado com sucesso:', newSupplier);
        showMessage('Fornecedor cadastrado com sucesso!', 'success');

        // Limpar formulário e recarregar lista
        resetForm();
        loadSuppliers();

    } catch (error) {
        console.error('Erro no cadastro de fornecedor:', error.message);
        showMessage('Erro no cadastro: ' + error.message, 'error');
    }
}

async function loadSuppliers() {
    try {
        const { data: suppliers, error } = await supabaseClient
            .from('suppliers')
            .select('id, name, contact_info, created_at, created_by')
            .eq('is_active', true)
            .order('name');

        if (error) throw error;

        const tbody = document.getElementById('suppliers-tbody');
        tbody.innerHTML = '';

        if (suppliers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #666; font-style: italic;">Nenhum fornecedor cadastrado ainda.</td></tr>';
            return;
        }

        suppliers.forEach(supplier => {
            const row = document.createElement('tr');

            // Nome do fornecedor
            const nameCell = document.createElement('td');
            nameCell.textContent = supplier.name;
            row.appendChild(nameCell);

            // Informações de contato
            const contactCell = document.createElement('td');
            contactCell.textContent = supplier.contact_info || 'Não informado';
            row.appendChild(contactCell);

            // Data de cadastro
            const dateCell = document.createElement('td');
            dateCell.textContent = new Date(supplier.created_at).toLocaleString('pt-BR');
            dateCell.innerHTML += `<br><small>por ${supplier.created_by}</small>`;
            row.appendChild(dateCell);

            // Ações
            const actionsCell = document.createElement('td');
            const viewBtn = document.createElement('button');
            viewBtn.className = 'btn btn-small';
            viewBtn.textContent = 'Ver Detalhes';
            viewBtn.onclick = () => viewSupplierDetails(supplier.id);
            actionsCell.appendChild(viewBtn);

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-small btn-danger';
            deleteBtn.textContent = 'Excluir';
            deleteBtn.onclick = () => deleteSupplier(supplier.id, supplier.name);
            actionsCell.appendChild(deleteBtn);
            row.appendChild(actionsCell);

            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Erro ao carregar fornecedores:', error);
        showMessage('Erro ao carregar fornecedores. Tente novamente.', 'error');
    }
}

async function deleteSupplier(supplierId, supplierName) {
    if (!confirm(`Tem certeza que deseja excluir o fornecedor "${supplierName}"?`)) {
        return;
    }

    try {
        // Verificar se o fornecedor está sendo usado em peças
        const { data: pieces, error: checkError } = await supabaseClient
            .from('pieces')
            .select('id')
            .eq('supplier_id', supplierId)
            .limit(1);

        if (checkError) throw checkError;

        if (pieces.length > 0) {
            throw new Error('Não é possível excluir este fornecedor pois existem peças associadas a ele');
        }

        // Desativar fornecedor (soft delete)
        const { error: deleteError } = await supabaseClient
            .from('suppliers')
            .update({ is_active: false })
            .eq('id', supplierId);

        if (deleteError) {
            throw new Error('Erro ao excluir fornecedor: ' + deleteError.message);
        }

        showMessage('Fornecedor excluído com sucesso!', 'success');
        loadSuppliers();

    } catch (error) {
        console.error('Erro ao excluir fornecedor:', error.message);
        showMessage('Erro ao excluir: ' + error.message, 'error');
    }
}

async function editSupplier(supplierId) {
    try {
        // Buscar dados do fornecedor
        const { data: supplier, error } = await supabaseClient
            .from('suppliers')
            .select('id, name, contact_info')
            .eq('id', supplierId)
            .single();

        if (error) throw error;

        // Preencher formulário do modal
        document.getElementById('edit_supplier_name').value = supplier.name;
        document.getElementById('edit_supplier_contact').value = supplier.contact_info || '';

        // Definir modo de edição
        editingSupplierId = supplierId;

        // Mostrar modal
        document.getElementById('edit-supplier-modal').style.display = 'block';

        // Focar no campo de nome
        document.getElementById('edit_supplier_name').focus();

    } catch (error) {
        console.error('Erro ao carregar fornecedor para edição:', error);
        showMessage('Erro ao carregar fornecedor para edição.', 'error');
    }
}

// Função para salvar fornecedor (usada no modal de edição)
async function saveSupplier() {
    try {
        const supplierName = document.getElementById('edit_supplier_name').value.trim();
        const supplierContact = document.getElementById('edit_supplier_contact').value.trim();

        // Validações
        if (!supplierName) {
            throw new Error('Nome do fornecedor é obrigatório');
        }

        // Verificar se o nome já existe em outro fornecedor
        const { data: existingSuppliers, error: checkError } = await supabaseClient
            .from('suppliers')
            .select('id, name')
            .eq('name', supplierName)
            .neq('id', editingSupplierId)
            .limit(1);

        if (checkError) throw checkError;

        if (existingSuppliers && existingSuppliers.length > 0) {
            throw new Error('Este nome de fornecedor já está sendo usado por outro fornecedor');
        }

        // Obter usuário logado para atualizar campos de auditoria
        const userSession = await getLoggedUser();
        if (!userSession) {
            throw new Error('Usuário não autenticado');
        }

        // Verificar se o fornecedor existe antes do update
        console.log('Verificando se fornecedor existe ID:', editingSupplierId);
        const { data: existingSupplier, error: checkError2 } = await supabaseClient
            .from('suppliers')
            .select('id, name, contact_info')
            .eq('id', editingSupplierId)
            .single();

        console.log('Fornecedor encontrado para update:', existingSupplier);
        console.log('Erro na verificação:', checkError2);

        if (checkError2 || !existingSupplier) {
            throw new Error('Fornecedor não encontrado para atualização');
        }

        // Atualizar fornecedor (apenas campos editáveis, não os de auditoria)
        console.log('Tentando atualizar fornecedor ID:', editingSupplierId);
        console.log('Dados para atualização:', { name: supplierName, contact_info: supplierContact || null });

        const { data: updateResult, error: updateError } = await supabaseClient
            .from('suppliers')
            .update({
                name: supplierName,
                contact_info: supplierContact || null
            })
            .eq('id', editingSupplierId)
            .select();

        console.log('Resultado direto do update:', updateResult);
        console.log('Erro do update:', updateError);

        if (updateError) {
            console.error('Erro no update:', updateError);
            throw new Error('Erro ao atualizar fornecedor: ' + updateError.message);
        }

        console.log('Update executado sem erro, verificando se foi salvo...');

        // Verificar se os dados foram realmente atualizados
        const { data: verifyData, error: verifyError } = await supabaseClient
            .from('suppliers')
            .select('name, contact_info')
            .eq('id', editingSupplierId)
            .single();

        if (verifyError) {
            console.error('Erro ao verificar atualização:', verifyError);
        } else {
            console.log('Dados verificados após update:', verifyData);
            if (verifyData.name === supplierName && verifyData.contact_info === (supplierContact || null)) {
                console.log('✅ Dados foram atualizados corretamente no banco');
            } else {
                console.log('❌ Dados não foram atualizados corretamente');
                console.log('Esperado:', { name: supplierName, contact_info: supplierContact || null });
                console.log('Encontrado:', verifyData);
            }
        }

        // Fechar modal e mostrar mensagem de sucesso
        closeEditModal();
        showMessage('Fornecedor atualizado com sucesso!', 'success');

        // Recarregar lista
        loadSuppliers();

    } catch (error) {
        console.error('Erro na atualização do fornecedor:', error.message);
        showEditMessage('Erro na atualização: ' + error.message, 'error');
    }
}

// Função para mostrar mensagens no modal de edição
function showEditMessage(message, type = 'info') {
    const messageDiv = document.getElementById('edit-message');
    if (messageDiv) {
        messageDiv.textContent = message;
        messageDiv.className = `message ${type}`;
        messageDiv.style.display = 'block';
    }
}

// Função para ver detalhes do fornecedor
async function viewSupplierDetails(supplierId) {
    try {
        console.log('Buscando detalhes do fornecedor ID:', supplierId);

        // Buscar dados completos do fornecedor
        const { data: supplier, error } = await supabaseClient
            .from('suppliers')
            .select('id, name, contact_info, created_at, created_by, is_active')
            .eq('id', supplierId)
            .single();

        if (error) {
            console.error('Erro ao buscar fornecedor:', error);
            throw error;
        }

        console.log('Fornecedor encontrado:', supplier);

        // Buscar peças associadas ao fornecedor
        const { data: pieces, error: piecesError } = await supabaseClient
            .from('pieces')
            .select('id, code, name, supplier_id')
            .eq('supplier_id', supplierId)
            .eq('is_active', true);

        if (piecesError) {
            console.error('Erro ao buscar peças:', piecesError);
            throw piecesError;
        }

        console.log('Peças encontradas:', pieces);

        // Construir conteúdo do modal
        const detailsContent = document.getElementById('supplier-details-content');
        detailsContent.innerHTML = `
            <div class="supplier-details">
                <div class="detail-section">
                    <h4>Informações Gerais</h4>
                    <div class="detail-row">
                        <strong>Nome:</strong> <span>${escapeHtml(supplier.name)}</span>
                    </div>
                    <div class="detail-row">
                        <strong>Contato:</strong> <span>${escapeHtml(supplier.contact_info || 'Não informado')}</span>
                    </div>
                    <div class="detail-row">
                        <strong>Cadastrado em:</strong> <span>${new Date(supplier.created_at).toLocaleString('pt-BR')}</span>
                    </div>
                    <div class="detail-row">
                        <strong>Cadastrado por:</strong> <span>${escapeHtml(supplier.created_by)}</span>
                    </div>
                    <div class="detail-row">
                        <strong>Status:</strong> <span class="${supplier.is_active ? 'status-active' : 'status-inactive'}">${supplier.is_active ? 'Ativo' : 'Inativo'}</span>
                    </div>
                </div>

                <div class="detail-section">
                    <h4>Peças Fornecidas (${pieces ? pieces.length : 0})</h4>
                    ${pieces && pieces.length > 0 ? `
                        <div class="pieces-list">
                            ${pieces.map(piece => `
                                <div class="piece-item">
                                    <div class="piece-info">
                                        <strong>${escapeHtml(piece.code)} - ${escapeHtml(piece.name)}</strong>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : '<p class="no-pieces">Nenhuma peça associada a este fornecedor.</p>'}
                </div>

                <div class="detail-actions">
                    <button class="btn" onclick="editSupplier('${supplier.id}')">Editar Fornecedor</button>
                    <button class="btn btn-danger" onclick="deleteSupplier('${supplier.id}', '${escapeHtml(supplier.name)}')">Excluir Fornecedor</button>
                </div>
            </div>
        `;

        // Mostrar modal
        document.getElementById('supplier-details-modal').style.display = 'block';

    } catch (error) {
        console.error('Erro ao carregar detalhes do fornecedor:', error);
        showMessage('Erro ao carregar detalhes do fornecedor.', 'error');
    }
}

// Função para fechar o modal de detalhes
function closeDetailsModal() {
    document.getElementById('supplier-details-modal').style.display = 'none';
    document.getElementById('supplier-details-content').innerHTML = '';
}

function resetForm() {
    document.getElementById('supplier-form').reset();
    editingSupplierId = null;

    // Voltar texto do botão
    const submitBtn = document.querySelector('#supplier-form button[type="submit"]');
    submitBtn.textContent = 'Cadastrar Fornecedor';
}

// Função para configurar importação e exportação XLSX
function setupImportExport() {
    const importBtn = document.getElementById('import-btn');
    const exportBtn = document.getElementById('export-btn');

    if (importBtn) {
        importBtn.addEventListener('click', handleImport);
    }

    if (exportBtn) {
        exportBtn.addEventListener('click', handleExport);
    }
}

// Variável para controlar cancelamento da importação
let importCancelled = false;

// Função para lidar com a importação de fornecedores via XLSX
async function handleImport() {
    try {
        // Criar input file oculto
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.xlsx,.xls';
        input.style.display = 'none';

        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const data = await file.arrayBuffer();
                const workbook = XLSX.read(data, { type: 'array' });

                // Assumir que os dados estão na primeira planilha
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];

                // Converter para JSON
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                if (jsonData.length < 2) {
                    throw new Error('Arquivo deve conter pelo menos cabeçalhos e uma linha de dados');
                }

                // Processar dados
                const headers = jsonData[0].map(h => h.toLowerCase().trim());
                const requiredHeaders = ['nome', 'contato'];

                // Verificar se os cabeçalhos necessários estão presentes
                const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
                if (missingHeaders.length > 0) {
                    throw new Error(`Cabeçalhos obrigatórios ausentes: ${missingHeaders.join(', ')}`);
                }

                // Obter índices das colunas
                const nameIndex = headers.indexOf('nome');
                const contactIndex = headers.indexOf('contato');

                // Processar linhas de dados
                const suppliersToImport = [];
                let errorCount = 0;
                const errors = [];

                for (let i = 1; i < jsonData.length; i++) {
                    const row = jsonData[i];
                    const supplierName = row[nameIndex]?.toString().trim();
                    const supplierContact = row[contactIndex]?.toString().trim();

                    if (!supplierName) {
                        errorCount++;
                        errors.push(`Linha ${i + 1}: Nome do fornecedor é obrigatório`);
                        continue;
                    }

                    suppliersToImport.push({
                        name: supplierName,
                        contact_info: supplierContact || null
                    });
                }

                if (suppliersToImport.length === 0) {
                    throw new Error('Nenhum fornecedor válido encontrado para importar');
                }

                // Iniciar importação com modal de progresso
                await performImportWithProgress(suppliersToImport, errors);

            } catch (error) {
                console.error('Erro na importação:', error);
                showMessage('Erro na importação: ' + error.message, 'error');
            }
        };

        // Simular clique no input
        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);

    } catch (error) {
        console.error('Erro ao configurar importação:', error);
        showMessage('Erro ao configurar importação.', 'error');
    }
}

// Função para executar a importação com modal de progresso
async function performImportWithProgress(suppliersToImport, initialErrors) {
    importCancelled = false;

    // Mostrar modal de progresso
    const modal = document.getElementById('import-progress-modal');
    modal.style.display = 'block';

    // Inicializar contadores
    let successCount = 0;
    let duplicateCount = 0;
    let errorCount = initialErrors.length;
    const errors = [...initialErrors];

    // Configurar elementos do modal
    const progressText = document.getElementById('progress-text');
    const progressCount = document.getElementById('progress-count');
    const progressFill = document.getElementById('progress-fill');
    const successCountEl = document.getElementById('success-count');
    const duplicateCountEl = document.getElementById('duplicate-count');
    const errorCountEl = document.getElementById('error-count');
    const errorList = document.getElementById('error-list');
    const importErrors = document.getElementById('import-errors');
    const cancelBtn = document.getElementById('cancel-import-btn');

    // Configurar botão de cancelar
    cancelBtn.onclick = () => {
        importCancelled = true;
        modal.style.display = 'none';
        showMessage('Importação cancelada pelo usuário.', 'warning');
    };

    try {
        // Verificar duplicatas existentes
        progressText.textContent = 'Verificando duplicatas existentes...';
        const supplierNames = suppliersToImport.map(s => s.name);
        const { data: existingSuppliers, error: checkError } = await supabaseClient
            .from('suppliers')
            .select('name')
            .in('name', supplierNames)
            .eq('is_active', true);

        if (checkError) {
            throw new Error('Erro ao verificar fornecedores existentes: ' + checkError.message);
        }

        const existingNames = new Set(existingSuppliers.map(s => s.name));
        const uniqueSuppliers = suppliersToImport.filter(supplier => {
            if (existingNames.has(supplier.name)) {
                duplicateCount++;
                return false;
            }
            return true;
        });

        if (uniqueSuppliers.length === 0) {
            throw new Error('Todos os fornecedores do arquivo já existem no sistema');
        }

        // Obter usuário logado
        const userSession = await getLoggedUser();
        if (!userSession) {
            throw new Error('Usuário não autenticado');
        }

        // Preparar fornecedores para inserção
        const suppliersWithAudit = uniqueSuppliers.map(supplier => ({
            ...supplier,
            created_by: userSession.username,
            created_at: new Date().toISOString(),
            is_active: true
        }));

        // Processar inserção em lotes
        const batchSize = 10; // Processar em lotes de 10
        const totalBatches = Math.ceil(suppliersWithAudit.length / batchSize);

        for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
            if (importCancelled) break;

            const start = batchIndex * batchSize;
            const end = Math.min(start + batchSize, suppliersWithAudit.length);
            const batch = suppliersWithAudit.slice(start, end);

            // Atualizar progresso
            const currentProgress = Math.round(((batchIndex + 1) / totalBatches) * 100);
            progressText.textContent = `Importando fornecedores... (${batchIndex + 1}/${totalBatches})`;
            progressCount.textContent = `${Math.min(end, suppliersWithAudit.length)} / ${suppliersWithAudit.length}`;
            progressFill.style.width = `${currentProgress}%`;

            // Inserir lote
            const { data: insertedBatch, error: insertError } = await supabaseClient
                .from('suppliers')
                .insert(batch)
                .select();

            if (insertError) {
                errorCount++;
                errors.push(`Erro no lote ${batchIndex + 1}: ${insertError.message}`);
            } else {
                successCount += insertedBatch.length;
            }

            // Atualizar estatísticas
            successCountEl.textContent = successCount;
            duplicateCountEl.textContent = duplicateCount;
            errorCountEl.textContent = errorCount;

            // Pequena pausa para não sobrecarregar
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        if (!importCancelled) {
            // Finalizar
            progressText.textContent = 'Importação concluída!';
            progressCount.textContent = `${suppliersWithAudit.length} / ${suppliersWithAudit.length}`;
            progressFill.style.width = '100%';

            // Mostrar erros se houver
            if (errors.length > 0) {
                errorList.innerHTML = errors.map(error => `<li>${error}</li>`).join('');
                importErrors.style.display = 'block';
            }

            // Fechar modal automaticamente após 3 segundos se não houver erros
            if (errors.length === 0) {
                setTimeout(() => {
                    modal.style.display = 'none';
                    showMessage(`Importação concluída! ${successCount} fornecedores importados com sucesso. ${duplicateCount} duplicatas ignoradas.`, 'success');
                    loadSuppliers();
                }, 3000);
            } else {
                // Se houver erros, manter modal aberto para usuário ver
                cancelBtn.textContent = 'Fechar';
                cancelBtn.onclick = () => {
                    modal.style.display = 'none';
                    showMessage(`Importação concluída com erros! ${successCount} fornecedores importados. ${duplicateCount} duplicatas ignoradas. ${errorCount} erros encontrados.`, 'warning');
                    loadSuppliers();
                };
            }
        }

    } catch (error) {
        console.error('Erro na importação:', error);
        modal.style.display = 'none';
        showMessage('Erro na importação: ' + error.message, 'error');
    }
}

// Função para lidar com a exportação de fornecedores para XLSX
async function handleExport() {
    try {
        // Buscar todos os fornecedores ativos
        const { data: suppliers, error } = await supabaseClient
            .from('suppliers')
            .select('name, contact_info, created_at, created_by')
            .eq('is_active', true)
            .order('name');

        if (error) throw error;

        if (suppliers.length === 0) {
            showMessage('Nenhum fornecedor encontrado para exportar.', 'error');
            return;
        }

        // Preparar dados para exportação
        const exportData = suppliers.map(supplier => ({
            'Nome': supplier.name,
            'Contato': supplier.contact_info || '',
            'Cadastrado em': new Date(supplier.created_at).toLocaleString('pt-BR'),
            'Cadastrado por': supplier.created_by
        }));

        // Criar workbook
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Fornecedores');

        // Gerar nome do arquivo com data
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const fileName = `fornecedores_${dateStr}.xlsx`;

        // Salvar arquivo
        XLSX.writeFile(workbook, fileName);

        showMessage(`Arquivo ${fileName} exportado com sucesso!`, 'success');

    } catch (error) {
        console.error('Erro na exportação:', error);
        showMessage('Erro na exportação: ' + error.message, 'error');
    }
}


