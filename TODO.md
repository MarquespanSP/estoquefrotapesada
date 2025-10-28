# TODO - Modificações no PDF de Movimentação de Estoque

## Tarefas Pendentes

### 1. Modificar geração de PDF apenas para saídas
- [x] Alterar função `generateMovementPDF` para verificar se `movementType === 'saida'`
- [x] Adicionar condição para gerar PDF apenas quando for saída

### 2. Adicionar logo da empresa ao PDF
- [x] Incluir logo.png no PDF usando jsPDF
- [x] Posicionar logo no cabeçalho de forma profissional

### 3. Aplicar tema verde e branco profissional
- [x] Usar cores do tema: #2e8b57, #228b22 (verde), #ffffff (branco)
- [x] Melhorar layout geral do PDF
- [x] Adicionar bordas e espaçamentos profissionais

### 4. Melhorar grid/tabela de peças
- [x] Criar tabela mais bonita com bordas
- [x] Adicionar cabeçalhos estilizados
- [x] Melhorar formatação das quantidades
- [x] Usar cores do tema na tabela

### 5. Estruturar campos de assinatura
- [x] Melhorar layout dos campos "Assinatura do Atendente"
- [x] Melhorar layout dos campos "Assinatura do Solicitante"
- [x] Adicionar linhas de assinatura mais profissionais

### 6. Testes
- [ ] Testar geração de PDF para movimentação de saída
- [ ] Verificar se PDF não é gerado para entrada
- [ ] Validar aparência profissional do PDF
- [ ] Testar em diferentes navegadores
