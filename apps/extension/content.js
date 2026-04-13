// ============================================
// CONTENT.JS - EXTRAÇÃO OTIMIZADA FINAL (CORRIGIDO COM EXPANSÃO DE ANDAMENTOS)
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
// FUNÇÕES DE EXPANSÃO (NOVO)
// ============================================

// Expande todos os accordions/árvores do PJE (Angular Material)
async function expandirTodosAndamentos() {
  console.log('[Content] Expandindo andamentos...');
  
  // Seletores comuns no PJE para botões de expandir
  const botoesExpansao = [
    'mat-icon-button[aria-label="Expandir"]',
    'mat-icon-button .fa-plus',
    'mat-icon-button .fa-chevron-down',
    '.tree-toggle',
    '.expand-button',
    'button[title="Expandir"]',
    '.accordion-header',
    '.movimentacao .toggle',
    '.tree .mat-icon-button',
    'button.tree-node__toggle',
    '.mat-expansion-panel-header',
    '[data-toggle="collapse"]'
  ];
  
  let expandiu = false;
  for (const sel of botoesExpansao) {
    const botoes = document.querySelectorAll(sel);
    for (const btn of botoes) {
      // Verifica se está visível e se não está já expandido
      const parent = btn.closest('.mat-card, .tree-node, .movimentacao-item, .mat-expansion-panel');
      const jaExpandido = parent?.getAttribute('aria-expanded') === 'true' ||
                          parent?.classList?.contains('mat-expanded');
      if (!jaExpandido && btn.offsetParent !== null) {
        try {
          btn.click();
          expandiu = true;
          await new Promise(r => setTimeout(r, 300));
        } catch(e) {}
      }
    }
  }
  
  // Repete recursivamente para sub-árvores
  if (expandiu) {
    await new Promise(r => setTimeout(r, 800));
    await expandirTodosAndamentos();
  }
}

// ============================================
// EXTRAÇÃO DE LINKS COM EXPANSÃO PRÉVIA
// ============================================

// Versão assíncrona que expande antes de extrair
async function extrairLinksDocumentosCompletos() {
  // 1. Expande todos os andamentos
  await expandirTodosAndamentos();
  await new Promise(r => setTimeout(r, 1000)); // Aguarda renderização
  
  // 2. Coleta todos os links de documentos
  const links = new Map();
  const seletores = [
    'a[href*="download"]',
    'a[href*="documento"]',
    'a[href*="visualizar"]',
    'a[href*="pdf"]',
    'a.linkVisualizar',
    'a.linkDocumento',
    '.movimentacao a',
    '.andamento a',
    '.tree a',
    'tr a',
    'td a',
    'mat-card a',
    '.documento-link',
    'a[href*="documentoId"]',
    'a[href*="idDocumento"]'
  ];
  
  const elementos = document.querySelectorAll(seletores.join(','));
  for (const el of elementos) {
    let href = el.href;
    let texto = (el.innerText || el.textContent || '').trim();
    
    // Torna URL absoluta se for relativa
    if (href && href.startsWith('/')) {
      href = window.location.origin + href;
    }
    
    if (href && href.startsWith('http') && !href.includes('login') && texto.length > 3) {
      if (!links.has(href)) {
        links.set(href, {
          url: href,
          titulo: texto.substring(0, 100),
          tipo: identificarTipoDocumento(texto, href)
        });
      }
    }
  }
  
  // 3. Se ainda não encontrou nada, tenta buscar em iframes
  if (links.size === 0) {
    const iframes = document.querySelectorAll('iframe');
    for (const iframe of iframes) {
      try {
        const doc = iframe.contentDocument;
        if (doc && doc.body) {
          const linksIframe = extrairLinksDoDocumento(doc);
          for (const link of linksIframe) {
            if (!links.has(link.url)) links.set(link.url, link);
          }
        }
      } catch(e) {}
    }
  }
  
  console.log(`[Content] Total de links encontrados: ${links.size}`);
  return Array.from(links.values());
}

// Função auxiliar para extrair links de um documento qualquer
function extrairLinksDoDocumento(doc) {
  const links = [];
  const elementos = doc.querySelectorAll('a[href]');
  for (const el of elementos) {
    let href = el.href;
    let texto = (el.innerText || '').trim();
    if (href && href.startsWith('http') && texto.length > 3) {
      links.push({
        url: href,
        titulo: texto.substring(0, 100),
        tipo: identificarTipoDocumento(texto, href)
      });
    }
  }
  return links;
}

// Mantém a função síncrona original para compatibilidade (mas será substituída)
function extrairLinksDocumentos() {
  // Versão síncrona simples (sem expansão) – manter por enquanto
  const links = [];
  const seletores = [
    'a[href*="download"]',
    'a[href*="documento"]',
    'a[href*="visualizar"]',
    'a[href*="pdf"]',
    '.movimentacao a',
    '.andamento a',
    '.timeline a',
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
// DEMAIS FUNÇÕES (PERMANECEM IGUAIS)
// ============================================

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

// Extrai o texto completo do documento (usado pela extração normal)
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

// Detecta links de documentos na página (versão simples)
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

// Identifica o tipo de documento pelo texto ou URL
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

// Extrai todo o texto visível da página (para abas temporárias)
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

// ============================================
// FUNÇÃO PRINCIPAL DE EXTRAÇÃO (PÁGINA ATUAL)
// ============================================
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
// LISTENER ÚNICO (TRATA TODAS AS MENSAGENS)
// ============================================
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  // Extração padrão (página atual)
  if (req.action === 'extrairProcesso') {
    extrairDadosCompletos()
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }

  // Extração de texto de uma página (para abas temporárias)
  if (req.action === 'extrairTexto') {
    const texto = extrairTextoCompleto(document);
    sendResponse({ texto });
    return true;
  }

  // Extração de texto de página (versão simplificada para abas temporárias)
  if (req.action === 'extrairTextoPagina') {
    const texto = extrairTextoPagina();
    sendResponse({ texto });
    return true;
  }

  // Obter seleção do usuário
  if (req.action === 'GET_SELECTION') {
    const text = window.getSelection()?.toString() || '';
    sendResponse({ text });
    return true;
  }

  // Obter lista de links de documentos da página (VERSÃO CORRIGIDA COM EXPANSÃO)
  if (req.action === 'extrairLinksDocumentos') {
    (async () => {
      const links = await extrairLinksDocumentosCompletos();
      sendResponse({ links, total: links.length });
    })();
    return true;
  }

  // Se nenhuma ação conhecida
  sendResponse({ error: 'Ação desconhecida' });
  return true;
});

console.log('Juris Assistant - content script carregado (com expansão de andamentos)');