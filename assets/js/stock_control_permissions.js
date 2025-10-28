// Script para controle de permissões na página de controle de estoque

// Função para aplicar permissões baseado no nível de acesso
async function applyStockControlPermissions() {
    try {
        const user = await getLoggedUser();

        if (!user) {
            console.log('Usuário não logado, redirecionando...');
            window.location.href = 'index.html';
            return;
        }

        const userRole = user.role;
        console.log('Aplicando permissões de controle de estoque para:', userRole);

        // Esconder todos os cards inicialmente
        const allCards = document.querySelectorAll('.stock-control-grid .stock-card');
        allCards.forEach(card => {
            card.style.display = 'none';
        });

        // Aplicar permissões baseado no nível de acesso
        switch (userRole) {
            case 'Operador':
                applyOperatorStockPermissions();
                break;
            case 'Supervisor':
                applySupervisorStockPermissions();
                break;
            case 'Diretoria':
                applyDiretoriaStockPermissions();
                break;
            case 'Administrador':
                applyAdminStockPermissions();
                break;
            default:
                console.log('Nível de acesso não reconhecido:', userRole);
                // Por padrão, mostrar apenas movimentação e localizar peça
                applyOperatorStockPermissions();
        }

    } catch (error) {
        console.error('Erro ao aplicar permissões de controle de estoque:', error);
        // Em caso de erro, redirecionar para login
        window.location.href = 'index.html';
    }
}

// Função para permissões de Operador no controle de estoque
function applyOperatorStockPermissions() {
    // Operador vê apenas "Movimentação de Estoque" e "Localizar Peça"
    const allCards = document.querySelectorAll('.stock-control-grid .stock-card');

    allCards.forEach(card => {
        const title = card.querySelector('h3').textContent;

        if (title.includes('📦 Movimentação de Estoque') || title.includes('🔍 Localizar Peça')) {
            card.style.display = 'block';
        }
    });
}

// Função para permissões de Supervisor no controle de estoque
function applySupervisorStockPermissions() {
    // Supervisor vê todos os cards exceto "Exclusão de Lançamentos"
    const allCards = document.querySelectorAll('.stock-control-grid .stock-card');

    allCards.forEach(card => {
        const title = card.querySelector('h3').textContent;

        if (!title.includes('🗑️ Exclusão de Lançamentos')) {
            card.style.display = 'block';
        }
    });
}

// Função para permissões de Diretoria no controle de estoque
function applyDiretoriaStockPermissions() {
    // Diretoria vê todos os cards exceto "Exclusão de Lançamentos"
    applySupervisorStockPermissions();
}

// Função para permissões de Administrador no controle de estoque
function applyAdminStockPermissions() {
    // Administrador vê todos os cards
    const allCards = document.querySelectorAll('.stock-control-grid .stock-card');
    allCards.forEach(card => {
        card.style.display = 'block';
    });
}

// Inicializar permissões quando DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    applyStockControlPermissions();
});
