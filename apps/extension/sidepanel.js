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
    
    if (response.error) {
      resultMsg.innerHTML = '❌ ' + response.error;
      return;
    }
    
    if (!response) {
      resultMsg.innerHTML = '❌ Nenhum dado recebido. Verifique se você está em um processo do PJe.';
      return;
    }
    
    if (response.numero) {
      const numeroInput = document.getElementById('numeroProcesso');
      if (numeroInput) numeroInput.value = response.numero;
    }
    
    // Monta o texto completo para a IA
    let textoCompleto = '';
    
    textoCompleto += `🏛️ TRIBUNAL: ${response.tribunal || 'Não identificado'}\n`;
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
    
    if (response.textoCompleto && response.textoCompleto.length > 0) {
      textoCompleto += response.textoCompleto;
    }
    
    if (textoCompleto && textoCompleto.length > 100) {
      const textoArea = document.getElementById('texto');
      if (textoArea) textoArea.value = textoCompleto;
      
      resultMsg.innerHTML = `✅ Processo extraído! Tribunal: ${response.tribunal || 'Desconhecido'}\n📌 Caracteres: ${textoCompleto.length}`;
      
      resultadoPre.innerHTML = `✅ Tribunal: ${response.tribunal || 'Desconhecido'}\n`;
      resultadoPre.innerHTML += `📋 Número: ${response.numero || 'Não identificado'}\n`;
      resultadoPre.innerHTML += `📌 Caracteres extraídos: ${textoCompleto.length}\n`;
      resultadoPre.innerHTML += `📅 Extraído em: ${new Date().toLocaleString()}`;
      
    } else {
      resultMsg.innerHTML = '⚠️ Não foi possível extrair o conteúdo. Tente copiar manualmente.';
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
const abrirTribunalBtn = document.getElementById('abrirTribunalBtn');
if (abrirTribunalBtn) {
  abrirTribunalBtn.onclick = () => {
    const url = document.getElementById('tribunalSelect').value;
    if (url) {
      chrome.tabs.create({ url: url });
      resultMsg.innerHTML = '🔗 Abrindo tribunal...';
    } else {
      resultMsg.innerHTML = '❌ Selecione um tribunal primeiro!';
    }
  };
}

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
const salvarRoleBtn = document.getElementById('salvarRoleBtn');
if (salvarRoleBtn) {
  salvarRoleBtn.onclick = () => {
    const selectedRole = document.querySelector('input[name="role"]:checked').value;
    userRole = selectedRole;
    chrome.storage.local.set({ userRole: selectedRole });
    resultMsg.innerHTML = `✅ Posição salva: ${selectedRole === 'reclamante' ? 'Reclamante (Trabalhador)' : 'Reclamada (Empresa)'}`;
  };
}