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

// Inicialização
document.addEventListener('DOMContentLoaded', async function() {
    await initSupabase();
    await checkAuth();
});
