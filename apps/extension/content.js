// ============================================
// CONTENT.JS - EXTRAÇÃO POR IDS DE DOCUMENTO
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

// ============================================
// EXTRAI TODOS OS IDs DE DOCUMENTO DO TEXTO
// ============================================
function extrairIdsDocumentos() {
  const texto = document.body.innerText;
  const ids = new Set();
  
  // Padrão 1: "Id c817c5a" (letras+ números, geralmente 7 caracteres)
  const regexId = /Id\s+([a-z0-9]{7,8})/gi;
  let match;
  while ((match = regexId.exec(texto)) !== null) {
    ids.add(match[1]);
  }
  
  // Padrão 2: "Número do documento: 251105191194450000005540180128"
  const regexNumDoc = /Número do documento:\s*(\d{20,})/gi;
  while ((match = regexNumDoc.exec(texto)) !== null) {
    ids.add(match[1]);
  }
  
  // Padrão 3: "idDocumento=..." em URLs (caso existam links)
  const regexUrlId = /[?&]idDocumento=([a-z0-9]+)/gi;
  const links = document.querySelectorAll('a[href]');
  for (const link of links) {
    while ((match = regexUrlId.exec(link.href)) !== null) {
      ids.add(match[1]);
    }
  }
  
  return Array.from(ids);
}

// ============================================
// MONTA A URL DE VISUALIZAÇÃO DO PJE
// ============================================
function montarUrlDocumento(id) {
  const baseUrl = window.location.origin;
  // Tenta descobrir o padrão correto do tribunal
  if (baseUrl.includes('pje.trt')) {
    // Formato comum do PJE
    return `${baseUrl}/pje/Processo/ConsultaDocumento/listView.seam?${id}`;
  }
  // Fallback: tenta com id como parâmetro
  return `${baseUrl}/visualizador/?id=${id}`;
}

// ============================================
// FUNÇÃO PRINCIPAL PARA EXTRAIR LINKS (VIA IDs)
// ============================================
async function extrairLinksPorIds() {
  await aguardarCarregamento();
  const ids = extrairIdsDocumentos();
  console.log(`[Content] IDs encontrados: ${ids.length}`, ids);
  
  const links = [];
  for (const id of ids) {
    let url = montarUrlDocumento(id);
    // Se o ID for numérico longo, talvez seja o número do documento direto
    if (/^\d{20,}$/.test(id)) {
      url = `${window.location.origin}/pje/Processo/ConsultaDocumento/listView.seam?numeroDocumento=${id}`;
    }
    links.push({
      url: url,
      titulo: `Documento ID: ${id}`,
      tipo: 'DOCUMENTO'
    });
  }
  
  // Remove duplicatas
  const unicos = [];
  const urlsVistas = new Set();
  for (const link of links) {
    if (!urlsVistas.has(link.url)) {
      urlsVistas.add(link.url);
      unicos.push(link);
    }
  }
  return unicos;
}

// ============================================
// FUNÇÃO ANTIGA (FALLBACK) - MANTIDA PARA COMPATIBILIDADE
// ============================================
function extrairLinksDocumentos() {
  const links = [];
  const seletores = [
    'a[href*="download"]',
    'a[href*="documento"]',
    'a[href*="visualizar"]',
    'a[href*="pdf"]',
    '.movimentacao a',
    '.andamento a',
    'tr a',
    'td a'
  ];
  const elementos = document.querySelectorAll(seletores.join(','));
  for (const el of elementos) {
    const href = el.href;
    const texto = el.innerText || el.textContent || '';
    if (href && href.startsWith('http') && !href.includes('login') && texto.length > 5) {
      links.push({
        url: href,
        titulo: texto.trim(),
        tipo: identificarTipoDocumento(texto, href)
      });
    }
  }
  // Remove duplicatas
  const unicos = [];
  const urlsVistas = new Set();
  for (const link of links) {
    if (!urlsVistas.has(link.url)) {
      urlsVistas.add(link.url);
      unicos.push(link);
    }
  }
  return unicos;
}

