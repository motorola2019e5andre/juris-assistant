// ============================================
// CONTENT.JS - Extrai dados das páginas do PJe
// ============================================

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
  const tribunais = {
    'pje.tst.jus.br': 'TST',
    'pje.trt1.jus.br': 'TRT 1ª Regiao (RJ)',
    'pje.trt2.jus.br': 'TRT 2ª Regiao (SP)',
    'pje.trt3.jus.br': 'TRT 3ª Regiao (MG)',
    'pje.trt4.jus.br': 'TRT 4ª Regiao (RS)',
    'pje.trt5.jus.br': 'TRT 5ª Regiao (BA)',
    'pje.trt6.jus.br': 'TRT 6ª Regiao (PE)',
    'pje.trt7.jus.br': 'TRT 7ª Regiao (CE)',
    'pje.trt8.jus.br': 'TRT 8ª Regiao (PA/AP)',
    'pje.trt9.jus.br': 'TRT 9ª Regiao (PR)',
    'pje.trt10.jus.br': 'TRT 10ª Regiao (DF/TO)',
    'pje.trt11.jus.br': 'TRT 11ª Regiao (AM/RR)',
    'pje.trt12.jus.br': 'TRT 12ª Regiao (SC)',
    'pje.trt13.jus.br': 'TRT 13ª Regiao (PB)',
    'pje.trt14.jus.br': 'TRT 14ª Regiao (RO/AC)',
    'pje.trt15.jus.br': 'TRT 15ª Regiao (SP)',
    'pje.trt16.jus.br': 'TRT 16ª Regiao (MA)',
    'pje.trt17.jus.br': 'TRT 17ª Regiao (ES)',
    'pje.trt18.jus.br': 'TRT 18ª Regiao (GO)',
    'pje.trt19.jus.br': 'TRT 19ª Regiao (AL)',
    'pje.trt20.jus.br': 'TRT 20ª Regiao (SE)',
    'pje.trt21.jus.br': 'TRT 21ª Regiao (RN)',
    'pje.trt22.jus.br': 'TRT 22ª Regiao (PI)',
    'pje.trt23.jus.br': 'TRT 23ª Regiao (MT)',
    'pje.trt24.jus.br': 'TRT 24ª Regiao (MS)'
  };
  for (const [domain, name] of Object.entries(tribunais)) {
    if (url.includes(domain)) return name;
  }
  return 'Tribunal nao identificado';
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