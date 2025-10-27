// Script JavaScript para gerenciamento de locais

// Variável para controlar modo de edição
let editingLocationId = null;

// Carregar locais quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    loadLocations();
    setupFormValidation();
    loadUserInfo();
});

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
    const locationCodeInput = document.getElementById('location_code');

    locationCodeInput.addEventListener('input', function() {
        this.value = this.value.toUpperCase();
    });

    const form = document.getElementById('location-form');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            if (editingLocationId) {
                updateLocation();
            } else {
                registerLocation();
            }
        });
    }
}

async function registerLocation() {
    try {
        const locationCode = document.getElementById('location_code').value.trim().toUpperCase();
        const locationDescription = document.getElementById('location_description').value.trim();

        // Validações
        if (!locationCode) {
            throw new Error('Código do local é obrigatório');
        }

        // Verificar se o código do local já existe
        const { data: existingLocations, error: checkError } = await supabaseClient
            .from('locations')
            .select('code')
            .eq('code', locationCode)
            .limit(1);

        if (checkError) throw checkError;

        if (existingLocations && existingLocations.length > 0) {
            throw new Error('Este código de local já está cadastrado');
        }

        // Obter usuário logado
        const userSession = await getLoggedUser();
        if (!userSession) {
            throw new Error('Usuário não autenticado');
        }

        // Inserir novo local
        const { data: newLocation, error: insertError } = await supabaseClient
            .from('locations')
            .insert([
                {
                    code: locationCode,
                    description: locationDescription || null,
                    created_by: userSession.username,
                    created_at: new Date().toISOString(),
                    is_active: true
                }
            ])
            .select()
            .single();

        if (insertError) {
            throw new Error('Erro ao cadastrar local: ' + insertError.message);
        }

        console.log('Local cadastrado com sucesso:', newLocation);
        showMessage('Local cadastrado com sucesso!', 'success');

        // Limpar formulário e recarregar lista
        resetForm();
        loadLocations();

    } catch (error) {
        console.error('Erro no cadastro de local:', error.message);
        showMessage('Erro no cadastro: ' + error.message, 'error');
    }
}

async function loadLocations() {
    try {
        const { data: locations, error } = await supabaseClient
            .from('locations')
            .select('id, code, description, created_at, created_by')
            .eq('is_active', true)
            .order('code');

        if (error) throw error;

        const container = document.getElementById('locations-container');
        container.innerHTML = '';

        if (locations.length === 0) {
            container.innerHTML = '<p>Nenhum local cadastrado ainda.</p>';
            return;
        }

        locations.forEach(location => {
            const locationDiv = document.createElement('div');
            locationDiv.className = 'location-item';
            locationDiv.innerHTML = `
                <div class="location-info">
                    <strong>${location.code}</strong>
                    ${location.description ? `<br><small>${location.description}</small>` : ''}
                    <br><small>Cadastrado em: ${new Date(location.created_at).toLocaleString('pt-BR')} por ${location.created_by}</small>
                </div>
            `;
            container.appendChild(locationDiv);
        });
    } catch (error) {
        console.error('Erro ao carregar locais:', error);
        showMessage('Erro ao carregar locais. Tente novamente.', 'error');
    }
}

async function deleteLocation(locationId, locationCode) {
    if (!confirm(`Tem certeza que deseja excluir o local "${locationCode}"?`)) {
        return;
    }

    try {
        // Verificar se o local está sendo usado em movimentações
        const { data: movements, error: checkError } = await supabaseClient
            .from('stock_movements')
            .select('id')
            .eq('location_id', locationId)
            .limit(1);

        if (checkError) throw checkError;

        if (movements.length > 0) {
            throw new Error('Não é possível excluir este local pois existem movimentações associadas a ele');
        }

        // Desativar local (soft delete)
        const { error: deleteError } = await supabaseClient
            .from('locations')
            .update({ is_active: false })
            .eq('id', locationId);

        if (deleteError) {
            throw new Error('Erro ao excluir local: ' + deleteError.message);
        }

        showMessage('Local excluído com sucesso!', 'success');
        loadLocations();

    } catch (error) {
        console.error('Erro ao excluir local:', error.message);
        showMessage('Erro ao excluir: ' + error.message, 'error');
    }
}

async function editLocation(locationId) {
    try {
        // Buscar dados do local
        const { data: location, error } = await supabaseClient
            .from('locations')
            .select('id, code, description')
            .eq('id', locationId)
            .single();

        if (error) throw error;

        // Preencher formulário
        document.getElementById('location_code').value = location.code;
        document.getElementById('location_description').value = location.description || '';

        // Definir modo de edição
        editingLocationId = locationId;

        // Alterar texto do botão
        const submitBtn = document.querySelector('#location-form button[type="submit"]');
        submitBtn.textContent = 'Salvar';

        // Focar no campo de código
        document.getElementById('location_code').focus();

        showMessage('Modo de edição ativado. Faça as alterações e clique em Salvar.', 'info');

    } catch (error) {
        console.error('Erro ao carregar local para edição:', error);
        showMessage('Erro ao carregar local para edição.', 'error');
    }
}

async function updateLocation() {
    try {
        const locationCode = document.getElementById('location_code').value.trim().toUpperCase();
        const locationDescription = document.getElementById('location_description').value.trim();

        // Validações
        if (!locationCode) {
            throw new Error('Código do local é obrigatório');
        }

        // Verificar se o código já existe em outro local
        const { data: existingLocations, error: checkError } = await supabaseClient
            .from('locations')
            .select('id, code')
            .eq('code', locationCode)
            .neq('id', editingLocationId)
            .limit(1);

        if (checkError) throw checkError;

        if (existingLocations && existingLocations.length > 0) {
            throw new Error('Este código de local já está sendo usado por outro local');
        }

        // Atualizar local
        const { data: updatedLocation, error: updateError } = await supabaseClient
            .from('locations')
            .update({
                code: locationCode,
                description: locationDescription || null
            })
            .eq('id', editingLocationId)
            .select()
            .single();

        if (updateError) {
            throw new Error('Erro ao atualizar local: ' + updateError.message);
        }

        console.log('Local atualizado com sucesso:', updatedLocation);
        showMessage('Local atualizado com sucesso!', 'success');

        // Limpar formulário e recarregar lista
        resetForm();
        loadLocations();

    } catch (error) {
        console.error('Erro na atualização do local:', error.message);
        showMessage('Erro na atualização: ' + error.message, 'error');
    }
}

function resetForm() {
    document.getElementById('location-form').reset();
    editingLocationId = null;

    // Voltar texto do botão
    const submitBtn = document.querySelector('#location-form button[type="submit"]');
    submitBtn.textContent = 'Cadastrar Local';
}
