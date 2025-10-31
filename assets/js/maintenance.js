// Script para controle de manutenção
let currentUser = null;
let maintenanceItems = [];
let uploadedFiles = [];

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

    // Carregar dados iniciais
    loadInitialData();
}

// Carregar dados iniciais
async function loadInitialData() {
    await loadSuppliers();
    setDefaultDate();
}

// Carregar fornecedores
async function loadSuppliers() {
    try {
        const { data: suppliers, error } = await supabaseClient
            .from('suppliers')
            .select('id, name')
            .order('name');

        if (error) throw error;

        const supplierSelect = document.getElementById('fornecedor');
        supplierSelect.innerHTML = '<option value="">Selecione um fornecedor</option>';

        suppliers.forEach(supplier => {
            const option = document.createElement('option');
            option.value = supplier.id;
            option.textContent = supplier.name;
            supplierSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao carregar fornecedores:', error);
    }
}

// Definir data padrão
function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('data_manutencao').value = today;
}

// Mostrar seção de cadastro de manutenção
function showMaintenanceRegistration() {
    document.getElementById('maintenance-registration-section').style.display = 'block';
    document.getElementById('maintenance-search-section').style.display = 'none';
    document.getElementById('maintenance-registration-section').scrollIntoView({ behavior: 'smooth' });
    showTab('cadastro');
}

// Mostrar seção de busca de manutenção
function showMaintenanceSearch() {
    document.getElementById('maintenance-search-section').style.display = 'block';
    document.getElementById('maintenance-registration-section').style.display = 'none';
    document.getElementById('maintenance-search-section').scrollIntoView({ behavior: 'smooth' });
}

// Trocar abas
function showTab(tabName) {
    // Esconder todas as abas
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Remover classe active de todos os botões
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });

    // Mostrar aba selecionada
    document.getElementById(tabName + '-tab').classList.add('active');
    event.target.classList.add('active');
}

// Adicionar item à manutenção
function addMaintenanceItem() {
    const tbody = document.getElementById('maintenance-items-body');

    const row = document.createElement('tr');
    row.className = 'maintenance-item-row';
    row.innerHTML = `
        <td><input type="number" class="item-qtd" value="1" min="1" onchange="calculateItemTotal(this)"></td>
        <td>
            <input type="text" class="item-name" placeholder="Nome da peça/item" onchange="updateItemTotal(this)" oninput="searchMaintenancePieces(this)" autocomplete="off">
            <datalist id="pieces-datalist-${Date.now()}"></datalist>
        </td>
        <td><input type="number" class="item-value" step="0.01" min="0" placeholder="0,00" onchange="calculateItemTotal(this)"></td>
        <td class="item-total">R$ 0,00</td>
        <td><button type="button" class="btn btn-danger btn-small" onclick="removeMaintenanceItem(this)">-</button></td>
    `;

    tbody.appendChild(row);
    calculateTotal();
}

// Remover item da manutenção
function removeMaintenanceItem(button) {
    button.closest('tr').remove();
    calculateTotal();
}

// Calcular total do item
function calculateItemTotal(element) {
    const row = element.closest('tr');
    const qtd = parseFloat(row.querySelector('.item-qtd').value) || 0;
    const value = parseFloat(row.querySelector('.item-value').value) || 0;
    const total = qtd * value;

    row.querySelector('.item-total').textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
    calculateTotal();
}

// Atualizar total (chamado quando nome muda)
function updateItemTotal(element) {
    calculateItemTotal(element);
}

// Buscar peças de manutenção para autocomplete
async function searchMaintenancePieces(inputElement) {
    const query = inputElement.value.trim();
    if (query.length < 2) return;

    try {
        const { data: pieces, error } = await supabaseClient
            .from('maintenance_pieces')
            .select('nome, valor_unitario, tipo')
            .ilike('nome', `%${query}%`)
            .eq('status', 'ATIVO')
            .limit(10);

        if (error) throw error;

        // Criar datalist para o input
        const datalistId = inputElement.nextElementSibling.id;
        const datalist = document.getElementById(datalistId);
        datalist.innerHTML = '';

        pieces.forEach(piece => {
            const option = document.createElement('option');
            option.value = piece.nome;
            option.setAttribute('data-value', piece.valor_unitario);
            option.setAttribute('data-type', piece.tipo);
            datalist.appendChild(option);
        });

        // Adicionar listener para quando uma opção for selecionada
        inputElement.addEventListener('change', function() {
            const selectedOption = Array.from(datalist.options).find(option => option.value === this.value);
            if (selectedOption) {
                const row = this.closest('tr');
                const valueInput = row.querySelector('.item-value');
                valueInput.value = parseFloat(selectedOption.getAttribute('data-value')).toFixed(2);
                calculateItemTotal(valueInput);
            }
        });

    } catch (error) {
        console.error('Erro ao buscar peças:', error);
    }
}

