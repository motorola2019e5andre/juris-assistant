// ============================================
// CONTENT.JS - EXTRAÇÃO OTIMIZADA (ÍNTEGRA + IFRAMES)
// ============================================

// Aguarda o carregamento completo da página (incluindo iframes)
function aguardarCarregamento() {
  return new Promise((resolve) => {
    let tentativas = 0;
    const maxTentativas = 40; // ~20 segundos (para páginas lentas)
    const intervalo = setInterval(() => {
      tentativas++;
      // Verifica se há conteúdo significativo (aumentado para 5000)
      if (document.body.innerText.length > 5000 || tentativas >= maxTentativas) {
        clearInterval(intervalo);
        resolve();
      }
    }, 500);
  });
}

// Obtém o documento com MAIS texto (entre todos os iframes e o documento principal)
function getMelhorDocumento() {
  let melhorDoc = document;
  let melhorTexto = document.body.innerText.length;
  const iframes = document.querySelectorAll('iframe');
  for (const iframe of iframes) {
    try {
      const doc = iframe.contentDocument;
      if (doc && doc.body && doc.body.innerText.length > melhorTexto) {
        melhorTexto = doc.body.innerText.length;
        melhorDoc = doc;
      }
    } catch (e) {
      // Erro de cross‑origin – ignora esse iframe
      console.warn('Não foi possível acessar iframe (cross‑origin):', e);
    }
  }
  return melhorDoc;
}

// Extrai número do processo
function extrairNumero(doc) {
  const text = doc.body.innerText;
  const regex = /\d{7}[-.]?\d{2}[-.]?\d{4}[-.]?\d[-.]?\d{2}[-.]?\d{4}/;
  const match = text.match(regex);
  return match ? match[0].replace(/[.-]/g, '') : null;
}

// Extrai tribunal (melhorado com mais domínios)
function extrairTribunal() {
  const url = window.location.href.toLowerCase();
  const tribunais = {
    'pje.tst.jus.br': 'TST',
    'pje.trt1.jus.br': 'TRT 1ª Região (RJ)',
    'pje.trt2.jus.br': 'TRT 2ª Região (SP)',
    'pje.trt3.jus.br': 'TRT 3ª Região (MG)',
    'pje.trt4.jus.br': 'TRT 4ª Região (RS)',
    'pje.trt5.jus.br': 'TRT 5ª Região (BA)',
    'pje.trt6.jus.br': 'TRT 6ª Região (PE)',
    'pje.trt7.jus.br': 'TRT 7ª Região (CE)',
    'pje.trt8.jus.br': 'TRT 8ª Região (PA/AP)',
    'pje.trt9.jus.br': 'TRT 9ª Região (PR)',
    'pje.trt10.jus.br': 'TRT 10ª Região (DF/TO)',
    'pje.trt11.jus.br': 'TRT 11ª Região (AM/RR)',
    'pje.trt12.jus.br': 'TRT 12ª Região (SC)',
    'pje.trt13.jus.br': 'TRT 13ª Região (PB)',
    'pje.trt14.jus.br': 'TRT 14ª Região (RO/AC)',
    'pje.trt15.jus.br': 'TRT 15ª Região (SP)',
    'pje.trt16.jus.br': 'TRT 16ª Região (MA)',
    'pje.trt17.jus.br': 'TRT 17ª Região (ES)',
    'pje.trt18.jus.br': 'TRT 18ª Região (GO)',
    'pje.trt19.jus.br': 'TRT 19ª Região (AL)',
    'pje.trt20.jus.br': 'TRT 20ª Região (SE)',
    'pje.trt21.jus.br': 'TRT 21ª Região (RN)',
    'pje.trt22.jus.br': 'TRT 22ª Região (PI)',
    'pje.trt23.jus.br': 'TRT 23ª Região (MT)',
    'pje.trt24.jus.br': 'TRT 24ª Região (MS)'
  };
  for (const [domain, name] of Object.entries(tribunais)) {
    if (url.includes(domain)) return name;
  }
  return 'Tribunal não identificado';
}

// Extrai TODO o texto do documento (limpo e organizado)
function extrairTextoCompleto(doc) {
  // Seletores abrangentes para conteúdo do PJe (prioridade)
  const seletores = [
    'main', 'article', '.conteudo', '#conteudo', '.content', '#content',
    '.documento', '.document-content', '.texto-documento',
    'pje-processo-detalhe', 'pje-visualizador-documento',
    '.card-body', '.panel-body', '.visualizacao-processo',
    '.movimentacoes', '.andamento', 'body'
  ];
  let melhorTexto = '';
  for (const sel of seletores) {
    const elementos = doc.querySelectorAll(sel);
    for (const el of elementos) {
      const texto = el.innerText || el.textContent || '';
      if (texto.length > melhorTexto.length) {
        melhorTexto = texto;
      }
    }
  }
  // Remove lixo (scripts, estilos, menus, rodapés)
  let textoLimpo = melhorTexto
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/\n\s*\n\s*\n/g, '\n\n')  // quebras excessivas
    .trim();
  return textoLimpo;
}

// Função principal
async function extrairDados() {
  console.log('🔄 Aguardando carregamento completo da página e iframes...');
  await aguardarCarregamento();
  await new Promise(r => setTimeout(r, 3000)); // segurança extra

  const doc = getMelhorDocumento(); // pega o documento com mais texto
  const textoCompleto = extrairTextoCompleto(doc);
  const numero = extrairNumero(doc);
  const tribunal = extrairTribunal();

  console.log(`✅ Texto extraído: ${textoCompleto.length} caracteres`);
  console.log(`📌 Número: ${numero}`);
  console.log(`🏛️ Tribunal: ${tribunal}`);

  return {
    numero: numero,
    tribunal: tribunal,
    textoCompleto: textoCompleto,
    qtdeCaracteres: textoCompleto.length,
    url: window.location.href,
    titulo: document.title,
    dataExtracao: new Date().toISOString()
  };
}

// Listener
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.action === 'extrairProcesso') {
    extrairDados()
      .then(dados => sendResponse(dados))
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }
});

console.log('🚀 Content Script (versão otimizada) carregado');