// ============================================
// CONTENT.JS - Extrai dados das páginas do PJe
// Versão simplificada
// ============================================

function extrairNumeroProcesso() {
  // Procura em toda a página
  const text = document.body.innerText;
  
  // Padrão PJe: 0001234-56.2024.5.02.0001
  const regex = /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/;
  const match = text.match(regex);
  
  if (match) {
    console.log('✅ Número do processo encontrado:', match[0]);
    return match[0];
  }
  
  console.log('⚠️ Número do processo não encontrado');
  return null;
}

function extrairAndamento() {
  // Seletores comuns do PJe (mais abrangentes)
  const selectores = [
    '.movimentacao', '.movement', '.andamento',
    '.timeline', '.historico', '.movimentacoes',
    '.tabela-movimentacoes', 'table tbody tr',
    '.card-body', '.panel-body', '#movimentacoes'
  ];
  
  for (const sel of selectores) {
    const elementos = document.querySelectorAll(sel);
    for (const el of elementos) {
      const texto = el.innerText || el.textContent || '';
      if (texto.length > 50) {
        console.log('✅ Andamento encontrado no seletor:', sel);
        return texto;
      }
    }
  }
  
  // Fallback: pega todo o texto da página
  console.log('⚠️ Nenhum andamento específico encontrado, pegando texto da página');
  return document.body.innerText.substring(0, 3000);
}

function extrairTribunal() {
  const url = window.location.href;
  
  if (url.includes('pje.tst.jus.br')) return 'TST';
  if (url.includes('pje.trt1.jus.br')) return 'TRT 1ª Região (RJ)';
  if (url.includes('pje.trt2.jus.br')) return 'TRT 2ª Região (SP)';
  if (url.includes('pje.trt3.jus.br')) return 'TRT 3ª Região (MG)';
  if (url.includes('pje.trt4.jus.br')) return 'TRT 4ª Região (RS)';
  if (url.includes('pje.trt15.jus.br')) return 'TRT 15ª Região (SP)';
  if (url.includes('pje.trt18.jus.br')) return 'TRT 18ª Região (GO)';
  
  return 'Tribunal não identificado';
}

function extrairDadosCompletos() {
  console.log('🔄 Extraindo dados da página...');
  
  const dados = {
    numero: extrairNumeroProcesso(),
    andamento: extrairAndamento(),
    tribunal: extrairTribunal(),
    url: window.location.href,
    titulo: document.title
  };
  
  console.log('📋 Dados extraídos:', dados);
  return dados;
}

// Ouvir mensagens da extensão
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extrairProcesso') {
    const dados = extrairDadosCompletos();
    sendResponse(dados);
    return true;
  }
});

console.log('🚀 Juris Assistant - Content script carregado!');