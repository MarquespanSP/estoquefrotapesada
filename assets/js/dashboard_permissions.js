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

        // Iterar sobre todos os cards e verificar as permissões
        const allCards = document.querySelectorAll('.dashboard-grid .card');
        allCards.forEach(card => {
            const allowedRoles = card.dataset.role ? card.dataset.role.split(',').map(r => r.trim()) : [];
            
            if (allowedRoles.includes(userRole)) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });

    } catch (error) {
        console.error('Erro ao aplicar permissões:', error);
        // Em caso de erro, redirecionar para login
        window.location.href = 'index.html';
    }
}

// Inicializar permissões quando DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    applyPermissions();
});
