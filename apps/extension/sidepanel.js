async function callAI(endpoint, nomeFeature) {
  const texto = document.getElementById('texto').value;
  
  if (!texto || texto.length < 10) {
    resultMsg.innerHTML = 'Cole um texto com pelo menos 10 caracteres!';
    return;
  }
  
  resultMsg.innerHTML = 'Gerando ' + nomeFeature + '...';
  resultadoPre.innerHTML = '';
  
  try {
    // SEM TOKEN - sem o header Authorization
    const response = await fetch(API + '/v1/ai/' + endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
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
