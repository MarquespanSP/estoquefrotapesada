// Script JavaScript para cadastro de peças

// Carregar fornecedores quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    loadSuppliers();
    setupFormValidation();
    setupSupplierModal();
    setupImportExportButtons();
});

async function loadSuppliers() {
    try {
        const { data: suppliers, error } = await supabaseClient
            .from('suppliers')
            .select('id, name')
            .eq('is_active', true)
            .order('name');

        if (error) throw error;

        const supplierSelect = document.getElementById('supplier');
        supplierSelect.innerHTML = '<option value="">Selecione um fornecedor</option>';

        suppliers.forEach(supplier => {
            const option = document.createElement('option');
            option.value = supplier.id;
            option.textContent = supplier.name;
            supplierSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao carregar fornecedores:', error);
        showMessage('Erro ao carregar fornecedores. Tente novamente.', 'error');
    }
}

function setupFormValidation() {
    const pieceCodeInput = document.getElementById('piece_code');

    pieceCodeInput.addEventListener('input', function() {
        this.value = this.value.toUpperCase();
    });

    // Configurar botão de escaneamento QR Code
    const scanQrBtn = document.getElementById('scan-qr-btn');
    if (scanQrBtn) {
        scanQrBtn.addEventListener('click', function() {
            scanQRCode();
        });
    }

    const form = document.getElementById('piece-form');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            registerPiece();
        });
    }
}

function setupSupplierModal() {
    const addSupplierBtn = document.getElementById('add-supplier-btn');
    const modal = document.getElementById('supplier-modal');
    const closeBtn = modal.querySelector('.close');
    const supplierForm = document.getElementById('supplier-form');

    // Abrir modal
    addSupplierBtn.addEventListener('click', function() {
        modal.style.display = 'block';
    });

    // Fechar modal
    closeBtn.addEventListener('click', function() {
        modal.style.display = 'none';
        supplierForm.reset();
    });

    // Fechar modal clicando fora
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
            supplierForm.reset();
        }
    });

    // Submeter formulário do fornecedor
    supplierForm.addEventListener('submit', function(e) {
        e.preventDefault();
        addSupplier();
    });
}

async function addSupplier() {
    try {
        const supplierName = document.getElementById('supplier_name').value.trim();
        const supplierContact = document.getElementById('supplier_contact').value.trim();

        if (!supplierName) {
            throw new Error('Nome do fornecedor é obrigatório');
        }

        // Verificar se o fornecedor já existe
        const { data: existingSupplier, error: checkError } = await supabaseClient
            .from('suppliers')
            .select('name')
            .eq('name', supplierName)
            .single();

        if (existingSupplier) {
            throw new Error('Este fornecedor já está cadastrado');
        }

        // Obter usuário logado
        const userSession = await getLoggedUser();
        if (!userSession) {
            throw new Error('Usuário não autenticado');
        }

        // Inserir novo fornecedor
        const { data: newSupplier, error: insertError } = await supabaseClient
            .from('suppliers')
            .insert([
                {
                    name: supplierName,
                    contact_info: supplierContact || null,
                    created_by: userSession.username,
                    created_at: new Date().toISOString(),
                    is_active: true
                }
            ])
            .select()
            .single();

        if (insertError) {
            throw new Error('Erro ao cadastrar fornecedor: ' + insertError.message);
        }

        console.log('Fornecedor cadastrado com sucesso:', newSupplier);
        showMessage('Fornecedor cadastrado com sucesso!', 'success');

        // Fechar modal e recarregar fornecedores
        document.getElementById('supplier-modal').style.display = 'none';
        document.getElementById('supplier-form').reset();
        await loadSuppliers();

    } catch (error) {
        console.error('Erro no cadastro de fornecedor:', error.message);
        showMessage('Erro no cadastro: ' + error.message, 'error');
    }
}

