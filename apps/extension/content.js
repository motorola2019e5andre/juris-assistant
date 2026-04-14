// ============================================
// CONTENT.JS - EXTRAÇÃO MASSIVA COM EXPANSÃO TOTAL E SCROLL
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
// ROLAGEM PARA CARREGAR MAIS ITENS (LAZY LOADING)
// ============================================
async function rolarAteOFim() {
  console.log('[Content] Rolando página para carregar mais andamentos...');
  let alturaAnterior = 0;
  let scrolls = 0;
  const maxScrolls = 20;
  while (scrolls < maxScrolls) {
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise(r => setTimeout(r, 1000));
    const novaAltura = document.body.scrollHeight;
    if (novaAltura === alturaAnterior) break;
    alturaAnterior = novaAltura;
    scrolls++;
  }
  console.log('[Content] Rolagem finalizada.');
}

// ============================================
// EXPANSÃO TOTAL DE ANDAMENTOS (VERSÃO EXTREMA)
// ============================================
async function expandirTudo() {
  console.log('[Content] Iniciando expansão de andamentos...');
  
  // Lista ampliada de seletores de botões de expansão
  const seletoresExpansao = [
    'button[aria-label="Expandir"]',
    'button[aria-label="expandir"]',
    'mat-icon-button[aria-label="Expandir"]',
    '.fa-plus', '.fa-chevron-down', '.fa-angle-down',
    '.tree-toggle', '.expand-button', '.accordion-toggle',
    '[data-toggle="collapse"]', '.mat-expansion-panel-header',
    '.tree-node__toggle', '.movimentacao .toggle', '.andamento .toggle',
    'img[alt="Expandir"]', 'a[title="Expandir"]',
    'button:has(> .fa-plus)', 'button:has(> .fa-chevron-down)',
    '.mat-icon-button', '.expand-icon'
  ];
  
  let expandiu = true;
  let iteracoes = 0;
  const maxIteracoes = 10;
  
  while (expandiu && iteracoes < maxIteracoes) {
    expandiu = false;
    iteracoes++;
    
    for (const sel of seletoresExpansao) {
      const botoes = document.querySelectorAll(sel);
      for (const btn of botoes) {
        // Verifica se está visível e se o elemento pai não está expandido
        const parent = btn.closest('.mat-expansion-panel, .tree-node, .movimentacao-item, .andamento-item, .card');
        const estaExpandido = parent?.getAttribute('aria-expanded') === 'true' ||
                              parent?.classList?.contains('mat-expanded') ||
                              parent?.classList?.contains('open');
        
        if (!estaExpandido && btn.offsetParent !== null) {
          try {
            btn.click();
            expandiu = true;
            await new Promise(r => setTimeout(r, 300));
          } catch(e) {}
        }
      }
    }
    
    // Força clique em qualquer elemento que contenha ícone de "+" ou "expandir"
    const icones = document.querySelectorAll('i.fa-plus, i.fa-chevron-down, span:contains("Expandir")');
    for (const icon of icones) {
      const btn = icon.closest('button') || icon;
      if (btn.offsetParent !== null) {
        try {
          btn.click();
          expandiu = true;
          await new Promise(r => setTimeout(r, 300));
        } catch(e) {}
      }
    }
    
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log('[Content] Expansão concluída após', iteracoes, 'iterações.');
}

// ============================================
// EXTRAÇÃO DE LINKS APÓS EXPANSÃO E ROLAGEM
// ============================================
async function extrairLinksCompletos() {
  // 1. Rolar para carregar lazy loading
  await rolarAteOFim();
  
  // 2. Expandir todos os andamentos
  await expandirTudo();
  await new Promise(r => setTimeout(r, 1500));
  
  // 3. Coletar links
  const links = new Map();
  const seletores = [
    'a[href*="download"]',
    'a[href*="documento"]',
    'a[href*="visualizar"]',
    'a[href*="pdf"]',
    'a[href*="idDocumento"]',
    'a[href*="documentoId"]',
    'a.linkVisualizar',
    'a.linkDocumento',
    '.movimentacao a',
    '.andamento a',
    '.tree a',
    'tr a',
    'td a',
    'mat-card a',
    '.documento-link',
    'a[target="_blank"]'
  ];
  
  const elementos = document.querySelectorAll(seletores.join(','));
  console.log(`[Content] Encontrados ${elementos.length} elementos candidatos a link.`);
  
  for (const el of elementos) {
    let href = el.href;
    let texto = (el.innerText || el.textContent || '').trim();
    
    if (href && href.startsWith('/')) {
      href = window.location.origin + href;
    }
    
    if (href && href.startsWith('http') && !href.includes('login') && texto.length > 2) {
      if (!links.has(href)) {
        links.set(href, {
          url: href,
          titulo: texto.substring(0, 120),
          tipo: identificarTipoDocumento(texto, href)
        });
      }
    }
  }
  
  // 4. Se ainda não encontrou nada, busca dentro de iframes
  if (links.size === 0) {
    const iframes = document.querySelectorAll('iframe');
    for (const iframe of iframes) {
      try {
        const doc = iframe.contentDocument;
        if (doc) {
          const linksIframe = extrairLinksDoDocumento(doc);
          for (const link of linksIframe) {
            if (!links.has(link.url)) links.set(link.url, link);
          }
        }
      } catch(e) {}
    }
  }
  
  console.log(`[Content] Total final de links únicos: ${links.size}`);
  return Array.from(links.values());
}

function extrairLinksDoDocumento(doc) {
  const links = [];
  const elementos = doc.querySelectorAll('a[href]');
  for (const el of elementos) {
    let href = el.href;
    let texto = (el.innerText || '').trim();
    if (href && href.startsWith('http') && texto.length > 2) {
      links.push({
        url: href,
        titulo: texto.substring(0, 120),
        tipo: identificarTipoDocumento(texto, href)
      });
    }
  }
  return links;
}

// ============================================
// FUNÇÕES AUXILIARES (mantidas)
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
    if (el && el.innerText.length > melhorTexto.length) melhorTexto = el.innerText;
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
// LISTENER (com extração assíncrona)
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
        const links = await extrairLinksCompletos();
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

console.log('Juris Assistant - content script carregado (com rolagem e expansão total)');