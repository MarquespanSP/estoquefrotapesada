// Script para controle de frota
let currentUser = null;

// Inicialização do Supabase (usando cliente centralizado)
async function initSupabase() {
    // Cliente já inicializado em supabase_client.js
}

// Verificar autenticação
async function checkAuth() {
    const user = await getLoggedUser();
    currentUser = user;

    if (!user) {
        window.location.href = 'index.html';
        return;
    }

    // Carregar dados iniciais se necessário
    loadInitialData();
}

// Carregar dados iniciais
async function loadInitialData() {
    // Implementar carregamento de dados se necessário
}

// Mostrar seção de cadastro de veículo
function showVehicleRegistration() {
    document.getElementById('vehicle-registration-section').style.display = 'block';
    document.getElementById('vehicle-search-section').style.display = 'none';
    document.getElementById('vehicle-registration-section').scrollIntoView({ behavior: 'smooth' });
}

// Mostrar seção de busca de veículo
function showVehicleSearch() {
    document.getElementById('vehicle-search-section').style.display = 'block';
    document.getElementById('vehicle-registration-section').style.display = 'none';
    document.getElementById('vehicle-search-section').scrollIntoView({ behavior: 'smooth' });
}

// Cadastro de veículo
document.getElementById('vehicle-form').addEventListener('submit', async function(e) {
    e.preventDefault();

    const formData = new FormData(this);
    const vehicleData = {
        filial: formData.get('filial'),
        placa: formData.get('placa'),
        chassi: formData.get('chassi'),
        marca: formData.get('marca'),
        modelo: formData.get('modelo'),
        frota: formData.get('frota'),
        grupo: formData.get('grupo'),
        ano_fabricacao: parseInt(formData.get('ano_fabricacao')),
        status: formData.get('status'),
        qrcode: formData.get('qrcode'),
        created_by: currentUser.id,
        created_at: new Date().toISOString()
    };

    try {
        const { data, error } = await supabaseClient
            .from('vehicles')
            .insert([vehicleData]);

        if (error) throw error;

        showMessage('registration-message', 'Veículo cadastrado com sucesso!', 'success');
        this.reset();
    } catch (error) {
        console.error('Erro ao cadastrar veículo:', error);
        showMessage('registration-message', 'Erro ao cadastrar veículo: ' + error.message, 'error');
    }
});

// Busca de veículos
document.getElementById('search-vehicle-form').addEventListener('submit', async function(e) {
    e.preventDefault();

    const formData = new FormData(this);
    const searchCriteria = {};

    // Coletar critérios de busca
    if (formData.get('search_placa')) searchCriteria.placa = formData.get('search_placa');
    if (formData.get('search_chassi')) searchCriteria.chassi = formData.get('search_chassi');
    if (formData.get('search_marca')) searchCriteria.marca = formData.get('search_marca');
    if (formData.get('search_modelo')) searchCriteria.modelo = formData.get('search_modelo');
    if (formData.get('search_frota')) searchCriteria.frota = formData.get('search_frota');
    if (formData.get('search_status')) searchCriteria.status = formData.get('search_status');
    if (formData.get('search_qrcode')) searchCriteria.qrcode = formData.get('search_qrcode');

    try {
        let query = supabaseClient.from('vehicles').select('*');

        // Aplicar filtros
        Object.keys(searchCriteria).forEach(key => {
            if (searchCriteria[key]) {
                query = query.ilike(key, `%${searchCriteria[key]}%`);
            }
        });

        const { data: vehicles, error } = await query;

        if (error) throw error;

        displaySearchResults(vehicles);
        showMessage('search-message', `Encontrados ${vehicles.length} veículo(s).`, 'success');
    } catch (error) {
        console.error('Erro ao buscar veículos:', error);
        showMessage('search-message', 'Erro ao buscar veículos: ' + error.message, 'error');
    }
});

