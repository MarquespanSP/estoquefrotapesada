// Script JavaScript para controle de estoque

// Carregar informações do usuário logado
document.addEventListener('DOMContentLoaded', function() {
    loadUserInfo();
});

async function loadUserInfo() {
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (user) {
            const { data: userData, error } = await supabaseClient
                .from('users')
                .select('full_name, role')
                .eq('username', user.email)
                .single();

            if (userData) {
                document.getElementById('user-info').textContent = `Usuário: ${userData.full_name} (${userData.role})`;
            }
        }
    } catch (error) {
        console.error('Erro ao carregar informações do usuário:', error);
    }
}