async function registerPiece() {
    try {
        const pieceCode = document.getElementById('piece_code').value.trim().toUpperCase();
        const pieceName = document.getElementById('piece_name').value.trim();
        const qrCode = document.getElementById('qr_code').value.trim();
        const supplierId = document.getElementById('supplier').value;

        // Validações
        if (!pieceCode || !pieceName || !supplierId) {
            throw new Error('Código da peça, nome e fornecedor são obrigatórios');
        }

        // Verificar se o código da peça já existe
        const { data: existingPiece, error: checkError } = await supabaseClient
            .from('pieces')
            .select('code')
            .eq('code', pieceCode)
            .single();

        if (existingPiece) {
            throw new Error('Este código de peça já está cadastrado');
        }

        // Verificar se o QR Code já existe (se fornecido)
        if (qrCode) {
            const { data: existingQrCode, error: qrCheckError } = await supabaseClient
                .from('pieces')
                .select('qr_code')
                .eq('qr_code', qrCode)
                .single();

            if (existingQrCode) {
                throw new Error('Este QR Code já está cadastrado para outra peça');
            }
        }

        // Obter usuário logado
        const userSession = await getLoggedUser();
        if (!userSession) {
            throw new Error('Usuário não autenticado');
        }

        // Inserir nova peça
        const { data: newPiece, error: insertError } = await supabaseClient
            .from('pieces')
            .insert([
                {
                    code: pieceCode,
                    name: pieceName,
                    qr_code: qrCode || null,
                    supplier_id: supplierId,
                    created_by: userSession.username,
                    created_at: new Date().toISOString(),
                    is_active: true
                }
            ])
            .select()
            .single();

        if (insertError) {
            throw new Error('Erro ao cadastrar peça: ' + insertError.message);
        }

        console.log('Peça cadastrada com sucesso:', newPiece);
        showMessage('Peça cadastrada com sucesso!', 'success');

        // Limpar formulário
        document.getElementById('piece-form').reset();

    } catch (error) {
        console.error('Erro no cadastro de peça:', error.message);
        showMessage('Erro no cadastro: ' + error.message, 'error');
    }
}

// Funções de importação e exportação
function setupImportExportButtons() {
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const downloadTemplateBtn = document.getElementById('download-template-btn');

    if (exportBtn) {
        exportBtn.addEventListener('click', exportPieces);
    }

    if (importBtn) {
        importBtn.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.xlsx,.xls';
            input.onchange = handleImport;
            input.click();
        });
    }

    if (downloadTemplateBtn) {
        downloadTemplateBtn.addEventListener('click', downloadTemplate);
    }
}

