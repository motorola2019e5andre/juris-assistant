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
    resultMsg.innerHTML = 'Sessao restaurada!';
  }
});

// Carregar role salvo
chrome.storage.local.get(['userRole'], (result) => {
  if (result.userRole) {
    const radio = document.querySelector(`input[name="role"][value="${result.userRole}"]`);
    if (radio) radio.checked = true;
  }
});

// LOGIN
document.getElementById('logarBtn').onclick = async () => {
  const email = document.getElementById('email').value;
  const senha = document.getElementById('senha').value;
  statusMsg.innerHTML = 'Logando...';
  
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
      resultMsg.innerHTML = 'Login OK!';
    } else {
      statusMsg.innerHTML = 'Erro: ' + JSON.stringify(data);
    }
  } catch(e) {
    statusMsg.innerHTML = 'Erro: ' + e.message;
  }
};

// SAIR
document.getElementById('sairBtn').onclick = () => {
  chrome.storage.local.remove(['token', 'userEmail', 'userRole']);
  token = null;
  loginDiv.style.display = 'block';
  mainDiv.style.display = 'none';
  document.getElementById('email').value = 'cliente@teste.com';
  document.getElementById('senha').value = '123456';
  statusMsg.innerHTML = 'Aguardando login...';
  resultMsg.innerHTML = '';
  resultadoPre.innerHTML = '';
};

// SALVAR ROLE
document.getElementById('salvarRoleBtn').onclick = async () => {
  const selectedRole = document.querySelector('input[name="role"]:checked').value;
  
  if (!token) {
    resultMsg.innerHTML = 'Faca login primeiro!';
    return;
  }
  
  resultMsg.innerHTML = 'Salvando posicao...';
  
  try {
    const response = await fetch(API + '/user/role', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ role: selectedRole })
    });
    
    const data = await response.json();
    
    if (data.success) {
      chrome.storage.local.set({ userRole: selectedRole });
      resultMsg.innerHTML = 'Posicao salva: ' + (selectedRole === 'reclamante' ? 'Reclamante' : 'Reclamada');
    } else {
      resultMsg.innerHTML = 'Erro ao salvar posicao';
    }
  } catch(e) {
    resultMsg.innerHTML = 'Erro: ' + e.message;
  }
};

// CONSULTAR PROCESSO
document.getElementById('consultarPjeBtn').onclick = async () => {
  const numero = document.getElementById('numeroProcesso').value;
  if (!numero) {
    resultMsg.innerHTML = 'Digite o numero do processo!';
    return;
  }
  if (!token) {
    resultMsg.innerHTML = 'Faca login primeiro!';
    return;
  }
  resultMsg.innerHTML = 'Consultando processo...';
  resultadoPre.innerHTML = '';
  try {
    const response = await fetch(API + '/api/v1/processos:consultar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ numero })
    });
    const data = await response.json();
    resultadoPre.innerHTML = JSON.stringify(data, null, 2);
    if (data.status === 'ok') {
      resultMsg.innerHTML = 'Processo encontrado!';
      if (data.result?.processo?.movimentacoes) {
        const andamento = data.result.processo.movimentacoes.map(m => m.data + ': ' + m.texto).join('\n');
        document.getElementById('texto').value = andamento;
      }
    } else {
      resultMsg.innerHTML = 'Erro: ' + (data.messages ? data.messages.join(', ') : 'Nao encontrado');
    }
  } catch(e) {
    resultMsg.innerHTML = 'Erro: ' + e.message;
  }
};

// LER PAGINA
document.getElementById('lerPaginaBtn').onclick = async () => {
  resultMsg.innerHTML = 'Lendo pagina...';
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => {
        return {
          success: true,
          andamento: document.body.innerText.substring(0, 3000),
          url: window.location.href
        };
      }
    });
    const data = results[0].result;
    if (data.success) {
      document.getElementById('texto').value = data.andamento;
      resultMsg.innerHTML = 'Pagina lida!';
    } else {
      resultMsg.innerHTML = 'Erro ao ler pagina';
    }
  } catch(e) {
    resultMsg.innerHTML = 'Erro: ' + e.message;
  }
};

// ABRIR TRIBUNAL
document.getElementById('abrirTribunalBtn').onclick = () => {
  const url = document.getElementById('tribunalSelect').value;
  if (url) {
    chrome.tabs.create({ url: url });
    resultMsg.innerHTML = 'Abrindo tribunal...';
  } else {
    resultMsg.innerHTML = 'Selecione um tribunal primeiro!';
  }
};

// CHAMAR IA
async function callAI(endpoint, nomeFeature) {
  const texto = document.getElementById('texto').value;
  const selectedRole = document.querySelector('input[name="role"]:checked')?.value || 'reclamante';
  
  if (!texto || texto.length < 10) {
    resultMsg.innerHTML = 'Cole um texto com pelo menos 10 caracteres!';
    return;
  }
  
  resultMsg.innerHTML = 'Gerando ' + nomeFeature + '...';
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
      resultadoPre.innerHTML = 'Polo: ' + (data.role === 'reclamante' ? 'Reclamante' : 'Reclamada') + '\n\n' + data.result;
      resultMsg.innerHTML = nomeFeature + ' gerado! Creditos restantes: ' + data.creditsRemaining;
    } else {
      resultMsg.innerHTML = 'Erro: ' + JSON.stringify(data);
    }
  } catch(e) {
    resultMsg.innerHTML = 'Erro: ' + e.message;
  }
}

// BOTOES
document.getElementById('clienteBtn').onclick = () => callAI('summarize-client', 'Resumo para cliente');
document.getElementById('tecnicoBtn').onclick = () => callAI('summarize-technical', 'Resumo tecnico');
document.getElementById('peticaoBtn').onclick = () => callAI('draft-petition', 'Assistente de peticao');