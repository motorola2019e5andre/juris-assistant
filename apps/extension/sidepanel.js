// ============================================
// SIDEPANEL.JS - Versão simplificada (sem login)
// ============================================

const API = 'https://juris-assistant-api.onrender.com';

const mainDiv = document.getElementById('mainDiv');
const resultMsg = document.getElementById('resultMsg');
const resultadoPre = document.getElementById('resultado');

// Mostrar tela principal diretamente (sem login)
mainDiv.style.display = 'block';

// ============================================
// EXTRAIR PROCESSO
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
// GERAR RESUMOS (sem autenticação)
// ============================================
async function callAI(endpoint, nomeFeature) {
  const texto = document.getElementById('texto').value;
  
  if (!texto || texto.length < 10) {
    resultMsg.innerHTML = 'Cole um texto com pelo menos 10 caracteres!';
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
      resultMsg.innerHTML = nomeFeature + ' gerado! Créditos restantes: ' + data.creditsRemaining;
    } else {
      resultMsg.innerHTML = 'Erro: ' + JSON.stringify(data);
    }
  } catch(e) {
    resultMsg.innerHTML = 'Erro: ' + e.message;
  }
}

// ============================================
// BOTÕES
// ============================================
document.getElementById('clienteBtn').onclick = () => callAI('summarize-client', 'Resumo para cliente');
document.getElementById('tecnicoBtn').onclick = () => callAI('summarize-technical', 'Resumo técnico');
document.getElementById('peticaoBtn').onclick = () => callAI('draft-petition', 'Assistente de petição');