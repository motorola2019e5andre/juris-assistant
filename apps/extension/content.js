// ============================================
// CONTENT.JS - Leitura completa do processo
// Versão universal para TST e todos os TRTs
// ============================================

// Extrai o número do processo
function extrairNumeroProcesso() {
  const text = document.body.innerText;
  const regex = /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/;
  const match = text.match(regex);
  return match ? match[0] : null;
}

// Extrai tribunal baseado na URL
function extrairTribunal() {
  const url = window.location.href;
  if (url.includes('pje.tst.jus.br')) return 'TST';
  if (url.includes('pje.trt1')) return 'TRT 1ª Região (RJ)';
  if (url.includes('pje.trt2')) return 'TRT 2ª Região (SP)';
  if (url.includes('pje.trt3')) return 'TRT 3ª Região (MG)';
  if (url.includes('pje.trt4')) return 'TRT 4ª Região (RS)';
  if (url.includes('pje.trt5')) return 'TRT 5ª Região (BA)';
  if (url.includes('pje.trt6')) return 'TRT 6ª Região (PE)';
  if (url.includes('pje.trt7')) return 'TRT 7ª Região (CE)';
  if (url.includes('pje.trt8')) return 'TRT 8ª Região (PA/AP)';
  if (url.includes('pje.trt9')) return 'TRT 9ª Região (PR)';
  if (url.includes('pje.trt10')) return 'TRT 10ª Região (DF/TO)';
  if (url.includes('pje.trt11')) return 'TRT 11ª Região (AM/RR)';
  if (url.includes('pje.trt12')) return 'TRT 12ª Região (SC)';
  if (url.includes('pje.trt13')) return 'TRT 13ª Região (PB)';
  if (url.includes('pje.trt14')) return 'TRT 14ª Região (RO/AC)';
  if (url.includes('pje.trt15')) return 'TRT 15ª Região (SP)';
  if (url.includes('pje.trt16')) return 'TRT 16ª Região (MA)';
  if (url.includes('pje.trt17')) return 'TRT 17ª Região (ES)';
  if (url.includes('pje.trt18')) return 'TRT 18ª Região (GO)';
  if (url.includes('pje.trt19')) return 'TRT 19ª Região (AL)';
  if (url.includes('pje.trt20')) return 'TRT 20ª Região (SE)';
  if (url.includes('pje.trt21')) return 'TRT 21ª Região (RN)';
  if (url.includes('pje.trt22')) return 'TRT 22ª Região (PI)';
  if (url.includes('pje.trt23')) return 'TRT 23ª Região (MT)';
  if (url.includes('pje.trt24')) return 'TRT 24ª Região (MS)';
  return 'Tribunal não identificado';
}

// Extrai informações das partes
function extrairPartes() {
  const partes = { reclamante: '', reclamado: '', autores: [], reus: [] };
  const text = document.body.innerText;
  
  const reclamanteMatch = text.match(/RECLAMANTE:?\s*([^\n]+)/i);
  const reclamadoMatch = text.match(/RECLAMADO:?\s*([^\n]+)/i);
  const autorMatch = text.match(/AUTOR:?\s*([^\n]+)/i);
  const reuMatch = text.match(/RÉU:?\s*([^\n]+)/i);
  
  if (reclamanteMatch) partes.reclamante = reclamanteMatch[1].trim();
  if (reclamadoMatch) partes.reclamado = reclamadoMatch[1].trim();
  if (autorMatch) partes.autores.push(autorMatch[1].trim());
  if (reuMatch) partes.reus.push(reuMatch[1].trim());
  
  return partes;
}

// Extrai todas as movimentações do processo
function extrairMovimentacoes() {
  const movimentacoes = [];
  const selectores = [
    '.movimentacao', '.movement', '.andamento',
    '.timeline', '.historico', '.movimentacoes',
    'table tbody tr', 'div[id*="movimentacao"]'
  ];
  
  for (const sel of selectores) {
    const elementos = document.querySelectorAll(sel);
    for (const el of elementos) {
      const texto = el.innerText || el.textContent || '';
      if (texto.length > 30) {
        movimentacoes.push(texto);
      }
    }
  }
  
  return movimentacoes;
}

