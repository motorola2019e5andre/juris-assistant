// ============================================
// SIDEPANEL.JS - Versão completa
// ============================================

const API = 'https://juris-assistant-api.onrender.com';

const resultMsg = document.getElementById('resultMsg');
const resultadoPre = document.getElementById('resultado');

// ============================================
// EXTRAIR PROCESSO DA PÁGINA ATIVA
// ============================================
document.getElementById('extrairProcessoBtn').onclick = async () => {
  resultMsg.innerHTML = '🔄 Extraindo processo da página...';
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
    
    if (response.andamento) {
      document.getElementById('texto').value = response.andamento;
      resultMsg.innerHTML = `✅ Processo extraído! Tribunal: ${response.tribunal || 'Desconhecido'}`;
      resultadoPre.innerHTML = `✅ Tribunal: ${response.tribunal}\n📋 Número: ${response.numero || 'Não identificado'}\n📌 Caracteres: ${response.andamento.length}`;
    } else {
      resultMsg.innerHTML = '⚠️ Não foi possível extrair o andamento. Tente copiar manualmente.';
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
      body: JSON.stringify({ text: texto })
    });
    
    const data = await response.json();
    
    if (data.result) {
      resultadoPre.innerHTML = data.result;
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