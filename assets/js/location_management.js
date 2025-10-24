// Script JavaScript para gerenciamento de locais

// Carregar locais quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    loadLocations();
    setupFormValidation();
});

function setupFormValidation() {
    const locationCodeInput = document.getElementById('location_code');

    locationCodeInput.addEventListener('input', function() {
        this.value = this.value.toUpperCase();
    });

    const form = document.getElementById('location-form');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            registerLocation();
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
        const { data: existingLocation, error: checkError } = await supabaseClient
            .from('locations')
            .select('code')
            .eq('code', locationCode)
            .single();

        if (existingLocation) {
            throw new Error('Este código de local já está cadastrado');
        }

        // Obter usuário logado
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) {
            throw new Error('Usuário não autenticado');
        }

        const { data: userData } = await supabaseClient
            .from('users')
            .select('username')
            .eq('username', user.email)
            .single();

        // Inserir novo local
        const { data: newLocation, error: insertError } = await supabaseClient
            .from('locations')
            .insert([
                {
                    code: locationCode,
                    description: locationDescription || null,
                    created_by: userData.username,
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
        document.getElementById('location-form').reset();
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
                <div class="location-actions">
                    <button class="btn-small" onclick="editLocation(${location.id})">Editar</button>
                    <button class="btn-small btn-danger" onclick="deleteLocation(${location.id}, '${location.code}')">Excluir</button>
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

function editLocation(locationId) {
    // Implementar edição de local se necessário
    showMessage('Funcionalidade de edição será implementada em breve.', 'info');
}