// Calcular total geral
function calculateTotal() {
    const rows = document.querySelectorAll('.maintenance-item-row');
    let total = 0;

    rows.forEach(row => {
        const totalText = row.querySelector('.item-total').textContent;
        const value = parseFloat(totalText.replace('R$ ', '').replace(',', '.')) || 0;
        total += value;
    });

    document.getElementById('total-value').textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
}

// Buscar veículo
document.getElementById('search-vehicle-btn').addEventListener('click', function() {
    document.getElementById('vehicle-search-modal').style.display = 'block';
});

// Buscar fornecedor
document.getElementById('search-supplier-btn').addEventListener('click', function() {
    document.getElementById('supplier-search-modal').style.display = 'block';
});

// Busca de veículos no modal
document.getElementById('modal-vehicle-search-form').addEventListener('submit', async function(e) {
    e.preventDefault();

    const placa = document.getElementById('modal_search_placa').value;
    const marca = document.getElementById('modal_search_marca').value;

    try {
        let query = supabaseClient.from('vehicles').select('*');

        if (placa) query = query.ilike('placa', `%${placa}%`);
        if (marca) query = query.ilike('marca', `%${marca}%`);

        const { data: vehicles, error } = await query.limit(10);

        if (error) throw error;

        displayVehicleResults(vehicles);
    } catch (error) {
        console.error('Erro ao buscar veículos:', error);
        showMessage('maintenance-message', 'Erro ao buscar veículos: ' + error.message, 'error');
    }
});

// Exibir resultados da busca de veículos
function displayVehicleResults(vehicles) {
    const resultsContainer = document.getElementById('modal-vehicle-results');

    if (vehicles.length === 0) {
        resultsContainer.innerHTML = '<p>Nenhum veículo encontrado.</p>';
        return;
    }

    let html = '<div class="vehicle-list">';
    vehicles.forEach(vehicle => {
        html += `
            <div class="vehicle-item" onclick="selectVehicle('${vehicle.placa}')">
                <strong>${vehicle.placa}</strong> - ${vehicle.marca} ${vehicle.modelo}
                <br><small>Chassi: ${vehicle.chassi}</small>
            </div>
        `;
    });
    html += '</div>';

    resultsContainer.innerHTML = html;
}

// Selecionar veículo
function selectVehicle(placa) {
    document.getElementById('veiculo_placa').value = placa;
    document.getElementById('vehicle-search-modal').style.display = 'none';
}

// Busca de fornecedores no modal
document.getElementById('modal-supplier-search-form').addEventListener('submit', async function(e) {
    e.preventDefault();

    const name = document.getElementById('modal_search_supplier').value;

    try {
        const { data: suppliers, error } = await supabaseClient
            .from('suppliers')
            .select('*')
            .ilike('name', `%${name}%`)
            .limit(10);

        if (error) throw error;

        displaySupplierResults(suppliers);
    } catch (error) {
        console.error('Erro ao buscar fornecedores:', error);
        showMessage('maintenance-message', 'Erro ao buscar fornecedores: ' + error.message, 'error');
    }
});

// Exibir resultados da busca de fornecedores
function displaySupplierResults(suppliers) {
    const resultsContainer = document.getElementById('modal-supplier-results');

    if (suppliers.length === 0) {
        resultsContainer.innerHTML = '<p>Nenhum fornecedor encontrado.</p>';
        return;
    }

    let html = '<div class="supplier-list">';
    suppliers.forEach(supplier => {
        html += `
            <div class="supplier-item" onclick="selectSupplier(${supplier.id}, '${supplier.name}')">
                <strong>${supplier.name}</strong>
                <br><small>${supplier.contact || 'Sem contato'}</small>
            </div>
        `;
    });
    html += '</div>';

    resultsContainer.innerHTML = html;
}

// Selecionar fornecedor
function selectSupplier(id, name) {
    const supplierSelect = document.getElementById('fornecedor');
    supplierSelect.value = id;
    document.getElementById('supplier-search-modal').style.display = 'none';
}

// Upload de arquivos
document.getElementById('upload-btn').addEventListener('click', function() {
    document.getElementById('file-upload').click();
});

document.getElementById('file-upload').addEventListener('change', function(e) {
    const files = Array.from(e.target.files);
    displaySelectedFiles(files);
});

