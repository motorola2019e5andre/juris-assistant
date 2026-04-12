// ============================================
// SIDEPANEL.JS - Versão completa com extração em massa
// ============================================

const API = 'https://juris-assistant-api.onrender.com';

const resultMsg = document.getElementById('resultMsg');
const resultadoPre = document.getElementById('resultado');

// ============================================
// EXTRAIR PROCESSO (página atual)
// ============================================
const extrairBtn = document.getElementById('extrairProcessoBtn');
if (extrairBtn) {
  extrairBtn.onclick = async () => {
    resultMsg.innerHTML = '🔄 Extraindo processo...';
    resultadoPre.innerHTML = '';

    try {
      const response = await chrome.runtime.sendMessage({ action: 'extrairProcesso' });

      if (!response) {
        resultMsg.innerHTML = '❌ Nenhuma resposta da página';
        return;
      }
      if (response.error) {
        resultMsg.innerHTML = '❌ ' + response.error;
        return;
      }

      if (response.numero) {
        const numeroInput = document.getElementById('numeroProcesso');
        if (numeroInput) numeroInput.value = response.numero;
      }

      const textoCompleto = response.textoCompleto || '';
      const caracteres = textoCompleto.length;

      const textoArea = document.getElementById('texto');
      if (textoArea) textoArea.value = textoCompleto;

      if (caracteres < 50) {
        resultMsg.innerHTML = '⚠️ Pouco conteúdo extraído';
      } else {
        resultMsg.innerHTML = `✅ Extraído (${caracteres} caracteres)`;
      }

      resultadoPre.innerHTML = `🏛️ Tribunal: ${response.tribunal || 'Não identificado'}\n📋 Número: ${response.numero || 'Não identificado'}\n📊 Caracteres: ${caracteres}\n📅 Extraído: ${new Date().toLocaleString()}\n`;

      if (response.linksDocumentos && response.linksDocumentos.length > 0) {
        resultadoPre.innerHTML += '\n📄 **Documentos encontrados (clique para abrir):**\n';
        for (const link of response.linksDocumentos) {
          resultadoPre.innerHTML += `<a href="#" onclick="chrome.tabs.create({url:'${link.url}'}); return false;">${link.texto}</a><br>`;
        }
      }
    } catch (e) {
      resultMsg.innerHTML = '❌ Erro: ' + e.message;
    }
  };
}

// ============================================
// EXTRAIR TODOS OS ANDAMENTOS (MASSIVO)
// ============================================
const extrairTodosBtn = document.getElementById('extrairTodosBtn');
if (extrairTodosBtn) {
  extrairTodosBtn.onclick = async () => {
    resultMsg.innerHTML = '🔍 Coletando lista de documentos...';
    resultadoPre.innerHTML = '';

    try {
      // 1. Obtém a lista de links da página atual
      const responseLinks = await chrome.runtime.sendMessage({ action: 'extrairLinksDocumentos' });
      if (responseLinks.error) {
        resultMsg.innerHTML = '❌ ' + responseLinks.error;
        return;
      }
      const links = responseLinks.links;
      if (!links || links.length === 0) {
        resultMsg.innerHTML = '⚠️ Nenhum documento encontrado na página.';
        return;
      }

      resultMsg.innerHTML = `🔄 Extraindo ${links.length} documentos. Isso pode levar alguns segundos...`;

      // 2. Solicita a extração de todos os documentos
      const response = await chrome.runtime.sendMessage({
        action: 'extrairTodosDocumentos',
        urls: links
      });

      if (response.error) {
        resultMsg.innerHTML = '❌ ' + response.error;
        return;
      }

      // 3. Monta o texto completo
      const documentos = response.documentos;
      let textoCompleto = '';
      for (const doc of documentos) {
        textoCompleto += `\n\n📄 === ${doc.titulo} (${doc.tipo}) ===\n${doc.texto}\n`;
      }

      if (textoCompleto && textoCompleto.length > 100) {
        document.getElementById('texto').value = textoCompleto;
        resultMsg.innerHTML = `✅ Extraídos ${documentos.length} documentos! Total: ${textoCompleto.length} caracteres.`;
        resultadoPre.innerHTML = `📚 Documentos extraídos: ${documentos.length}\n📌 Caracteres totais: ${textoCompleto.length}`;
      } else {
        resultMsg.innerHTML = '⚠️ Nenhum texto significativo foi extraído.';
      }
    } catch (e) {
      console.error(e);
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
    if (!response.ok) throw new Error('HTTP ' + response.status);

    const data = await response.json();
    if (data.error) {
      resultMsg.innerHTML = '❌ ' + data.error;
      return;
    }

    resultadoPre.innerHTML = `📌 POLO: ${role === 'reclamante' ? 'Reclamante' : 'Reclamada'}\n\n${data.result || 'Sem resposta'}`;
    resultMsg.innerHTML = '✅ Concluído' + (data.creditsRemaining ? ' | Créditos: ' + data.creditsRemaining : '');
  } catch (e) {
    resultMsg.innerHTML = e.name === 'AbortError' ? '⏱️ Timeout' : '❌ Erro: ' + e.message;
  }
}

// ============================================
// BOTÕES IA
// ============================================
document.getElementById('clienteBtn')?.addEventListener('click', () => callAI('summarize-client', 'Resumo cliente'));
document.getElementById('tecnicoBtn')?.addEventListener('click', () => callAI('summarize-technical', 'Resumo técnico'));
document.getElementById('peticaoBtn')?.addEventListener('click', () => callAI('draft-petition', 'Petição'));

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
// SELEÇÃO DO POLO (ROLE)
// ============================================
chrome.storage.local.get(['userRole'], (result) => {
  if (result.userRole) {
    const radio = document.querySelector(`input[name="role"][value="${result.userRole}"]`);
    if (radio) radio.checked = true;
  }
});

document.getElementById('salvarRoleBtn')?.addEventListener('click', () => {
  const selectedRole = document.querySelector('input[name="role"]:checked')?.value;
  if (!selectedRole) return;
  chrome.storage.local.set({ userRole: selectedRole });
  resultMsg.innerHTML = '✅ Posição salva: ' + (selectedRole === 'reclamante' ? 'Reclamante' : 'Reclamada');
});