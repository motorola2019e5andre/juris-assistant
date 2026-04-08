// ============================================
// SIDEPANEL.JS - Versão completa
// ============================================

const API = 'https://juris-assistant-api.onrender.com';

const resultMsg = document.getElementById('resultMsg');
const resultadoPre = document.getElementById('resultado');

// ============================================
// EXTRAIR PROCESSO (INCLUINDO DOCUMENTOS)
// ============================================
document.getElementById('extrairProcessoBtn').onclick = async () => {
  resultMsg.innerHTML = '🔄 Extraindo processo e documentos...';
  resultadoPre.innerHTML = '';
  
  try {
    const response = await chrome.runtime.sendMessage({ action: 'extrairProcesso' });
    
    if (response.error) {
      resultMsg.innerHTML = '❌ ' + response.error;
      return;
    }
    
    if (response.numero) {
      document.getElementById('numeroProcesso').value = response.numero;
    }
    
    // Monta o texto completo para a IA
    let textoCompleto = '';
    
    textoCompleto += `🏛️ TRIBUNAL: ${response.tribunal}\n`;
    textoCompleto += `📋 PROCESSO Nº: ${response.numero || 'Não identificado'}\n`;
    if (response.valorCausa) textoCompleto += `💰 VALOR DA CAUSA: R$ ${response.valorCausa}\n`;
    textoCompleto += `📅 DATA EXTRAÇÃO: ${response.dataExtracao || new Date().toISOString()}\n\n`;
    
    if (response.partes) {
      textoCompleto += `👥 PARTES:\n`;
      if (response.partes.reclamante) textoCompleto += `  Reclamante: ${response.partes.reclamante}\n`;
      if (response.partes.reclamado) textoCompleto += `  Reclamado: ${response.partes.reclamado}\n`;
      textoCompleto += `\n`;
    }
    
    if (response.andamento) {
      textoCompleto += `📌 ANDAMENTO:\n${response.andamento}\n\n`;
    }
    
    if (response.documentos && response.documentos.length > 0) {
      textoCompleto += `📄 DOCUMENTOS ENCONTRADOS (${response.documentos.length}):\n\n`;
      for (const doc of response.documentos) {
        textoCompleto += `=== ${doc.tipo} ===\n${doc.texto}\n\n`;
      }
    }
    
    if (textoCompleto) {
      document.getElementById('texto').value = textoCompleto;
      resultMsg.innerHTML = `✅ Processo extraído! Tribunal: ${response.tribunal}\n📄 Documentos: ${response.documentos?.length || 0}`;
      resultadoPre.innerHTML = `✅ Tribunal: ${response.tribunal}\n📋 Número: ${response.numero || 'Não identificado'}\n📄 Documentos extraídos: ${response.documentos?.length || 0}\n💰 Valor: ${response.valorCausa || 'Não informado'}\n📌 Caracteres: ${textoCompleto.length}`;
    } else {
      resultMsg.innerHTML = '⚠️ Não foi possível extrair o conteúdo. Tente copiar manualmente.';
    }
  } catch(e) {
    resultMsg.innerHTML = '❌ Erro ao extrair: ' + e.message;
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
// SELEÇÃO DO POLO
// ============================================
chrome.storage.local.get(['userRole'], (result) => {
  if (result.userRole) {
    const radio = document.querySelector(`input[name="role"][value="${result.userRole}"]`);
    if (radio) radio.checked = true;
  }
});

document.getElementById('salvarRoleBtn').onclick = () => {
  const selectedRole = document.querySelector('input[name="role"]:checked').value;
  chrome.storage.local.set({ userRole: selectedRole });
  resultMsg.innerHTML = `✅ Posição salva: ${selectedRole === 'reclamante' ? 'Reclamante (Trabalhador)' : 'Reclamada (Empresa)'}`;
};