// Extrai todos os documentos do processo (Sentença, Petições, Decisões)
function extrairDocumentos() {
  const documentos = [];
  const text = document.body.innerText;
  
  // Padrões para identificar documentos
  const padroes = [
    { nome: 'SENTENÇA', regex: /SENTENÇA[\s\S]*?(?=PODER JUDICIÁRIO|JUSTIÇA DO TRABALHO|\n\d+\.\s|\f|$)/i },
    { nome: 'DECISÃO', regex: /DECISÃO[\s\S]*?(?=PODER JUDICIÁRIO|JUSTIÇA DO TRABALHO|\n\d+\.\s|\f|$)/i },
    { nome: 'DESPACHO', regex: /DESPACHO[\s\S]*?(?=PODER JUDICIÁRIO|JUSTIÇA DO TRABALHO|\n\d+\.\s|\f|$)/i },
    { nome: 'PETIÇÃO INICIAL', regex: /PETIÇÃO INICIAL[\s\S]*?(?=PODER JUDICIÁRIO|JUSTIÇA DO TRABALHO|\n\d+\.\s|\f|$)/i },
    { nome: 'CONTESTAÇÃO', regex: /CONTESTAÇÃO[\s\S]*?(?=PODER JUDICIÁRIO|JUSTIÇA DO TRABALHO|\n\d+\.\s|\f|$)/i },
    { nome: 'RECURSO ORDINÁRIO', regex: /RECURSO ORDINÁRIO[\s\S]*?(?=PODER JUDICIÁRIO|JUSTIÇA DO TRABALHO|\n\d+\.\s|\f|$)/i },
    { nome: 'RECURSO DE REVISTA', regex: /RECURSO DE REVISTA[\s\S]*?(?=PODER JUDICIÁRIO|JUSTIÇA DO TRABALHO|\n\d+\.\s|\f|$)/i },
    { nome: 'ACÓRDÃO', regex: /ACÓRDÃO[\s\S]*?(?=PODER JUDICIÁRIO|JUSTIÇA DO TRABALHO|\n\d+\.\s|\f|$)/i }
  ];
  
  for (const padrao of padroes) {
    const match = text.match(padrao.regex);
    if (match && match[0].length > 200) {
      documentos.push({ 
        tipo: padrao.nome, 
        texto: match[0].substring(0, 8000) 
      });
    }
  }
  
  // Se não encontrou documentos específicos, tenta pegar o texto principal
  if (documentos.length === 0) {
    const mainContent = document.querySelector('main, .conteudo, .content, #conteudo');
    if (mainContent) {
      documentos.push({ 
        tipo: 'CONTEÚDO PRINCIPAL', 
        texto: mainContent.innerText.substring(0, 8000) 
      });
    }
  }
  
  return documentos;
}

// Extrai o valor da causa
function extrairValorCausa() {
  const text = document.body.innerText;
  const valorMatch = text.match(/VALOR DA CAUSA:?\s*R?\$?\s*([\d\.,]+)/i);
  return valorMatch ? valorMatch[1] : null;
}

// Extrai a classe do processo
function extrairClasse() {
  const text = document.body.innerText;
  const classeMatch = text.match(/CLASSE:?\s*([^\n]+)/i);
  return classeMatch ? classeMatch[1].trim() : null;
}

// Extrai a data de distribuição
function extrairDataDistribuicao() {
  const text = document.body.innerText;
  const dataMatch = text.match(/DISTRIBUIÇÃO:?\s*([\d\/]+)/i);
  return dataMatch ? dataMatch[1] : null;
}

// Extrai o órgão julgador
function extrairOrgaoJulgador() {
  const text = document.body.innerText;
  const orgaoMatch = text.match(/ÓRGÃO JULGADOR:?\s*([^\n]+)/i);
  return orgaoMatch ? orgaoMatch[1].trim() : null;
}

// Função principal de extração completa
function extrairDadosCompletos() {
  console.log('🔄 Extraindo dados completos do processo...');
  
  const dados = {
    numero: extrairNumeroProcesso(),
    tribunal: extrairTribunal(),
    partes: extrairPartes(),
    classe: extrairClasse(),
    dataDistribuicao: extrairDataDistribuicao(),
    orgaoJulgador: extrairOrgaoJulgador(),
    valorCausa: extrairValorCausa(),
    movimentacoes: extrairMovimentacoes(),
    documentos: extrairDocumentos(),
    url: window.location.href,
    titulo: document.title,
    dataExtracao: new Date().toISOString()
  };
  
  console.log(`✅ Extraído: ${dados.movimentacoes.length} movimentações, ${dados.documentos.length} documentos`);
  return dados;
}

// Listener para mensagens
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extrairProcesso') {
    const dados = extrairDadosCompletos();
    sendResponse(dados);
    return true;
  }
});

console.log('🚀 Juris Assistant - Content script de leitura completa carregado');