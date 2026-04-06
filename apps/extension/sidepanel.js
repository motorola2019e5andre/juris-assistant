const API = 'https://juris-assistant-api.onrender.com';
let token = null;

const loginDiv = document.getElementById('loginDiv');
const mainDiv = document.getElementById('mainDiv');
const statusMsg = document.getElementById('statusMsg');
const resultMsg = document.getElementById('resultMsg');
const resultadoPre = document.getElementById('resultado');
const userEmailSpan = document.getElementById('userEmail');

// ============================================
// VERIFICAR TOKEN SALVO
// ============================================
chrome.storage.local.get(['token', 'userEmail'], (result) => {
  if (result.token) {
    token = result.token;
    loginDiv.style.display = 'none';
    mainDiv.style.display = 'block';
    if (result.userEmail) userEmailSpan.innerText = result.userEmail;
    resultMsg.innerHTML = '✅ Sessão restaurada!';
  }
});

// ============================================
// LOGIN
// ============================================
document.getElementById('logarBtn').onclick = async () => {
  const email = document.getElementById('email').value;
  const senha = document.getElementById('senha').value;
  
  statusMsg.innerHTML = '🔄 Logando...';
  
  try {
    const response = await fetch(API + '/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: senha })
    });
    
    const data = await response.json();
    
    if (data.token) {
      token = data.token;
      chrome.storage.local.set({ token: data.token, userEmail: email });
      userEmailSpan.innerText = email;
      loginDiv.style.display = 'none';
      mainDiv.style.display = 'block';
      resultMsg.innerHTML = '✅ Login OK! Créditos: ' + (data.user?.credits || 50);
    } else {
      statusMsg.innerHTML = '❌ Erro: ' + JSON.stringify(data);
    }
  } catch(e) {
    statusMsg.innerHTML = '❌ Erro: ' + e.message;
  }
};

// ============================================
// SAIR
// ============================================
document.getElementById('sairBtn').onclick = () => {
  chrome.storage.local.remove(['token', 'userEmail']);
  token = null;
  loginDiv.style.display = 'block';
  mainDiv.style.display = 'none';
  document.getElementById('email').value = 'render@teste.com';
  document.getElementById('senha').value = '123456';
  statusMsg.innerHTML = 'Aguardando login...';
  resultMsg.innerHTML = '';
  resultadoPre.innerHTML = '';
};

// ============================================
// ABRIR TRIBUNAL
// ============================================
document.getElementById('abrirTribunalBtn').onclick = () => {
  const url = document.getElementById('tribunalSelect').value;
  if (url) {
    chrome.tabs.create({ url: url });
  } else {
    resultMsg.innerHTML = '❌ Selecione um tribunal primeiro!';
  }
};

// ============================================
// LER PÁGINA (NOVA VERSÃO)
// ============================================
document.getElementById('lerPaginaBtn').onclick = async () => {
  resultMsg.innerHTML = '🔄 Lendo página do tribunal...';
  resultadoPre.innerHTML = '';
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tab.url.startsWith('chrome://')) {
      resultMsg.innerHTML = '❌ Não é possível ler páginas do Chrome. Acesse um tribunal PJe.';
      return;
    }
    
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => {
        // Extrai número do processo
        let processoNumero = null;
        const text = document.body.innerText;
        const match = text.match(/\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/);
        if (match) processoNumero = match[0];
        
        // Extrai andamento
        let andamento = '';
        const selectores = ['.movimentacao', '.movement', '.andamento', '.timeline', '.historico'];
        for (const sel of selectores) {
          const elem = document.querySelector(sel);
          if (elem && elem.innerText.length > 50) {
            andamento = elem.innerText;
            break;
          }
        }
        
        if (!andamento) {
          andamento = text.substring(0, 3000);
        }
        
        return {
          success: true,
          url: window.location.href,
          tribunal: window.location.href.includes('trt') ? 'TRT' : 'TST',
          isLoggedIn: true,
          processoNumero: processoNumero,
          andamento: andamento,
          titulo: document.title
        };
      }
    });
    
    const data = results[0].result;
    
    if (data.andamento && data.andamento.length > 10) {
      document.getElementById('texto').value = data.andamento;
      if (data.processoNumero) {
        document.getElementById('numeroProcesso').value = data.processoNumero;
      }
      resultMsg.innerHTML = `✅ Página lida! ${data.andamento.length} caracteres extraídos.`;
      resultadoPre.innerHTML = `✅ Tribunal: ${data.tribunal}\n📄 URL: ${data.url}\n📋 Processo: ${data.processoNumero || 'Não identificado'}\n📌 Caracteres: ${data.andamento.length}`;
    } else {
      resultMsg.innerHTML = '⚠️ Nenhum andamento encontrado. Tente copiar manualmente.';
    }
  } catch(e) {
    resultMsg.innerHTML = '❌ Erro ao ler página: ' + e.message;
  }
};

