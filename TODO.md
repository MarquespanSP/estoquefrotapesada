# TODO - Modificações no PDF de Movimentação de Estoque

## Tarefas Pendentes

### 1. Modificar geração de PDF apenas para saídas
- [ ] Alterar função `generateMovementPDF` para verificar se `movementType === 'saida'`
- [ ] Adicionar condição para gerar PDF apenas quando for saída

### 2. Adicionar logo da empresa ao PDF
- [ ] Incluir logo.png no PDF usando jsPDF
- [ ] Posicionar logo no cabeçalho de forma profissional

### 3. Aplicar tema verde e branco profissional
- [ ] Usar cores do tema: #2e8b57, #228b22 (verde), #ffffff (branco)
- [ ] Melhorar layout geral do PDF
- [ ] Adicionar bordas e espaçamentos profissionais

### 4. Melhorar grid/tabela de peças
- [ ] Criar tabela mais bonita com bordas
- [ ] Adicionar cabeçalhos estilizados
- [ ] Melhorar formatação das quantidades
- [ ] Usar cores do tema na tabela

### 5. Estruturar campos de assinatura
- [ ] Melhorar layout dos campos "Assinatura do Atendente"
- [ ] Melhorar layout dos campos "Assinatura do Solicitante"
- [ ] Adicionar linhas de assinatura mais profissionais

### 6. Testes
- [ ] Testar geração de PDF para movimentação de saída
- [ ] Verificar se PDF não é gerado para entrada
- [ ] Validar aparência profissional do PDF
- [ ] Testar em diferentes navegadores
