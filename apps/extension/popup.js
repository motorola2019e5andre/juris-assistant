// ============================================
// SIDEPANEL.JS - Versão completa e corrigida
// ============================================

const API = 'https://juris-assistant-api.onrender.com';

const resultMsg = document.getElementById('resultMsg');
const resultadoPre = document.getElementById('resultado');

// ============================================
// EXTRAIR PROCESSO COMPLETO
// ============================================
document.getElementById('extrairProcessoBtn').onclick = async () => {
  resultMsg.innerHTML = '🔄 Extraindo processo completo...';
  resultadoPre.innerHTML = '';
  
  try {
    const response = await chrome.runtime.sendMessage({ action: 'extrairProcesso' });
    
    // Verifica se houve erro
    if (response.error) {
      resultMsg.innerHTML = '❌ ' + response.error;
      return;
    }
    
    // Verifica se a resposta é válida
    if (!response) {
      resultMsg.innerHTML = '❌ Nenhum dado recebido da página. Verifique se você está em um processo do PJe.';
      return;
    }
    
    // Preenche o campo do número do processo se disponível
    if (response.numero) {
      const numeroInput = document.getElementById('numeroProcesso');
      if (numeroInput) numeroInput.value = response.numero;
    }
    
    // Monta o texto completo para a IA
    let textoCompleto = '';
    
    // Cabeçalho do processo
    textoCompleto += `🏛️ TRIBUNAL: ${response.tribunal || 'Não identificado'}\n`;
    textoCompleto += `📋 PROCESSO Nº: ${response.numero || 'Não identificado'}\n`;
    textoCompleto += `⚖️ CLASSE: ${response.classe || 'Não informada'}\n`;
    textoCompleto += `📅 DISTRIBUIÇÃO: ${response.dataDistribuicao || 'Não informada'}\n`;
    textoCompleto += `🏢 ÓRGÃO JULGADOR: ${response.orgaoJulgador || 'Não informado'}\n`;
    if (response.valorCausa) textoCompleto += `💰 VALOR DA CAUSA: R$ ${response.valorCausa}\n`;
    textoCompleto += `📅 DATA EXTRAÇÃO: ${response.dataExtracao || new Date().toISOString()}\n\n`;
    
    // Partes do processo
    if (response.partes) {
      textoCompleto += `👥 PARTES:\n`;
      if (response.partes.reclamante) textoCompleto += `  Reclamante: ${response.partes.reclamante}\n`;
      if (response.partes.reclamado) textoCompleto += `  Reclamado: ${response.partes.reclamado}\n`;
      if (response.partes.autores && response.partes.autores.length > 0) {
        response.partes.autores.forEach(autor => {
          textoCompleto += `  Autor: ${autor}\n`;
        });
      }
      if (response.partes.reus && response.partes.reus.length > 0) {
        response.partes.reus.forEach(reu => {
          textoCompleto += `  Réu: ${reu}\n`;
        });
      }
      textoCompleto += `\n`;
    }
    
    // Movimentações processuais
    if (response.movimentacoes && Array.isArray(response.movimentacoes) && response.movimentacoes.length > 0) {
      textoCompleto += `📌 MOVIMENTAÇÕES (${response.movimentacoes.length}):\n`;
      for (let i = 0; i < Math.min(response.movimentacoes.length, 20); i++) {
        const mov = response.movimentacoes[i];
        const textoMov = typeof mov === 'string' ? mov : (mov.texto || mov.toString());
        textoCompleto += `  ${i+1}. ${textoMov.substring(0, 300)}\n`;
      }
      if (response.movimentacoes.length > 20) {
        textoCompleto += `  ... e mais ${response.movimentacoes.length - 20} movimentações\n`;
      }
      textoCompleto += `\n`;
    }
    
    // Documentos do processo
    if (response.documentos && Array.isArray(response.documentos) && response.documentos.length > 0) {
      textoCompleto += `📄 DOCUMENTOS ENCONTRADOS (${response.documentos.length}):\n\n`;
      for (let i = 0; i < Math.min(response.documentos.length, 10); i++) {
        const doc = response.documentos[i];
        textoCompleto += `=== ${doc.tipo || 'Documento'} ===\n`;
        textoCompleto += `${doc.texto || ''}\n\n`;
      }
      if (response.documentos.length > 10) {
        textoCompleto += `... e mais ${response.documentos.length - 10} documentos\n\n`;
      }
    }
    
    // Verifica se conseguiu extrair algo
    if (textoCompleto && textoCompleto.length > 100) {
      const textoArea = document.getElementById('texto');
      if (textoArea) textoArea.value = textoCompleto;
      
      resultMsg.innerHTML = `✅ Processo completo extraído! Tribunal: ${response.tribunal || 'Desconhecido'}\n📄 Movimentações: ${response.movimentacoes?.length || 0}\n📄 Documentos: ${response.documentos?.length || 0}`;
      
      resultadoPre.innerHTML = `✅ Tribunal: ${response.tribunal || 'Desconhecido'}\n`;
      resultadoPre.innerHTML += `📋 Número: ${response.numero || 'Não identificado'}\n`;
      resultadoPre.innerHTML += `📌 Movimentações: ${response.movimentacoes?.length || 0}\n`;
      resultadoPre.innerHTML += `📄 Documentos extraídos: ${response.documentos?.length || 0}\n`;
      resultadoPre.innerHTML += `💰 Valor: ${response.valorCausa || 'Não informado'}\n`;
      resultadoPre.innerHTML += `📌 Caracteres extraídos: ${textoCompleto.length}\n`;
      resultadoPre.innerHTML += `📅 Extraído em: ${new Date().toLocaleString()}`;
      
    } else {
      resultMsg.innerHTML = '⚠️ Não foi possível extrair o conteúdo. Tente uma das opções:\n1. Aguarde a página carregar completamente\n2. Role a página para baixo\n3. Copie o texto manualmente';
      resultadoPre.innerHTML = 'Nenhum conteúdo foi extraído. Certifique-se de que você está em uma página de processo do PJe.';
    }
    
  } catch(e) {
    console.error('Erro na extração:', e);
    resultMsg.innerHTML = '❌ Erro ao extrair: ' + e.message;
    resultadoPre.innerHTML = 'Erro técnico: ' + (e.stack || e.message);
  }
};

