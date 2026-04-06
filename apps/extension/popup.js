const API = 'https://juris-assistant-api.onrender.com';
let token = null;

const loginDiv = document.getElementById('loginDiv');
const mainDiv = document.getElementById('mainDiv');
const statusMsg = document.getElementById('statusMsg');
const resultMsg = document.getElementById('resultMsg');
const resultadoPre = document.getElementById('resultado');
const userEmailSpan = document.getElementById('userEmail');

// Verificar token salvo
chrome.storage.local.get(['token', 'userEmail'], (result) => {
  if (result.token) {
    token = result.token;
    loginDiv.style.display = 'none';
    mainDiv.style.display = 'block';
    if (result.userEmail) userEmailSpan.innerText = result.userEmail;
    resultMsg.innerHTML = '✅ Sessão restaurada!';
  }
});

// LOGIN
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

// SAIR
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

// ABRIR TRIBUNAL
document.getElementById('abrirTribunalBtn').onclick = () => {
  const url = document.getElementById('tribunalSelect').value;
  if (url) {
    chrome.tabs.create({ url: url });
  } else {
    resultMsg.innerHTML = '❌ Selecione um tribunal primeiro!';
  }
};

// EXTRAIR ANDAMENTO DA PÁGINA ATUAL
document.getElementById('extrairBtn').onclick = async () => {
  resultMsg.innerHTML = '🔄 Extraindo andamento...';
  
  try {
    // Pega a aba ativa
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Executa o script na página
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => {
        // Função de extração
        const selectores = ['.movimentacao', '.movement', '.andamento', '.movimentacao-processo'];
        let andamento = '';
        let numeroProcesso = '';
        
        for (const sel of selectores) {
          const elem = document.querySelector(sel);
          if (elem && elem.innerText.trim().length > 0) {
            andamento = elem.innerText;
            break;
          }
        }
        
        const numElem = document.querySelector('.numero-processo, .processo-numero, [class*="numero"]');
        if (numElem) {
          numeroProcesso = numElem.innerText;
        }
        
        return { andamento, numeroProcesso, url: window.location.href };
      }
    });
    
    const data = results[0].result;
    
    if (data.andamento && data.andamento.length > 10) {
      let textoFinal = data.andamento;
      if (data.numeroProcesso) {
        textoFinal = `Processo nº ${data.numeroProcesso}\n\n${textoFinal}`;
      }
      document.getElementById('texto').value = textoFinal;
      resultMsg.innerHTML = '✅ Andamento extraído com sucesso!';
    } else {
      resultMsg.innerHTML = '❌ Não foi possível extrair. Tente copiar manualmente.';
    }
  } catch(e) {
    resultMsg.innerHTML = '❌ Erro ao extrair: ' + e.message;
  }
};

// Função genérica para chamar a IA
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

// Botões
document.getElementById('clienteBtn').onclick = () => callAI('summarize-client', 1, 'Resumo para cliente');
document.getElementById('tecnicoBtn').onclick = () => callAI('summarize-technical', 2, 'Resumo técnico');
document.getElementById('peticaoBtn').onclick = () => callAI('draft-petition', 5, 'Assistente de petição');