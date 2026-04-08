function extrairNumeroProcesso() {
  const text = document.body.innerText;
  const regex = /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/;
  const match = text.match(regex);
  return match ? match[0] : null;
}

function extrairAndamento() {
  const selectores = [
    '.movimentacao', '.movement', '.andamento',
    '.timeline', '.historico', '.movimentacoes'
  ];
  
  for (const sel of selectores) {
    const elem = document.querySelector(sel);
    if (elem && elem.innerText.length > 50) {
      return elem.innerText;
    }
  }
  return document.body.innerText.substring(0, 3000);
}

function extrairTribunal() {
  const url = window.location.href;
  if (url.includes('pje.tst.jus.br')) return 'TST';
  if (url.includes('pje.trt1')) return 'TRT 1ª Região (RJ)';
  if (url.includes('pje.trt2')) return 'TRT 2ª Região (SP)';
  if (url.includes('pje.trt3')) return 'TRT 3ª Região (MG)';
  if (url.includes('pje.trt4')) return 'TRT 4ª Região (RS)';
  if (url.includes('pje.trt15')) return 'TRT 15ª Região (SP)';
  if (url.includes('pje.trt18')) return 'TRT 18ª Região (GO)';
  return 'Tribunal não identificado';
}

function extrairDadosCompletos() {
  return {
    numero: extrairNumeroProcesso(),
    andamento: extrairAndamento(),
    tribunal: extrairTribunal(),
    url: window.location.href,
    titulo: document.title
  };
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extrairProcesso') {
    sendResponse(extrairDadosCompletos());
    return true;
  }
});