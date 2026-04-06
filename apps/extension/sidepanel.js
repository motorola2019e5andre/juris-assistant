// CARREGAR ROLE SALVO
chrome.storage.local.get(['userRole'], (result) => {
  if (result.userRole) {
    const radio = document.querySelector(`input[name="role"][value="${result.userRole}"]`);
    if (radio) radio.checked = true;
  }
});

// SALVAR ROLE
document.getElementById('salvarRoleBtn').onclick = async () => {
  const selectedRole = document.querySelector('input[name="role"]:checked').value;
  
  if (!token) {
    resultMsg.innerHTML = '❌ Faça login primeiro!';
    return;
  }
  
  resultMsg.innerHTML = '🔄 Salvando posição...';
  
  try {
    const response = await fetch(API + '/v1/user/role', {
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
      resultMsg.innerHTML = `✅ Posição salva: ${selectedRole === 'reclamante' ? 'Reclamante (Trabalhador)' : 'Reclamada (Empresa)'}`;
    } else {
      resultMsg.innerHTML = '❌ Erro ao salvar posição';
    }
  } catch(e) {
    resultMsg.innerHTML = '❌ Erro: ' + e.message;
  }
};

// Atualizar as funções callAI para mostrar o polo usado
async function callAI(endpoint, nomeFeature) {
  const texto = document.getElementById('texto').value;
  const selectedRole = document.querySelector('input[name="role"]:checked')?.value || 'reclamante';
  
  if (!texto || texto.length < 10) {
    resultMsg.innerHTML = '❌ Cole um texto com pelo menos 10 caracteres!';
    return;
  }
  
  resultMsg.innerHTML = `🔄 ${nomeFeature} (${selectedRole === 'reclamante' ? 'Reclamante' : 'Reclamada'})...`;
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
      resultadoPre.innerHTML = `📌 POLO: ${data.role === 'reclamante' ? 'Reclamante (Trabalhador)' : 'Reclamada (Empresa)'}\n\n${data.result}`;
      resultMsg.innerHTML = `✅ ${nomeFeature} gerado! Créditos restantes: ${data.creditsRemaining}`;
    } else {
      resultMsg.innerHTML = '❌ Erro: ' + JSON.stringify(data);
    }
  } catch(e) {
    resultMsg.innerHTML = '❌ Erro: ' + e.message;
  }
}