// ============================================
// VERIFICAR LOGIN
// ============================================
document.getElementById('verificarLoginBtn').onclick = async () => {
  resultMsg.innerHTML = '🔄 Verificando login...';
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tab.url.startsWith('chrome://')) {
      resultMsg.innerHTML = '❌ Acesse um tribunal PJe primeiro.';
      return;
    }
    
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => {
        const url = window.location.href;
        const isPJe = url.includes('pje') || url.includes('trt');
        const hasLoginForm = document.querySelector('input[type="password"]') !== null;
        const hasUserInfo = document.querySelector('.usuario-logado, .user-info') !== null;
        
        return {
          isPJe: isPJe,
          hasLoginForm: hasLoginForm,
          hasUserInfo: hasUserInfo,
          isLoggedIn: isPJe && !hasLoginForm
        };
      }
    });
    
    const data = results[0].result;
    
    if (data.isLoggedIn) {
      resultMsg.innerHTML = '✅ Você está logado no tribunal!';
    } else if (data.hasLoginForm) {
      resultMsg.innerHTML = '⚠️ Você NÃO está logado. Faça login no tribunal primeiro.';
    } else {
      resultMsg.innerHTML = '❌ Esta não é uma página de tribunal PJe.';
    }
  } catch(e) {
    resultMsg.innerHTML = '❌ Erro: ' + e.message;
  }
};

// ============================================
// EXTRAIR ANDAMENTO (MÉTODO RÁPIDO)
// ============================================
document.getElementById('extrairBtn').onclick = async () => {
  resultMsg.innerHTML = '🔄 Extraindo andamento...';
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => {
        const selectores = ['.movimentacao', '.movement', '.andamento', '.historico'];
        for (const sel of selectores) {
          const elem = document.querySelector(sel);
          if (elem && elem.innerText.length > 50) {
            return { andamento: elem.innerText, success: true };
          }
        }
        return { andamento: document.body.innerText.substring(0, 2000), success: true };
      }
    });
    
    const data = results[0].result;
    if (data.andamento) {
      document.getElementById('texto').value = data.andamento;
      resultMsg.innerHTML = '✅ Andamento extraído!';
    } else {
      resultMsg.innerHTML = '❌ Não foi possível extrair.';
    }
  } catch(e) {
    resultMsg.innerHTML = '❌ Erro: ' + e.message;
  }
};

// ============================================
// EXTRAIR PROCESSO (COMPLETO)
// ============================================
document.getElementById('extrairProcessoBtn').onclick = async () => {
  resultMsg.innerHTML = '🔄 Extraindo processo...';
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => {
        let processoNumero = null;
        const text = document.body.innerText;
        const match = text.match(/\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/);
        if (match) processoNumero = match[0];
        
        let andamento = '';
        const selectores = ['.movimentacao', '.movement', '.andamento'];
        for (const sel of selectores) {
          const elem = document.querySelector(sel);
          if (elem && elem.innerText.length > 50) {
            andamento = elem.innerText;
            break;
          }
        }
        
        return { processoNumero, andamento: andamento || text.substring(0, 2000) };
      }
    });
    
    const data = results[0].result;
    if (data.processoNumero) {
      document.getElementById('numeroProcesso').value = data.processoNumero;
    }
    if (data.andamento) {
      document.getElementById('texto').value = data.andamento;
    }
    resultMsg.innerHTML = '✅ Processo extraído!';
  } catch(e) {
    resultMsg.innerHTML = '❌ Erro: ' + e.message;
  }
};

// ============================================
// CHAMAR IA (RESUMOS)
// ============================================
async function callAI(endpoint, creditsCost, nomeFeature) {
  const texto = document.getElementById('texto').value;
  
  if (!texto || texto.length < 10) {
    resultMsg.innerHTML = '❌ Cole um texto com pelo menos 10 caracteres!';
    return;
  }
  
  resultMsg.innerHTML = '🔄 ' + nomeFeature + '...';
  resultadoPre.innerHTML = '';
  
  try {
    const response = await fetch(API + '/v1/ai/' + endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
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
// BOTÕES DE RESUMO
// ============================================
document.getElementById('clienteBtn').onclick = () => callAI('summarize-client', 1, 'Resumo para cliente');
document.getElementById('tecnicoBtn').onclick = () => callAI('summarize-technical', 2, 'Resumo técnico');
document.getElementById('peticaoBtn').onclick = () => callAI('draft-petition', 5, 'Assistente de petição');