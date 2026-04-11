// ============================================
// CONTENT.JS - EXTRAÇÃO OTIMIZADA FINAL (CORRIGIDO)
// ============================================

// Aguarda carregamento da página
function aguardarCarregamento() {
  return new Promise((resolve) => {
    let tentativas = 0;
    const maxTentativas = 40;
    const intervalo = setInterval(() => {
      tentativas++;
      const tamanho = document?.body?.innerText?.length || 0;
      if (tamanho > 5000 || tentativas >= maxTentativas) {
        clearInterval(intervalo);
        resolve();
      }
    }, 400);
  });
}

// Obtém o documento com mais texto (recursivo em iframes)
function getMelhorDocumentoRecursivo(elemento, depth = 0) {
  if (depth > 5) return elemento;
  let melhorDoc = elemento || document;
  let melhorTexto = (elemento?.body?.innerText?.length) || 0;
  let iframes = [];
  try {
    iframes = (elemento || document).querySelectorAll('iframe');
  } catch (e) {
    return melhorDoc;
  }
  for (const iframe of iframes) {
    try {
      const doc = iframe.contentDocument;
      if (doc && doc.body) {
        const docRecursivo = getMelhorDocumentoRecursivo(doc, depth + 1);
        const tamanho = docRecursivo?.body?.innerText?.length || 0;
        if (tamanho > melhorTexto) {
          melhorTexto = tamanho;
          melhorDoc = docRecursivo;
        }
      }
    } catch (e) {
      // cross-origin ignore
    }
  }
  return melhorDoc;
}

// Extrai número do processo
function extrairNumero(doc) {
  if (!doc?.body) return null;
  const text = doc.body.innerText || '';
  const regexList = [
    /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/,
    /\d{20}/
  ];
  for (const regex of regexList) {
    const match = text.match(regex);
    if (match) return match[0];
  }
  return null;
}

// Extrai tribunal pela URL
function extrairTribunal() {
  const url = window.location.href.toLowerCase();
  if (url.includes('trt1')) return 'TRT 1ª Região (RJ)';
  if (url.includes('trt2')) return 'TRT 2ª Região (SP)';
  if (url.includes('trt3')) return 'TRT 3ª Região (MG)';
  if (url.includes('trt4')) return 'TRT 4ª Região (RS)';
  if (url.includes('trt5')) return 'TRT 5ª Região (BA)';
  if (url.includes('trt15')) return 'TRT 15ª Região (SP)';
  if (url.includes('tst')) return 'TST';
  return 'Tribunal não identificado';
}

// Limpa o texto (remove espaços excessivos)
function limparTexto(texto) {
  return texto.replace(/\s+/g, ' ').replace(/\n\s+/g, '\n').trim();
}

// Extrai o texto completo do documento
function extrairTextoCompleto(doc) {
  if (!doc) return '';
  const seletores = [
    'main', 'article', '.conteudo', '#conteudo', '.content', '#content',
    '.ui-panel', '.rich-panel', 'body'
  ];
  let melhorTexto = '';
  for (const sel of seletores) {
    try {
      const elementos = doc.querySelectorAll(sel);
      for (const el of elementos) {
        const texto = el?.innerText || '';
        if (texto.length > melhorTexto.length) melhorTexto = texto;
      }
    } catch (e) {}
  }
  return limparTexto(melhorTexto).substring(0, 120000);
}

// Detecta links de documentos na página (sentença, petição, etc.)
function detectarLinksDocumentos() {
  const links = [];
  const palavrasChave = ['sentença', 'decisão', 'petição', 'contestação', 'recurso', 'acórdão'];
  const elementos = document.querySelectorAll('a[href]');
  for (const el of elementos) {
    const texto = el.innerText.toLowerCase();
    const href = el.href;
    if (href && palavrasChave.some(p => texto.includes(p))) {
      links.push({ texto: el.innerText, url: href });
    }
  }
  return links;
}

// Função principal de extração (chamada pela extensão)
async function extrairDadosCompletos() {
  console.log('Extraindo metadados e movimentações...');
  await aguardarCarregamento();
  const doc = getMelhorDocumentoRecursivo(document);
  const textoMetadados = extrairTextoCompleto(doc);
  const linksDocs = detectarLinksDocumentos();

  let textoDocumentos = '';
  for (const link of linksDocs) {
    textoDocumentos += `\n\n📄 Documento encontrado: ${link.texto}\nURL: ${link.url}\n`;
  }

  return {
    numero: extrairNumero(doc),
    tribunal: extrairTribunal(),
    textoCompleto: textoMetadados + textoDocumentos,
    qtdeCaracteres: (textoMetadados + textoDocumentos).length,
    linksDocumentos: linksDocs,
    url: window.location.href,
    titulo: document.title,
    dataExtracao: new Date().toISOString()
  };
}

// Listener único para mensagens
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.action === 'extrairProcesso') {
    extrairDadosCompletos()
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }
  if (req.action === 'extrairTexto') {
    const texto = extrairTextoCompleto(document);
    sendResponse({ texto });
    return true;
  }
  if (req.action === 'GET_SELECTION') {
    const text = window.getSelection()?.toString() || '';
    sendResponse({ text });
    return true;
  }
});

console.log('Juris Assistant - content script carregado');