// Exibir resultados da busca
function displaySearchResults(vehicles) {
    const resultsContainer = document.getElementById('search-results');
    const resultsBody = document.getElementById('vehicle-results-body');

    if (vehicles.length === 0) {
        resultsContainer.style.display = 'none';
        return;
    }

    resultsBody.innerHTML = '';

    vehicles.forEach(vehicle => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${vehicle.placa}</td>
            <td>${vehicle.chassi}</td>
            <td>${vehicle.marca}</td>
            <td>${vehicle.modelo}</td>
            <td>${vehicle.frota}</td>
            <td>${vehicle.status}</td>
            <td>
                <button class="btn btn-small" onclick="viewVehicleDetails(${vehicle.id})">Ver Detalhes</button>
            </td>
        `;
        resultsBody.appendChild(row);
    });

    resultsContainer.style.display = 'block';
}

// Ver detalhes do veículo
async function viewVehicleDetails(vehicleId) {
    try {
        const { data: vehicle, error } = await supabaseClient
            .from('vehicles')
            .select('*')
            .eq('id', vehicleId)
            .single();

        if (error) throw error;

        const detailsContent = document.getElementById('vehicle-details-content');
        detailsContent.innerHTML = `
            <div class="detail-row"><strong>Filial:</strong> ${vehicle.filial}</div>
            <div class="detail-row"><strong>Placa:</strong> ${vehicle.placa}</div>
            <div class="detail-row"><strong>Chassi:</strong> ${vehicle.chassi}</div>
            <div class="detail-row"><strong>Marca:</strong> ${vehicle.marca}</div>
            <div class="detail-row"><strong>Modelo:</strong> ${vehicle.modelo}</div>
            <div class="detail-row"><strong>Frota:</strong> ${vehicle.frota}</div>
            <div class="detail-row"><strong>Grupo:</strong> ${vehicle.grupo}</div>
            <div class="detail-row"><strong>Ano de Fabricação:</strong> ${vehicle.ano_fabricacao}</div>
            <div class="detail-row"><strong>Status:</strong> ${vehicle.status}</div>
            <div class="detail-row"><strong>QR Code:</strong> ${vehicle.qrcode || 'N/A'}</div>
            <div class="detail-row"><strong>Data de Cadastro:</strong> ${new Date(vehicle.created_at).toLocaleDateString('pt-BR')}</div>
            <div class="modal-actions">
                <button class="btn btn-primary" id="edit-vehicle-btn" onclick="editVehicleDetails(${vehicle.id})">Editar</button>
            </div>
        `;

        document.getElementById('vehicle-details-modal').style.display = 'block';
    } catch (error) {
        console.error('Erro ao carregar detalhes do veículo:', error);
        showMessage('search-message', 'Erro ao carregar detalhes: ' + error.message, 'error');
    }
}

// Editar detalhes do veículo
async function editVehicleDetails(vehicleId) {
    try {
        const { data: vehicle, error } = await supabaseClient
            .from('vehicles')
            .select('*')
            .eq('id', vehicleId)
            .single();

        if (error) throw error;

        const detailsContent = document.getElementById('vehicle-details-content');
        detailsContent.innerHTML = `
            <form id="edit-vehicle-form">
                <div class="form-group">
                    <label for="edit_filial">Filial:</label>
                    <input type="text" id="edit_filial" name="filial" value="${vehicle.filial}" required>
                </div>
                <div class="form-group">
                    <label for="edit_placa">Placa:</label>
                    <input type="text" id="edit_placa" name="placa" value="${vehicle.placa}" required>
                </div>
                <div class="form-group">
                    <label for="edit_chassi">Chassi:</label>
                    <input type="text" id="edit_chassi" name="chassi" value="${vehicle.chassi}" required>
                </div>
                <div class="form-group">
                    <label for="edit_marca">Marca:</label>
                    <input type="text" id="edit_marca" name="marca" value="${vehicle.marca}" required>
                </div>
                <div class="form-group">
                    <label for="edit_modelo">Modelo:</label>
                    <input type="text" id="edit_modelo" name="modelo" value="${vehicle.modelo}" required>
                </div>
                <div class="form-group">
                    <label for="edit_frota">Frota:</label>
                    <input type="text" id="edit_frota" name="frota" value="${vehicle.frota}" required>
                </div>
                <div class="form-group">
                    <label for="edit_grupo">Grupo:</label>
                    <input type="text" id="edit_grupo" name="grupo" value="${vehicle.grupo}" required>
                </div>
                <div class="form-group">
                    <label for="edit_ano_fabricacao">Ano de Fabricação:</label>
                    <input type="number" id="edit_ano_fabricacao" name="ano_fabricacao" value="${vehicle.ano_fabricacao}" required>
                </div>
                <div class="form-group">
                    <label for="edit_status">Status:</label>
                    <select id="edit_status" name="status" required>
                        <option value="Ativo" ${vehicle.status === 'Ativo' ? 'selected' : ''}>Ativo</option>
                        <option value="Inativo" ${vehicle.status === 'Inativo' ? 'selected' : ''}>Inativo</option>
                        <option value="Manutenção" ${vehicle.status === 'Manutenção' ? 'selected' : ''}>Manutenção</option>
                        <option value="Vendido" ${vehicle.status === 'Vendido' ? 'selected' : ''}>Vendido</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="edit_qrcode">QR Code:</label>
                    <input type="text" id="edit_qrcode" name="qrcode" value="${vehicle.qrcode || ''}">
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn btn-secondary" onclick="viewVehicleDetails(${vehicle.id})">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Salvar</button>
                </div>
            </form>
        `;

        // Adicionar event listener para o formulário de edição
        document.getElementById('edit-vehicle-form').addEventListener('submit', async function(e) {
            e.preventDefault();
            await saveVehicleChanges(vehicleId);
        });

    } catch (error) {
        console.error('Erro ao carregar detalhes para edição:', error);
        showMessage('search-message', 'Erro ao carregar detalhes para edição: ' + error.message, 'error');
    }
}

// Salvar alterações do veículo
async function saveVehicleChanges(vehicleId) {
    try {
        const formData = new FormData(document.getElementById('edit-vehicle-form'));
        const vehicleData = {
            filial: formData.get('filial'),
            placa: formData.get('placa'),
            chassi: formData.get('chassi'),
            marca: formData.get('marca'),
            modelo: formData.get('modelo'),
            frota: formData.get('frota'),
            grupo: formData.get('grupo'),
            ano_fabricacao: parseInt(formData.get('ano_fabricacao')),
            status: formData.get('status'),
            qrcode: formData.get('qrcode'),
            updated_at: new Date().toISOString()
        };

        const { error } = await supabaseClient
            .from('vehicles')
            .update(vehicleData)
            .eq('id', vehicleId);

        if (error) throw error;

        showMessage('search-message', 'Veículo atualizado com sucesso!', 'success');

        // Fechar modal e atualizar resultados da busca
        document.getElementById('vehicle-details-modal').style.display = 'none';

        // Re-executar a busca atual para atualizar a tabela
        const searchForm = document.getElementById('search-vehicle-form');
        if (searchForm) {
            searchForm.dispatchEvent(new Event('submit'));
        }

    } catch (error) {
        console.error('Erro ao salvar alterações:', error);
        showMessage('search-message', 'Erro ao salvar alterações: ' + error.message, 'error');
    }
}

// Fechar modal
document.querySelectorAll('.close').forEach(closeBtn => {
    closeBtn.addEventListener('click', function() {
        this.closest('.modal').style.display = 'none';
    });
});

// Função para mostrar mensagens
function showMessage(elementId, message, type) {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.className = `message ${type}-message`;
    element.style.display = 'block';

    setTimeout(() => {
        element.style.display = 'none';
    }, 5000);
}

// Logout
function logoutUser() {
    localStorage.removeItem('userSession');
    window.location.href = 'index.html';
}

// Função para exportar dados para XLSX
async function exportToXLSX() {
    try {
        const { data: vehicles, error } = await supabaseClient
            .from('vehicles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Criar workbook
        const wb = XLSX.utils.book_new();

        // Preparar dados para exportação com cabeçalho
        const exportData = [
            ['Filial', 'Placa', 'Chassi', 'Marca', 'Modelo', 'Frota', 'Grupo', 'Ano de Fabricação', 'Status', 'QR Code'],
            ...vehicles.map(vehicle => [
                vehicle.filial,
                vehicle.placa,
                vehicle.chassi,
                vehicle.marca,
                vehicle.modelo,
                vehicle.frota,
                vehicle.grupo,
                vehicle.ano_fabricacao,
                vehicle.status,
                vehicle.qrcode || ''
            ])
        ];

        // Criar worksheet
        const ws = XLSX.utils.aoa_to_sheet(exportData);

        // Adicionar worksheet ao workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Veículos');

        // Gerar arquivo e fazer download
        const fileName = `frota_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);

        showMessage('registration-message', 'Arquivo XLSX exportado com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao exportar XLSX:', error);
        showMessage('registration-message', 'Erro ao exportar arquivo: ' + error.message, 'error');
    }
}

