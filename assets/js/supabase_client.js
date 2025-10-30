// Cliente Supabase centralizado para evitar múltiplas instâncias
const SUPABASE_URL = 'https://iutwaspoegvbebaemghy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1dHdhc3BvZWd2YmViYWVtZ2h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMDg0MzIsImV4cCI6MjA3Njg4NDQzMn0.orZgrWLHhps1wpKbeP_fKLeF0Xjog-ECYdIkxC_LcCc';

// Criar uma única instância do cliente Supabase
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Exportar para uso em outros arquivos
window.supabaseClient = supabaseClient;
