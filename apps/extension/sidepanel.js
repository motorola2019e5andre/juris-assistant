// ============================================
// SIDEPANEL.JS - versão corrigida e estável
// ============================================

const API = 'https://juris-assistant-api.onrender.com';

const resultMsg = document.getElementById('resultMsg');
const resultadoPre = document.getElementById('resultado');

// ============================================
// EXTRAIR PROCESSO
// ============================================
const extrairBtn = document.getElementById('extrairProcessoBtn');

if (extrairBtn) {
  extrairBtn.onclick = async () => {

    resultMsg.innerHTML = '🔄 Extraindo processo...';
    resultadoPre.innerHTML = '';

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'extrairProcesso'
      });

      if (!response) {
        resultMsg.innerHTML = '❌ Nenhuma resposta da página';
        return;
      }

      if (response.error) {
        resultMsg.innerHTML = '❌ ' + response.error;
        return;
      }

      // número
      if (response.numero) {
        const numeroInput = document.getElementById('numeroProcesso');
        if (numeroInput) numeroInput.value = response.numero;
      }

      const textoCompleto = response.textoCompleto || '';
      const caracteres = textoCompleto.length;

      if (caracteres < 50) {
        resultMsg.innerHTML = '⚠️ Pouco conteúdo extraído';
      } else {
        resultMsg.innerHTML = `✅ Extraído (${caracteres} caracteres)`;
      }

      const textoArea = document.getElementById('texto');
      if (textoArea) textoArea.value = textoCompleto;

      resultadoPre.innerHTML =
`🏛️ Tribunal: ${response.tribunal || 'Não identificado'}
📋 Número: ${response.numero || 'Não identificado'}
📊 Caracteres: ${caracteres}
📅 Extraído: ${new Date().toLocaleString()}
`;

    } catch (e) {
      resultMsg.innerHTML = '❌ Erro: ' + e.message;
    }
  };
}

// ============================================
// CHAMADA IA
// ============================================
async function callAI(endpoint, nomeFeature) {

  const texto = document.getElementById('texto')?.value || '';
  const role = document.querySelector('input[name="role"]:checked')?.value || 'reclamante';

  if (texto.length < 10) {
    resultMsg.innerHTML = '❌ Texto muito curto';
    return;
  }

  resultMsg.innerHTML = '🔄 ' + nomeFeature + '...';
  resultadoPre.innerHTML = '';

  try {

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    const response = await fetch(API + '/v1/ai/' + endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: texto, role }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error('HTTP ' + response.status);
    }

    const data = await response.json();

    if (data.error) {
      resultMsg.innerHTML = '❌ ' + data.error;
      return;
    }

    resultadoPre.innerHTML =
`📌 POLO: ${role === 'reclamante' ? 'Reclamante' : 'Reclamada'}

${data.result || 'Sem resposta'}
`;

    resultMsg.innerHTML =
      '✅ Concluído' +
      (data.creditsRemaining ? ' | Créditos: ' + data.creditsRemaining : '');

  } catch (e) {
    if (e.name === 'AbortError') {
      resultMsg.innerHTML = '⏱️ Timeout';
    } else {
      resultMsg.innerHTML = '❌ Erro: ' + e.message;
    }
  }
}

// ============================================
// BOTÕES IA
// ============================================
document.getElementById('clienteBtn')?.addEventListener(
  'click',
  () => callAI('summarize-client', 'Resumo cliente')
);

document.getElementById('tecnicoBtn')?.addEventListener(
  'click',
  () => callAI('summarize-technical', 'Resumo técnico')
);

document.getElementById('peticaoBtn')?.addEventListener(
  'click',
  () => callAI('draft-petition', 'Petição')
);

// ============================================
// ABRIR TRIBUNAL
// ============================================
document.getElementById('abrirTribunalBtn')?.addEventListener('click', () => {

  const url = document.getElementById('tribunalSelect')?.value;

  if (!url) {
    resultMsg.innerHTML = '❌ Selecione um tribunal';
    return;
  }

  chrome.tabs.create({ url });
  resultMsg.innerHTML = '🔗 Abrindo tribunal...';
});

// ============================================
// ROLE
// ============================================
chrome.storage.local.get(['userRole'], (result) => {

  if (result.userRole) {
    const radio = document.querySelector(
      `input[name="role"][value="${result.userRole}"]`
    );

    if (radio) radio.checked = true;
  }
});

document.getElementById('salvarRoleBtn')?.addEventListener('click', () => {

  const selectedRole =
    document.querySelector('input[name="role"]:checked')?.value;

  if (!selectedRole) return;

  chrome.storage.local.set({ userRole: selectedRole });

  resultMsg.innerHTML =
    '✅ Posição salva: ' +
    (selectedRole === 'reclamante'
      ? 'Reclamante'
      : 'Reclamada');
});