// Função para mostrar barra de progresso da importação
function showImportProgress() {
    const progressModal = document.createElement('div');
    progressModal.id = 'import-progress-modal';
    progressModal.className = 'modal';
    progressModal.style.display = 'block';
    progressModal.innerHTML = `
        <div class="modal-content progress-modal">
            <div class="modal-header">
                <h3>Importando Veículos...</h3>
            </div>
            <div class="modal-body">
                <div class="progress-container">
                    <div class="progress-bar">
                        <div class="progress-fill" id="progress-fill"></div>
                    </div>
                    <div class="progress-text" id="progress-text">Preparando importação...</div>
                </div>
                <div class="progress-stats">
                    <div class="stat-item">
                        <span class="stat-label">Processados:</span>
                        <span class="stat-value" id="processed-count">0</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Importados:</span>
                        <span class="stat-value" id="imported-count">0</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Atualizados:</span>
                        <span class="stat-value" id="updated-count">0</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Erros:</span>
                        <span class="stat-value" id="errors-count">0</span>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" id="cancel-import-btn">Cancelar</button>
            </div>
        </div>
    `;

    document.body.appendChild(progressModal);

    // Adicionar estilos CSS para a barra de progresso
    const style = document.createElement('style');
    style.textContent = `
        .progress-modal {
            max-width: 500px;
        }
        .progress-container {
            margin: 20px 0;
        }
        .progress-bar {
            width: 100%;
            height: 20px;
            background-color: #f0f0f0;
            border-radius: 10px;
            overflow: hidden;
            margin-bottom: 10px;
        }
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #2c3e50, #3498db);
            width: 0%;
            transition: width 0.3s ease;
            border-radius: 10px;
        }
        .progress-text {
            text-align: center;
            font-weight: bold;
            color: #2c3e50;
        }
        .progress-stats {
            display: flex;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 15px;
        }
        .stat-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            min-width: 80px;
        }
        .stat-label {
            font-size: 12px;
            color: #666;
            margin-bottom: 2px;
        }
        .stat-value {
            font-size: 18px;
            font-weight: bold;
            color: #2c3e50;
        }
    `;
    document.head.appendChild(style);

    return progressModal;
}