// Exibir arquivos selecionados
function displaySelectedFiles(files) {
    const fileList = document.getElementById('file-list');
    uploadedFiles = files;

    if (files.length === 0) {
        fileList.innerHTML = '<p>Nenhum arquivo selecionado.</p>';
        return;
    }

    let html = '<div class="selected-files">';
    files.forEach((file, index) => {
        html += `
            <div class="file-item">
                <span>${file.name} (${formatFileSize(file.size)})</span>
                <button type="button" class="btn btn-danger btn-small" onclick="removeFile(${index})">Remover</button>
            </div>
        `;
    });
    html += '</div>';

    fileList.innerHTML = html;
}

// Formatar tamanho do arquivo
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Remover arquivo da lista
function removeFile(index) {
    uploadedFiles.splice(index, 1);
    displaySelectedFiles(uploadedFiles);
}

// Abrir página de peças de manutenção
function openMaintenancePiecesPage() {
    window.location.href = 'maintenance_pieces.html';
}

// Salvar manutenção
document.getElementById('save-maintenance-btn').addEventListener('click', async function() {
    await saveMaintenance();
});

// Cancelar manutenção
document.getElementById('cancel-maintenance-btn').addEventListener('click', function() {
    if (confirm('Tem certeza que deseja cancelar? Todos os dados serão perdidos.')) {
        resetMaintenanceForm();
    }
});

// Salvar manutenção
async function saveMaintenance() {
    try {
        // Coletar dados do formulário
        const formData = new FormData(document.getElementById('maintenance-form'));
        const maintenanceData = {
            filial: formData.get('filial'),
            titulo: formData.get('titulo'),
            tipo_manutencao: formData.get('tipo_manutencao'),
            status: formData.get('status'),
            data_manutencao: formData.get('data_manutencao'),
            veiculo_placa: formData.get('veiculo_placa'),
            hodometro: formData.get('hodometro') ? parseInt(formData.get('hodometro')) : null,
            fornecedor_id: formData.get('fornecedor') ? parseInt(formData.get('fornecedor')) : null,
            nfe: formData.get('nfe'),
            nfse: formData.get('nfse'),
            numero_os: formData.get('numero_os'),
            descricao: formData.get('descricao'),
            total_valor: calculateTotalValue(),
            created_by: currentUser.id
        };

        // Validar campos obrigatórios
        if (!maintenanceData.filial || !maintenanceData.titulo || !maintenanceData.tipo_manutencao ||
            !maintenanceData.data_manutencao || !maintenanceData.veiculo_placa) {
            showMessage('maintenance-message', 'Por favor, preencha todos os campos obrigatórios.', 'error');
            return;
        }

        // Inserir manutenção
        const { data: maintenance, error: maintenanceError } = await supabaseClient
            .from('maintenances')
            .insert([maintenanceData])
            .select()
            .single();

        if (maintenanceError) throw maintenanceError;

        // Inserir itens
        const itemsData = collectMaintenanceItems(maintenance.id);
        if (itemsData.length > 0) {
            const { error: itemsError } = await supabaseClient
                .from('maintenance_items')
                .insert(itemsData);

            if (itemsError) throw itemsError;
        }

        // Upload de arquivos
        if (uploadedFiles.length > 0) {
            await uploadMaintenanceFiles(maintenance.id);
        }

        showMessage('maintenance-message', 'Manutenção cadastrada com sucesso!', 'success');
        resetMaintenanceForm();

    } catch (error) {
        console.error('Erro ao salvar manutenção:', error);
        showMessage('maintenance-message', 'Erro ao salvar manutenção: ' + error.message, 'error');
    }
}

// Coletar itens da manutenção
function collectMaintenanceItems(maintenanceId) {
    const rows = document.querySelectorAll('.maintenance-item-row');
    const items = [];

    rows.forEach(row => {
        const qtd = parseInt(row.querySelector('.item-qtd').value) || 0;
        const name = row.querySelector('.item-name').value.trim();
        const value = parseFloat(row.querySelector('.item-value').value) || 0;

        if (qtd > 0 && name && value > 0) {
            items.push({
                maintenance_id: maintenanceId,
                qtd: qtd,
                item_peca: name,
                valor_unitario: value,
                total: qtd * value
            });
        }
    });

    return items;
}

// Calcular valor total
function calculateTotalValue() {
    const totalText = document.getElementById('total-value').textContent;
    return parseFloat(totalText.replace('R$ ', '').replace(',', '.')) || 0;
}

