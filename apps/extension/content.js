// ============================================
// CONTENT.JS - Extrai TODO o conteúdo da página
// ============================================

// Função para aguardar a página carregar
function aguardarCarregamento() {
  return new Promise((resolve) => {
    // Verifica se já tem conteúdo
    if (document.body.innerText.length > 500) {
      resolve();
      return;
    }
    
    // Observa mudanças no DOM
    const observer = new MutationObserver(() => {
      if (document.body.innerText.length > 500) {
        observer.disconnect();
        resolve();
      }
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
    
    // Timeout de segurança
    setTimeout(() => {
      observer.disconnect();
      resolve();
    }, 10000);
  });
}

// Extrai o número do processo (se houver)
function extrairNumeroProcesso() {
  const text = document.body.innerText;
  const regex = /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/;
  const match = text.match(regex);
  return match ? match[0] : null;
}

// Extrai o título da página
function extrairTitulo() {
  return document.title || 'Sem título';
}

// Extrai a URL
function extrairUrl() {
  return window.location.href;
}

// EXTRAI TODO O TEXTO VISÍVEL DA PÁGINA
function extrairTextoVisivel() {
  // Remove scripts e estilos
  const clones = document.body.cloneNode(true);
  const scripts = clones.querySelectorAll('script, style, noscript');
  scripts.forEach(el => el.remove());
  
  // Pega o texto limpo
  let texto = clones.innerText || clones.textContent || '';
  
  // Limpa linhas vazias excessivas
  texto = texto.replace(/\n\s*\n\s*\n/g, '\n\n');
  
  return texto;
}

// Extrai todo o HTML da página (opcional)
function extrairHtml() {
  return document.documentElement.outerHTML;
}

// Extrai informações da página
function extrairMetadados() {
  const metadados = {};
  
  // Tenta pegar meta tags
  const metaTags = document.querySelectorAll('meta');
  metaTags.forEach(tag => {
    const name = tag.getAttribute('name') || tag.getAttribute('property');
    const content = tag.getAttribute('content');
    if (name && content) {
      metadados[name] = content;
    }
  });
  
  return metadados;
}

// Extrai links da página
function extrairLinks() {
  const links = [];
  const elementos = document.querySelectorAll('a[href]');
  elementos.forEach(el => {
    const href = el.href;
    const texto = el.innerText || '';
    if (href && !href.startsWith('javascript:')) {
      links.push({ texto: texto.substring(0, 100), url: href });
    }
  });
  return links.slice(0, 50); // Limita a 50 links
}

// Extrai imagens da página
function extrairImagens() {
  const imagens = [];
  const elementos = document.querySelectorAll('img[src]');
  elementos.forEach(el => {
    const src = el.src;
    if (src) {
      imagens.push(src);
    }
  });
  return imagens.slice(0, 20); // Limita a 20 imagens
}

// Função principal
async function extrairDadosCompletos() {
  console.log('🔄 Aguardando carregamento da página...');
  
  await aguardarCarregamento();
  
  console.log('📄 Extraindo todo o conteúdo da página...');
  
  const textoVisivel = extrairTextoVisivel();
  const html = extrairHtml();
  
  console.log(`✅ Texto extraído: ${textoVisivel.length} caracteres`);
  
  const dados = {
    // Informações básicas
    url: extrairUrl(),
    titulo: extrairTitulo(),
    numeroProcesso: extrairNumeroProcesso(),
    dataExtracao: new Date().toISOString(),
    
    // Conteúdo
    textoCompleto: textoVisivel,
    html: html.substring(0, 50000), // Limita para não sobrecarregar
    
    // Metadados
    metadados: extrairMetadados(),
    
    // Links e imagens
    links: extrairLinks(),
    imagens: extrairImagens(),
    
    // Estatísticas
    estatisticas: {
      tamanhoTexto: textoVisivel.length,
      tamanhoHtml: html.length,
      numeroLinks: extrairLinks().length,
      numeroImagens: extrairImagens().length
    }
  };
  
  return dados;
}

// Listener para mensagens
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extrairProcesso') {
    extrairDadosCompletos().then(dados => {
      sendResponse(dados);
    }).catch(err => {
      console.error('Erro:', err);
      sendResponse({ error: err.message });
    });
    return true;
  }
});

console.log('🚀 Juris Assistant - Content script carregado (extração total da página)');