// ============================================
// DEMAIS FUNÇÕES (EXTRAÇÃO DE TEXTO, NÚMERO, ETC)
// ============================================
function getMelhorDocumentoRecursivo(elemento, depth = 0) {
  if (depth > 5) return elemento;
  let melhorDoc = elemento || document;
  let melhorTexto = (elemento?.body?.innerText?.length) || 0;
  let iframes = [];
  try {
    iframes = (elemento || document).querySelectorAll('iframe');
  } catch (e) { return melhorDoc; }
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
    } catch (e) {}
  }
  return melhorDoc;
}

function extrairNumero(doc) {
  if (!doc?.body) return null;
  const text = doc.body.innerText || '';
  const regexList = [/\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/, /\d{20}/];
  for (const regex of regexList) {
    const match = text.match(regex);
    if (match) return match[0];
  }
  return null;
}

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

function limparTexto(texto) {
  return texto.replace(/\s+/g, ' ').replace(/\n\s+/g, '\n').trim();
}

function extrairTextoCompleto(doc) {
  if (!doc) return '';
  const seletores = ['main', 'article', '.conteudo', '#conteudo', '.content', '#content', '.ui-panel', '.rich-panel', 'body'];
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

function identificarTipoDocumento(texto, url) {
  const lower = texto.toLowerCase();
  if (lower.includes('sentença')) return 'SENTENÇA';
  if (lower.includes('petição inicial')) return 'PETIÇÃO INICIAL';
  if (lower.includes('contestação')) return 'CONTESTAÇÃO';
  if (lower.includes('recurso')) return 'RECURSO';
  if (lower.includes('intimação')) return 'INTIMAÇÃO';
  if (lower.includes('ata')) return 'ATA DE AUDIÊNCIA';
  if (lower.includes('decisão')) return 'DECISÃO';
  if (lower.includes('despacho')) return 'DESPACHO';
  if (lower.includes('embargos')) return 'EMBARGOS';
  if (url.includes('pdf')) return 'PDF';
  return 'DOCUMENTO';
}

function extrairTextoPagina() {
  const seletores = ['main', '.conteudo', '.content', '#conteudo', '.documento', '.document-content', 'body'];
  let melhorTexto = '';
  for (const sel of seletores) {
    const el = document.querySelector(sel);
    if (el && el.innerText.length > melhorTexto.length) {
      melhorTexto = el.innerText;
    }
  }
  return melhorTexto || document.body.innerText;
}

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

// ============================================
// LISTENER (usa extração por IDs)
// ============================================
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.action === 'extrairProcesso') {
    extrairDadosCompletos().then(sendResponse).catch(err => sendResponse({ error: err.message }));
    return true;
  }
  if (req.action === 'extrairTexto') {
    sendResponse({ texto: extrairTextoCompleto(document) });
    return true;
  }
  if (req.action === 'extrairTextoPagina') {
    sendResponse({ texto: extrairTextoPagina() });
    return true;
  }
  if (req.action === 'GET_SELECTION') {
    sendResponse({ text: window.getSelection()?.toString() || '' });
    return true;
  }
  if (req.action === 'extrairLinksDocumentos') {
    (async () => {
      try {
        // Tenta primeiro extrair por IDs (mais confiável)
        let links = await extrairLinksPorIds();
        if (links.length === 0) {
          // Fallback para o método antigo
          links = extrairLinksDocumentos();
        }
        sendResponse({ links, total: links.length });
      } catch (err) {
        console.error('[Content] Erro na extração:', err);
        sendResponse({ error: err.message, links: [], total: 0 });
      }
    })();
    return true;
  }
  sendResponse({ error: 'Ação desconhecida' });
  return true;
});

console.log('Juris Assistant - content script carregado (extração por IDs)');