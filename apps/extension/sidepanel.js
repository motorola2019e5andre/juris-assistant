// ============================================
// SIDEPANEL.JS - Versão corrigida (íntegra)
// ============================================

const API = 'https://juris-assistant-api.onrender.com';

const resultMsg = document.getElementById('resultMsg');
const resultadoPre = document.getElementById('resultado');

// ============================================
// EXTRAIR PROCESSO COMPLETO
// ============================================
document.getElementById('extrairProcessoBtn').onclick = async () => {
  resultMsg.innerHTML = '🔄 Aguardando resposta do conteúdo da página...';
  resultadoPre.innerHTML = '';
  
  try {
    const response = await chrome.runtime.sendMessage({ action: 'extrairProcesso' });
    
    if (response && response.error) {
      resultMsg.innerHTML = '❌ ' + response.error;
      return;
    }
    
    if (!response) {
      resultMsg.innerHTML = '❌ Nenhum dado recebido. Certifique-se de que está em um processo do PJe.';
      return;
    }
    
    // Preenche o número do processo se disponível
    if (response.numero) {
      const numeroInput = document.getElementById('numeroProcesso');
      if (numeroInput) numeroInput.value = response.numero;
    }
    
    // PRIORIDADE: usar o texto completo enviado pelo content.js
    let textoCompleto = response.textoCompleto || '';
    
    // Se não veio texto completo, tenta montar com outras propriedades (fallback)
    if (!textoCompleto || textoCompleto.length < 100) {
      if (response.andamento) textoCompleto += response.andamento + '\n\n';
      if (response.movimentacoes && response.movimentacoes.length) {
        textoCompleto += response.movimentacoes.join('\n');
      }
    }
    
    // Exibe estatísticas no resultado
    const caracteres = textoCompleto.length;
    if (caracteres > 100) {
      const textoArea = document.getElementById('texto');
      if (textoArea) textoArea.value = textoCompleto;
      
      resultMsg.innerHTML = `✅ Processo extraído! Tribunal: ${response.tribunal || 'Desconhecido'} | Caracteres: ${caracteres}`;
      
      resultadoPre.innerHTML = `✅ Tribunal: ${response.tribunal || 'Desconhecido'}\n`;
      resultadoPre.innerHTML += `📋 Número: ${response.numero || 'Não identificado'}\n`;
      resultadoPre.innerHTML += `📌 Caracteres extraídos: ${caracteres}\n`;
      resultadoPre.innerHTML += `📅 Extraído em: ${new Date().toLocaleString()}\n\n`;
      if (caracteres < 500) {
        resultadoPre.innerHTML += `⚠️ Pouco conteúdo extraído. Certifique-se de que a página do processo está totalmente carregada e, se for um documento, que ele está aberto para visualização.`;
      }
    } else {
      resultMsg.innerHTML = '⚠️ Não foi possível extrair o conteúdo completo. Tente: recarregar a página, aguardar o carregamento total do processo ou abrir o documento (sentença, petição) antes de extrair.';
      resultadoPre.innerHTML = 'Nenhum texto significativo foi encontrado.';
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
    resultMsg.innerHTML = '❌ Cole um texto com pelo menos 10 caracteres (ou extraia o processo primeiro).';
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
      resultMsg.innerHTML = '❌ Erro da IA: ' + JSON.stringify(data);
    }
  } catch(e) {
    resultMsg.innerHTML = '❌ Erro de conexão: ' + e.message;
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