async function exportPieces() {
    try {
        showMessage('Exportando peças...', 'info');

        const { data: pieces, error } = await supabaseClient
            .from('pieces')
            .select(`
                code,
                name,
                suppliers (name)
            `)
            .eq('is_active', true)
            .order('code');

        if (error) throw error;

        // Preparar dados para Excel
        const excelData = pieces.map(piece => ({
            'Código da Peça': piece.code,
            'Nome da Peça': piece.name,
            'Fornecedor': piece.suppliers?.name || ''
        }));

        // Criar workbook
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(excelData);

        // Ajustar largura das colunas
        const colWidths = [
            { wch: 15 }, // Código da Peça
            { wch: 30 }, // Nome da Peça
            { wch: 25 }  // Fornecedor
        ];
        ws['!cols'] = colWidths;

        XLSX.utils.book_append_sheet(wb, ws, 'Peças');

        // Baixar arquivo
        const fileName = `pecas_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);

        showMessage('Peças exportadas com sucesso!', 'success');

    } catch (error) {
        console.error('Erro ao exportar peças:', error);
        showMessage('Erro ao exportar peças: ' + error.message, 'error');
    }
}

function downloadTemplate() {
    try {
        // Criar dados de exemplo
        const templateData = [
            {
                'Código da Peça': 'ABC001',
                'Nome da Peça': 'Filtro de Óleo',
                'Fornecedor': 'Fornecedor Exemplo Ltda'
            },
            {
                'Código da Peça': 'DEF002',
                'Nome da Peça': 'Pastilha de Freio',
                'Fornecedor': 'Auto Peças Brasil'
            },
            {
                'Código da Peça': 'GHI003',
                'Nome da Peça': 'Correia de Acessórios',
                'Fornecedor': '' // Campo opcional
            }
        ];

        // Criar workbook
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(templateData);

        // Ajustar largura das colunas
        const colWidths = [
            { wch: 15 }, // Código da Peça
            { wch: 30 }, // Nome da Peça
            { wch: 25 }  // Fornecedor
        ];
        ws['!cols'] = colWidths;

        XLSX.utils.book_append_sheet(wb, ws, 'Modelo_Peças');

        // Baixar arquivo
        XLSX.writeFile(wb, 'modelo_importacao_pecas.xlsx');

        showMessage('Modelo baixado com sucesso!', 'success');

    } catch (error) {
        console.error('Erro ao baixar modelo:', error);
        showMessage('Erro ao baixar modelo: ' + error.message, 'error');
    }
}

async function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        showMessage('Processando arquivo...', 'info');

        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                // Pegar primeira planilha
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];

                // Converter para JSON
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                // Remover cabeçalho
                jsonData.shift();

                // Processar dados
                await processImportData(jsonData);

            } catch (error) {
                console.error('Erro ao processar arquivo:', error);
                showMessage('Erro ao processar arquivo: ' + error.message, 'error');
            }
        };

        reader.readAsArrayBuffer(file);

    } catch (error) {
        console.error('Erro ao importar arquivo:', error);
        showMessage('Erro ao importar arquivo: ' + error.message, 'error');
    }
}

async function processImportData(rows) {
    try {
        const userSession = await getLoggedUser();
        if (!userSession) {
            throw new Error('Usuário não autenticado');
        }

        let successCount = 0;
        let errorCount = 0;
        const errors = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const [code, name, supplierName] = row;

            // Pular linhas vazias
            if (!code && !name) continue;

            try {
                // Validações obrigatórias
                if (!code || !name) {
                    throw new Error(`Linha ${i + 2}: Código e Nome da peça são obrigatórios`);
                }

                const pieceCode = code.toString().trim().toUpperCase();
                const pieceName = name.toString().trim();

                // Verificar se a peça já existe
                const { data: existingPiece } = await supabaseClient
                    .from('pieces')
                    .select('code')
                    .eq('code', pieceCode)
                    .single();

                if (existingPiece) {
                    throw new Error(`Peça ${pieceCode} já existe`);
                }

                // Processar fornecedor (opcional)
                let supplierId = null;
                if (supplierName && supplierName.toString().trim()) {
                    const supplier = supplierName.toString().trim();

                    // Verificar se fornecedor existe
                    let { data: existingSupplier } = await supabaseClient
                        .from('suppliers')
                        .select('id')
                        .eq('name', supplier)
                        .eq('is_active', true)
                        .single();

                    // Se não existe, criar
                    if (!existingSupplier) {
                        const { data: newSupplier, error: supplierError } = await supabaseClient
                            .from('suppliers')
                            .insert([{
                                name: supplier,
                                created_by: userSession.username,
                                created_at: new Date().toISOString(),
                                is_active: true
                            }])
                            .select('id')
                            .single();

                        if (supplierError) throw supplierError;
                        supplierId = newSupplier.id;
                    } else {
                        supplierId = existingSupplier.id;
                    }
                }

                // Inserir peça
                const { error: insertError } = await supabaseClient
                    .from('pieces')
                    .insert([{
                        code: pieceCode,
                        name: pieceName,
                        supplier_id: supplierId,
                        created_by: userSession.username,
                        created_at: new Date().toISOString(),
                        is_active: true
                    }]);

                if (insertError) throw insertError;

                successCount++;

            } catch (error) {
                errorCount++;
                errors.push(`Linha ${i + 2}: ${error.message}`);
            }
        }

        // Recarregar fornecedores após possíveis criações
        await loadSuppliers();

        // Mostrar resultado
        let message = `Importação concluída! ${successCount} peças importadas com sucesso.`;
        if (errorCount > 0) {
            message += ` ${errorCount} erros encontrados.`;
            console.error('Erros de importação:', errors);
        }

        showMessage(message, errorCount > 0 ? 'warning' : 'success');

    } catch (error) {
        console.error('Erro no processamento da importação:', error);
        showMessage('Erro na importação: ' + error.message, 'error');
    }
}

// Função para escanear QR Code e códigos de barras
async function scanQRCode() {
    try {
        // Verificar se o navegador suporta acesso à câmera
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Este navegador não suporta acesso à câmera');
        }

        // Criar modal para mostrar a câmera
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;

        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            max-width: 90%;
            max-height: 90%;
        `;

        const title = document.createElement('h3');
        title.textContent = 'Posicione o código na câmera';
        title.style.marginBottom = '10px';

        const videoContainer = document.createElement('div');
        videoContainer.style.cssText = `
            position: relative;
            display: inline-block;
        `;

        // Criar elemento de vídeo
        const video = document.createElement('video');
        video.style.cssText = `
            width: 100%;
            max-width: 300px;
            height: auto;
            border: 2px solid #ccc;
            border-radius: 5px;
            transform: scaleX(-1);
        `;
        video.setAttribute('playsinline', true); // Para iOS

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancelar';
        cancelBtn.className = 'btn btn-secondary';
        cancelBtn.style.marginTop = '10px';

        videoContainer.appendChild(video);
        modalContent.appendChild(title);
        modalContent.appendChild(videoContainer);
        modalContent.appendChild(cancelBtn);
        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        // Inicializar ZXing com suporte a múltiplos formatos
        const hints = new Map();
        hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [
            ZXing.BarcodeFormat.QR_CODE,
            ZXing.BarcodeFormat.CODE_128,
            ZXing.BarcodeFormat.CODE_39,
            ZXing.BarcodeFormat.EAN_13,
            ZXing.BarcodeFormat.EAN_8,
            ZXing.BarcodeFormat.UPC_A,
            ZXing.BarcodeFormat.UPC_E,
            ZXing.BarcodeFormat.ITF,
            ZXing.BarcodeFormat.CODABAR,
            ZXing.BarcodeFormat.DATA_MATRIX,
            ZXing.BarcodeFormat.PDF_417
        ]);

        const codeReader = new ZXing.BrowserMultiFormatReader(hints);

        // Obter lista de dispositivos de vídeo
        const videoInputDevices = await codeReader.getVideoInputDevices();
        if (videoInputDevices.length === 0) {
            throw new Error('Nenhuma câmera encontrada');
        }

        // Selecionar câmera traseira se disponível
        let selectedDeviceId = videoInputDevices[0].deviceId;
        for (const device of videoInputDevices) {
            const deviceName = device.label.toLowerCase();
            if (deviceName.includes('back') || deviceName.includes('traseira') || deviceName.includes('rear')) {
                selectedDeviceId = device.deviceId;
                break;
            }
        }

        // Função para cancelar
        const cancelScan = () => {
            codeReader.reset();
            document.body.removeChild(modal);
        };

        cancelBtn.onclick = cancelScan;

        // Fechar modal clicando fora
        modal.onclick = function(event) {
            if (event.target === modal) {
                cancelScan();
            }
        };

        // Iniciar escaneamento
        codeReader.decodeFromVideoDevice(selectedDeviceId, video, (result, err) => {
            if (result) {
                // Código detectado com sucesso
                const qrCodeInput = document.getElementById('qr_code');
                qrCodeInput.value = result.text;

                // Fechar modal
                cancelScan();

                // Mostrar mensagem de sucesso
                showMessage('Código escaneado com sucesso!', 'success');
            }

            if (err && !(err instanceof ZXing.NotFoundException)) {
                console.error('Erro ao escanear:', err);
            }
        });

    } catch (error) {
        console.error('Erro ao acessar câmera:', error);
        showMessage('Erro ao acessar câmera: ' + error.message, 'error');
    }
}
