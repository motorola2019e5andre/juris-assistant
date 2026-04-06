const API = 'http://localhost:3333';
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
  document.getElementById('email').value = 'teste@teste.com';
  document.getElementById('senha').value = '123456';
  statusMsg.innerHTML = 'Aguardando login...';
  resultMsg.innerHTML = '';
  resultadoPre.innerHTML = '';
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