// Upload de arquivos da manutenção
async function uploadMaintenanceFiles(maintenanceId) {
    for (const file of uploadedFiles) {
        try {
            // Criar nome único para o arquivo
            const fileExt = file.name.split('.').pop();
            const fileName = `${maintenanceId}_${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;

            // Upload para Supabase Storage
            const { data: uploadData, error: uploadError } = await supabaseClient.storage
                .from('maintenance-uploads')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            // Inserir registro no banco
            const { error: dbError } = await supabaseClient
                .from('maintenance_uploads')
                .insert([{
                    maintenance_id: maintenanceId,
                    file_name: file.name,
                    file_url: uploadData.path,
                    file_type: file.type,
                    file_size: file.size,
                    uploaded_by: currentUser.id
                }]);

            if (dbError) throw dbError;

        } catch (error) {
            console.error('Erro ao fazer upload do arquivo:', file.name, error);
            // Continua com os outros arquivos mesmo se um falhar
        }
    }
}

// Resetar formulário
function resetMaintenanceForm() {
    document.getElementById('maintenance-form').reset();
    document.getElementById('maintenance-items-body').innerHTML = '';
    document.getElementById('total-value').textContent = 'R$ 0,00';
    uploadedFiles = [];
    document.getElementById('file-list').innerHTML = '<p>Nenhum arquivo selecionado.</p>';
    setDefaultDate();
    showTab('cadastro');
}

// Busca de manutenções
document.getElementById('search-maintenance-form').addEventListener('submit', async function(e) {
    e.preventDefault();

    const formData = new FormData(this);
    const searchCriteria = {};

    if (formData.get('search_titulo')) searchCriteria.titulo = formData.get('search_titulo');
    if (formData.get('search_veiculo')) searchCriteria.veiculo_placa = formData.get('search_veiculo');
    if (formData.get('search_status')) searchCriteria.status = formData.get('search_status');
    if (formData.get('search_data_inicio')) searchCriteria.data_inicio = formData.get('search_data_inicio');
    if (formData.get('search_data_fim')) searchCriteria.data_fim = formData.get('search_data_fim');

    try {
        let query = supabaseClient.from('maintenances').select(`
            *,
            vehicles!inner(placa, marca, modelo)
        `);

        Object.keys(searchCriteria).forEach(key => {
            if (searchCriteria[key]) {
                if (key === 'data_inicio') {
                    query = query.gte('data_manutencao', searchCriteria[key]);
                } else if (key === 'data_fim') {
                    query = query.lte('data_manutencao', searchCriteria[key]);
                } else {
                    query = query.ilike(key, `%${searchCriteria[key]}%`);
                }
            }
        });

        const { data: maintenances, error } = await query.order('data_manutencao', { ascending: false });

        if (error) throw error;

        displayMaintenanceSearchResults(maintenances);
        showMessage('search-maintenance-message', `Encontradas ${maintenances.length} manutenção(ões).`, 'success');
    } catch (error) {
        console.error('Erro ao buscar manutenções:', error);
        showMessage('search-maintenance-message', 'Erro ao buscar manutenções: ' + error.message, 'error');
    }
});

// Exibir resultados da busca de manutenções
function displayMaintenanceSearchResults(maintenances) {
    const resultsContainer = document.getElementById('search-maintenance-results');
    const resultsBody = document.getElementById('maintenance-results-body');

    if (maintenances.length === 0) {
        resultsContainer.style.display = 'none';
        return;
    }

    resultsBody.innerHTML = '';

    maintenances.forEach(maintenance => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${maintenance.titulo}</td>
            <td>${maintenance.veiculo_placa}</td>
            <td>${new Date(maintenance.data_manutencao).toLocaleDateString('pt-BR')}</td>
            <td>${maintenance.status}</td>
            <td>R$ ${maintenance.total_valor.toFixed(2).replace('.', ',')}</td>
            <td>
                <button class="btn btn-small" onclick="viewMaintenanceDetails(${maintenance.id})">Ver Detalhes</button>
            </td>
        `;
        resultsBody.appendChild(row);
    });

    resultsContainer.style.display = 'block';
}

// Ver detalhes da manutenção
async function viewMaintenanceDetails(maintenanceId) {
    // Implementar modal de detalhes da manutenção
    console.log('Ver detalhes da manutenção:', maintenanceId);
}

// Fechar modais
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

// Event listeners
document.getElementById('add-item-btn').addEventListener('click', addMaintenanceItem);

// Inicialização
document.addEventListener('DOMContentLoaded', async function() {
    await initSupabase();
    await checkAuth();
});
