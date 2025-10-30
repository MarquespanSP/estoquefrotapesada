// Cliente Supabase centralizado para evitar múltiplas instâncias
const SUPABASE_URL = 'https://iutwaspoegvbebaemghy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1dHdhc3BvZWd2YmViYWVtZ2h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMDg0MzIsImV4cCI6MjA3Njg4NDQzMn0.orZgrWLHhps1wpKbeP_fKLeF0Xjog-ECYdIkxC_LcCc';

// Criar uma única instância do cliente Supabase
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Exportar para uso em outros arquivos
window.supabaseClient = supabaseClient;

// Função para obter o token JWT atual (se disponível)
function getAuthToken() {
    try {
        const session = localStorage.getItem('userSession');
        if (session) {
            const sessionData = JSON.parse(session);
            // Para este projeto, estamos usando autenticação customizada
            // O token JWT seria necessário se usássemos auth do Supabase
            // Por enquanto, retornamos null pois usamos localStorage
            return null;
        }
    } catch (error) {
        console.error('Erro ao obter token de autenticação:', error);
    }
    return null;
}