// Função para atualizar barra de progresso
function updateImportProgress(processed, total, imported, updated, errors, currentItem = null) {
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    const processedCount = document.getElementById('processed-count');
    const importedCount = document.getElementById('imported-count');
    const updatedCount = document.getElementById('updated-count');
    const errorsCount = document.getElementById('errors-count');

    if (progressFill && progressText && processedCount && importedCount && updatedCount && errorsCount) {
        const percentage = total > 0 ? Math.round((processed / total) * 100) : 0;
        progressFill.style.width = `${percentage}%`;
        progressText.textContent = currentItem ?
            `Processando: ${currentItem} (${processed}/${total})` :
            `Importando... ${percentage}% concluído`;

        processedCount.textContent = processed;
        importedCount.textContent = imported;
        updatedCount.textContent = updated;
        errorsCount.textContent = errors;
    }
}

// Função para remover modal de progresso
function removeImportProgress() {
    const modal = document.getElementById('import-progress-modal');
    if (modal) {
        modal.remove();
    }
}

// Função para importar dados do XLSX
async function importFromXLSX(file) {
    let progressModal = null;
    let isCancelled = false;

    try {
        // Mostrar barra de progresso
        progressModal = showImportProgress();

        // Configurar botão de cancelar
        const cancelBtn = document.getElementById('cancel-import-btn');
        cancelBtn.addEventListener('click', () => {
            isCancelled = true;
            removeImportProgress();
            showMessage('search-message', 'Importação cancelada pelo usuário.', 'warning');
        });

        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                // Pegar primeira planilha
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];

                // Converter para JSON
                const jsonData = XLSX.utils.sheet_to_json(worksheet);

                if (jsonData.length === 0) {
                    removeImportProgress();
                    showMessage('search-message', 'Arquivo XLSX não contém dados válidos.', 'error');
                    return;
                }

                let imported = 0;
                let updated = 0;
                let errors = 0;
                const total = jsonData.length;

                updateImportProgress(0, total, imported, updated, errors, 'Iniciando...');

                for (let i = 0; i < jsonData.length; i++) {
                    if (isCancelled) break;

                    const row = jsonData[i];
                    const currentItem = row['Placa'] || row['placa'] || `Linha ${i + 1}`;

                    try {
                        updateImportProgress(i, total, imported, updated, errors, currentItem);

                        // Mapear colunas do XLSX para campos do banco
                        // Suportando tanto os nomes originais quanto variações
                        const vehicleData = {
                            filial: row['Filial'] || row['filial'] || row['FILIAL'],
                            placa: row['Placa'] || row['placa'] || row['PLACA'],
                            chassi: row['Chassi'] || row['chassi'] || row['CHASSI'],
                            marca: row['Marca'] || row['marca'] || row['MARCA'],
                            modelo: row['Modelo'] || row['modelo'] || row['MODELO'],
                            frota: row['Frota'] || row['frota'] || row['FROTA'] || 'Frota Padrão',
                            grupo: row['Grupo'] || row['grupo'] || row['GRUPO'] || 'Grupo Padrão',
                            ano_fabricacao: parseInt(row['Ano de Fabricação'] || row['ano_fabricacao'] || row['Ano de Fabricacao'] || row['ANO DE FABRICAÇÃO'] || row['ANO_FABRICACAO'] || 2020),
                            status: row['Status'] || row['status'] || row['STATUS'] || 'Ativo',
                            qrcode: row['QR Code'] || row['qrcode'] || row['QRCode'] || row['QR CODE'] || row['QRCODE'] || '',
                            updated_at: new Date().toISOString()
                        };

                        // Validar campos obrigatórios
                        if (!vehicleData.filial || !vehicleData.placa || !vehicleData.chassi ||
                            !vehicleData.marca || !vehicleData.modelo || !vehicleData.frota ||
                            !vehicleData.grupo || isNaN(vehicleData.ano_fabricacao) || !vehicleData.status) {
                            console.error('Linha com dados incompletos:', row);
                            errors++;
                            continue;
                        }

                        // Verificar se veículo já existe pela placa
                        const { data: existingVehicles, error: checkError } = await supabaseClient
                            .from('vehicles')
                            .select('id')
                            .eq('placa', vehicleData.placa);

                        if (checkError) {
                            console.error('Erro ao verificar veículo existente:', checkError);
                            errors++;
                            continue;
                        }

                        if (existingVehicles && existingVehicles.length > 0) {
                            // Atualizar veículo existente (não atualizar campos de criação)
                            const updateData = { ...vehicleData };
                            delete updateData.created_by; // Não atualizar created_by
                            delete updateData.created_at; // Não atualizar created_at

                            const { error: updateError } = await supabaseClient
                                .from('vehicles')
                                .update(updateData)
                                .eq('placa', vehicleData.placa);

                            if (updateError) throw updateError;
                            updated++;
                        } else {
                            // Inserir novo veículo
                            vehicleData.created_by = currentUser.id;
                            vehicleData.created_at = new Date().toISOString();

                            const { error: insertError } = await supabaseClient
                                .from('vehicles')
                                .insert([vehicleData]);

                            if (insertError) throw insertError;
                            imported++;
                        }

                        // Pequena pausa para não sobrecarregar a UI
                        await new Promise(resolve => setTimeout(resolve, 10));

                    } catch (rowError) {
                        console.error('Erro na linha:', row, rowError);
                        errors++;
                    }
                }

                // Finalizar progresso
                updateImportProgress(total, total, imported, updated, errors, 'Concluído!');

                // Aguardar um pouco para mostrar o resultado final
                setTimeout(() => {
                    removeImportProgress();

                    if (!isCancelled) {
                        showMessage('search-message',
                            `Importação concluída! Importados: ${imported}, Atualizados: ${updated}, Erros: ${errors}`,
                            errors > 0 ? 'warning' : 'success'
                        );
                    }
                }, 1000);

            } catch (error) {
                removeImportProgress();
                console.error('Erro ao processar XLSX:', error);
                showMessage('search-message', 'Erro ao processar arquivo XLSX: ' + error.message, 'error');
            }
        };

        reader.readAsArrayBuffer(file);
    } catch (error) {
        if (progressModal) removeImportProgress();
        console.error('Erro ao importar XLSX:', error);
        showMessage('search-message', 'Erro ao importar arquivo: ' + error.message, 'error');
    }
}

// Event listeners para botões de import/export
document.getElementById('export-xlsx-btn').addEventListener('click', exportToXLSX);

document.getElementById('import-xlsx-btn').addEventListener('click', function() {
    document.getElementById('import-file').click();
});

document.getElementById('import-file').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        importFromXLSX(file);
        // Limpar input para permitir reimportar o mesmo arquivo
        e.target.value = '';
    }
});

// Inicialização
document.addEventListener('DOMContentLoaded', async function() {
    await initSupabase();
    await checkAuth();
});