// ============================================
// FUNÇÃO GENÉRICA PARA CHAMAR A IA
// ============================================
async function callAI(endpoint, nomeFeature) {
  const texto = document.getElementById('texto').value;
  const userRole = document.querySelector('input[name="role"]:checked')?.value || 'reclamante';
  
  if (!texto || texto.length < 10) {
    resultMsg.innerHTML = '❌ Cole um texto com pelo menos 10 caracteres!';
    return;
  }
  
  resultMsg.innerHTML = '🔄 Gerando ' + nomeFeature + '...';
  resultadoPre.innerHTML = '';
  
  try {
    const response = await fetch(API + '/v1/ai/' + endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: texto, role: userRole })
    });
    
    const data = await response.json();
    
    if (data.result) {
      resultadoPre.innerHTML = `📌 POLO: ${userRole === 'reclamante' ? 'Reclamante (Trabalhador)' : 'Reclamada (Empresa)'}\n\n${data.result}`;
      resultMsg.innerHTML = '✅ ' + nomeFeature + ' gerado! Créditos restantes: ' + data.creditsRemaining;
    } else {
      resultMsg.innerHTML = '❌ Erro: ' + JSON.stringify(data);
    }
  } catch(e) {
    resultMsg.innerHTML = '❌ Erro: ' + e.message;
  }
}

// ============================================
// BOTÕES DAS 3 FUNCIONALIDADES
// ============================================
document.getElementById('clienteBtn').onclick = () => callAI('summarize-client', 'Resumo para cliente');
document.getElementById('tecnicoBtn').onclick = () => callAI('summarize-technical', 'Resumo técnico');
document.getElementById('peticaoBtn').onclick = () => callAI('draft-petition', 'Assistente de petição');

// ============================================
// ABRIR TRIBUNAL
// ============================================
document.getElementById('abrirTribunalBtn').onclick = () => {
  const url = document.getElementById('tribunalSelect').value;
  if (url) {
    chrome.tabs.create({ url: url });
    resultMsg.innerHTML = '🔗 Abrindo tribunal...';
  } else {
    resultMsg.innerHTML = '❌ Selecione um tribunal primeiro!';
  }
};

// ============================================
// SELEÇÃO DO POLO (RECLAMANTE/RECLAMADA)
// ============================================
let userRole = 'reclamante';

// Carregar role salvo
chrome.storage.local.get(['userRole'], (result) => {
  if (result.userRole) {
    userRole = result.userRole;
    const radio = document.querySelector(`input[name="role"][value="${result.userRole}"]`);
    if (radio) radio.checked = true;
  }
});

// Salvar role
document.getElementById('salvarRoleBtn').onclick = () => {
  const selectedRole = document.querySelector('input[name="role"]:checked').value;
  userRole = selectedRole;
  chrome.storage.local.set({ userRole: selectedRole });
  resultMsg.innerHTML = `✅ Posição salva: ${selectedRole === 'reclamante' ? 'Reclamante (Trabalhador)' : 'Reclamada (Empresa)'}`;
};

// Botão para mostrar texto completo
document.getElementById('mostrarTextoCompletoBtn').onclick = () => {
  const texto = document.getElementById('texto').value;
  if (texto) {
    const novaJanela = window.open();
    novaJanela.document.write(`<pre style="font-family: monospace; white-space: pre-wrap; padding: 20px;">${texto}</pre>`);
  } else {
    resultMsg.innerHTML = '❌ Nenhum texto extraído ainda!';
  }
};