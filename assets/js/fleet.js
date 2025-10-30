// Script para controle de frota
let supabase;
let currentUser = null;

// Inicialização do Supabase
async function initSupabase() {
    const SUPABASE_URL = 'https://iutwaspoegvbebaemghy.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1dHdhc3BvZWd2YmViYWVtZ2h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMDg0MzIsImV4cCI6MjA3Njg4NDQzMn0.orZgrWLHhps1wpKbeP_fKLeF0Xjog-ECYdIkxC_LcCc';

    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
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
        const { data, error } = await supabase
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
        let query = supabase.from('vehicles').select('*');

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
        const { data: vehicle, error } = await supabase
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
        `;

        document.getElementById('vehicle-details-modal').style.display = 'block';
    } catch (error) {
        console.error('Erro ao carregar detalhes do veículo:', error);
        showMessage('search-message', 'Erro ao carregar detalhes: ' + error.message, 'error');
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
        const { data: vehicles, error } = await supabase
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

// Função para importar dados do XLSX
async function importFromXLSX(file) {
    try {
        const reader = new FileReader();
        reader.onload = async function(e) {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            // Pegar primeira planilha
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            // Converter para JSON
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            let imported = 0;
            let updated = 0;
            let errors = 0;

            for (const row of jsonData) {
                try {
                    // Mapear colunas do XLSX para campos do banco
                    const vehicleData = {
                        filial: row['Filial'] || row['filial'],
                        placa: row['Placa'] || row['placa'],
                        chassi: row['Chassi'] || row['chassi'],
                        marca: row['Marca'] || row['marca'],
                        modelo: row['Modelo'] || row['modelo'],
                        frota: row['Frota'] || row['frota'],
                        grupo: row['Grupo'] || row['grupo'],
                        ano_fabricacao: parseInt(row['Ano de Fabricação'] || row['ano_fabricacao'] || row['Ano de Fabricacao']),
                        status: row['Status'] || row['status'],
                        qrcode: row['QR Code'] || row['qrcode'] || row['QRCode'] || '',
                        updated_at: new Date().toISOString()
                    };

                    // Verificar se veículo já existe pela placa
                    const { data: existingVehicles, error: checkError } = await supabase
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

                        const { error: updateError } = await supabase
                            .from('vehicles')
                            .update(updateData)
                            .eq('placa', vehicleData.placa);

                        if (updateError) throw updateError;
                        updated++;
                    } else {
                        // Inserir novo veículo
                        vehicleData.created_by = currentUser.id;
                        vehicleData.created_at = new Date().toISOString();

                        const { error: insertError } = await supabase
                            .from('vehicles')
                            .insert([vehicleData]);

                        if (insertError) throw insertError;
                        imported++;
                    }
                } catch (rowError) {
                    console.error('Erro na linha:', row, rowError);
                    errors++;
                }
            }

            showMessage('search-message',
                `Importação concluída! Importados: ${imported}, Atualizados: ${updated}, Erros: ${errors}`,
                errors > 0 ? 'warning' : 'success'
            );
        };

        reader.readAsArrayBuffer(file);
    } catch (error) {
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
