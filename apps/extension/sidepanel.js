const API = 'https://juris-assistant-api.onrender.com';
let token = null;

const loginDiv = document.getElementById('loginDiv');
const mainDiv = document.getElementById('mainDiv');
const statusMsg = document.getElementById('statusMsg');
const resultMsg = document.getElementById('resultMsg');
const resultadoPre = document.getElementById('resultado');
const userEmailSpan = document.getElementById('userEmail');

chrome.storage.local.get(['token', 'userEmail'], (result) => {
  if (result.token) {
    token = result.token;
    loginDiv.style.display = 'none';
    mainDiv.style.display = 'block';
    if (result.userEmail) userEmailSpan.innerText = result.userEmail;
    resultMsg.innerHTML = '✅ Sessão restaurada!';
  }
});

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
      resultMsg.innerHTML = '✅ Login OK!';
    } else {
      statusMsg.innerHTML = '❌ Erro: ' + JSON.stringify(data);
    }
  } catch(e) {
    statusMsg.innerHTML = '❌ Erro: ' + e.message;
  }
};

document.getElementById('sairBtn').onclick = () => {
  chrome.storage.local.remove(['token', 'userEmail']);
  token = null;
  loginDiv.style.display = 'block';
  mainDiv.style.display = 'none';
  document.getElementById('email').value = 'cliente@teste.com';
  document.getElementById('senha').value = '123456';
  statusMsg.innerHTML = 'Aguardando login...';
  resultMsg.innerHTML = '';
  resultadoPre.innerHTML = '';
};

document.getElementById('consultarPjeBtn').onclick = async () => {
  const numero = document.getElementById('numeroProcesso').value;
  if (!numero) {
    resultMsg.innerHTML = '❌ Digite o número do processo!';
    return;
  }
  if (!token) {
    resultMsg.innerHTML = '❌ Faça login primeiro!';
    return;
  }
  resultMsg.innerHTML = '🔄 Consultando processo...';
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
      resultMsg.innerHTML = `✅ ${data.code} - Processo encontrado!`;
      if (data.result?.processo?.movimentacoes) {
        const andamento = data.result.processo.movimentacoes.map(m => `${m.data}: ${m.texto}`).join('\n');
        document.getElementById('texto').value = andamento;
      }
    } else {
      resultMsg.innerHTML = `❌ ${data.code} - ${data.messages.join(', ')}`;
    }
  } catch(e) {
    resultMsg.innerHTML = '❌ Erro: ' + e.message;
  }
};

document.getElementById('lerPaginaBtn').onclick = async () => {
  resultMsg.innerHTML = '🔄 Lendo página...';
  try {
    const response = await chrome.runtime.sendMessage({ action: 'readCurrentPage' });
    if (response.success) {
      document.getElementById('texto').value = response.andamento;
      resultadoPre.innerHTML = `✅ Lido: ${response.andamento.length} caracteres`;
      resultMsg.innerHTML = '✅ Página lida!';
    } else {
      resultMsg.innerHTML = '❌ Erro: ' + response.error;
    }
  } catch(e) {
    resultMsg.innerHTML = '❌ Erro: ' + e.message;
  }
};

async function callAI(endpoint, nomeFeature) {
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
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ text: texto })
    });
    const data = await response.json();
    if (data.result) {
      resultadoPre.innerHTML = data.result;
      resultMsg.innerHTML = '✅ ' + nomeFeature + ' gerado!';
    } else {
      resultMsg.innerHTML = '❌ Erro: ' + JSON.stringify(data);
    }
  } catch(e) {
    resultMsg.innerHTML = '❌ Erro: ' + e.message;
  }
}

document.getElementById('clienteBtn').onclick = () => callAI('summarize-client', 'Resumo para cliente');
document.getElementById('tecnicoBtn').onclick = () => callAI('summarize-technical', 'Resumo técnico');
document.getElementById('peticaoBtn').onclick = () => callAI('draft-petition', 'Assistente de petição');