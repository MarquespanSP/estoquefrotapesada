// Script para controle de permissões no dashboard

// Função para aplicar permissões baseado no nível de acesso
async function applyPermissions() {
    try {
        const user = await getLoggedUser();

        if (!user) {
            console.log('Usuário não logado, redirecionando...');
            window.location.href = 'index.html';
            return;
        }

        const userRole = user.role;
        console.log('Aplicando permissões para:', userRole);

        // Esconder todos os cards inicialmente
        const allCards = document.querySelectorAll('.dashboard-grid .card');
        allCards.forEach(card => {
            card.style.display = 'none';
        });

        // Aplicar permissões baseado no nível de acesso
        switch (userRole) {
            case 'Operador':
                applyOperatorPermissions();
                break;
            case 'Supervisor':
                applySupervisorPermissions();
                break;
            case 'Diretoria':
                applyDiretoriaPermissions();
                break;
            case 'Administrador':
                applyAdminPermissions();
                break;
            default:
                console.log('Nível de acesso não reconhecido:', userRole);
                // Por padrão, mostrar apenas controle de estoque
                applyOperatorPermissions();
        }

    } catch (error) {
        console.error('Erro ao aplicar permissões:', error);
        // Em caso de erro, redirecionar para login
        window.location.href = 'index.html';
    }
}

// Função para permissões de Operador
function applyOperatorPermissions() {
    // Operador vê apenas o card "Controle de Estoque"
    const stockControlCard = document.querySelector('.dashboard-grid .card:nth-child(1)');
    if (stockControlCard) {
        stockControlCard.style.display = 'block';
    }
}

// Função para permissões de Supervisor
function applySupervisorPermissions() {
    // Supervisor vê apenas o card "Controle de Estoque"
    const stockControlCard = document.querySelector('.dashboard-grid .card:nth-child(1)');
    if (stockControlCard) {
        stockControlCard.style.display = 'block';
    }
}

// Função para permissões de Diretoria
function applyDiretoriaPermissions() {
    // Diretoria vê todos os cards exceto Usuários
    applySupervisorPermissions();
}

// Função para permissões de Administrador
function applyAdminPermissions() {
    // Administrador vê todos os cards
    const allCards = document.querySelectorAll('.dashboard-grid .card');
    allCards.forEach(card => {
        card.style.display = 'block';
    });
}

// Inicializar permissões quando DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    applyPermissions();
});
