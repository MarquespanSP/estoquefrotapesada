// Script JavaScript para controle de estoque

// Carregar informações do usuário logado
document.addEventListener('DOMContentLoaded', function() {
    loadUserInfo();
});

async function loadUserInfo() {
    try {
        const user = await getLoggedUser();
        if (user) {
            document.getElementById('user-info').textContent = `Usuário: ${user.fullName || user.username} (${user.role})`;

            console.log('Usuário carregado:', user);
            console.log('Role do usuário:', user.role);

            // Verificar se o usuário é administrador para mostrar o card de exclusão
            if (user.role && (user.role.toLowerCase() === 'admin' || user.role.toLowerCase() === 'administrator')) {
                // Card já está visível por padrão
                console.log('Usuário administrador - card de exclusão visível');
            } else {
                // Esconder o card de exclusão para usuários não administradores
                console.log('Usuário não administrador - ocultando card de exclusão');
                const deleteCard = document.querySelector('.stock-card a[href="delete_records.html"]');
                if (deleteCard) {
                    console.log('Encontrou card de exclusão, ocultando...');
                    deleteCard.closest('.stock-card').style.display = 'none';
                } else {
                    console.log('Card de exclusão não encontrado');
                }
            }
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
