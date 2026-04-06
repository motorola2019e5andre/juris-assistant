import axios from 'axios';

// Configuração dos tribunais
const TRIBUNALS = {
  'trt1': { name: 'TRT 1ª Região (RJ)', url: 'https://pje.trt1.jus.br/pje-api', grau: '1' },
  'trt2': { name: 'TRT 2ª Região (SP)', url: 'https://pje.trt2.jus.br/pje-api', grau: '1' },
  'trt3': { name: 'TRT 3ª Região (MG)', url: 'https://pje.trt3.jus.br/pje-api', grau: '1' },
  'trt4': { name: 'TRT 4ª Região (RS)', url: 'https://pje.trt4.jus.br/pje-api', grau: '1' },
  'trt5': { name: 'TRT 5ª Região (BA)', url: 'https://pje.trt5.jus.br/pje-api', grau: '1' },
  'trt6': { name: 'TRT 6ª Região (PE)', url: 'https://pje.trt6.jus.br/pje-api', grau: '1' },
  'trt7': { name: 'TRT 7ª Região (CE)', url: 'https://pje.trt7.jus.br/pje-api', grau: '1' },
  'trt8': { name: 'TRT 8ª Região (PA/AP)', url: 'https://pje.trt8.jus.br/pje-api', grau: '1' },
  'trt9': { name: 'TRT 9ª Região (PR)', url: 'https://pje.trt9.jus.br/pje-api', grau: '1' },
  'trt10': { name: 'TRT 10ª Região (DF/TO)', url: 'https://pje.trt10.jus.br/pje-api', grau: '1' },
  'trt11': { name: 'TRT 11ª Região (AM/RR)', url: 'https://pje.trt11.jus.br/pje-api', grau: '1' },
  'trt12': { name: 'TRT 12ª Região (SC)', url: 'https://pje.trt12.jus.br/pje-api', grau: '1' },
  'trt13': { name: 'TRT 13ª Região (PB)', url: 'https://pje.trt13.jus.br/pje-api', grau: '1' },
  'trt14': { name: 'TRT 14ª Região (RO/AC)', url: 'https://pje.trt14.jus.br/pje-api', grau: '1' },
  'trt15': { name: 'TRT 15ª Região (SP)', url: 'https://pje.trt15.jus.br/pje-api', grau: '1' },
  'trt16': { name: 'TRT 16ª Região (MA)', url: 'https://pje.trt16.jus.br/pje-api', grau: '1' },
  'trt17': { name: 'TRT 17ª Região (ES)', url: 'https://pje.trt17.jus.br/pje-api', grau: '1' },
  'trt18': { name: 'TRT 18ª Região (GO)', url: 'https://pje.trt18.jus.br/pje-api', grau: '1' },
  'trt19': { name: 'TRT 19ª Região (AL)', url: 'https://pje.trt19.jus.br/pje-api', grau: '1' },
  'trt20': { name: 'TRT 20ª Região (SE)', url: 'https://pje.trt20.jus.br/pje-api', grau: '1' },
  'trt21': { name: 'TRT 21ª Região (RN)', url: 'https://pje.trt21.jus.br/pje-api', grau: '1' },
  'trt22': { name: 'TRT 22ª Região (PI)', url: 'https://pje.trt22.jus.br/pje-api', grau: '1' },
  'trt23': { name: 'TRT 23ª Região (MT)', url: 'https://pje.trt23.jus.br/pje-api', grau: '1' },
  'trt24': { name: 'TRT 24ª Região (MS)', url: 'https://pje.trt24.jus.br/pje-api', grau: '1' },
  'tst': { name: 'TST', url: 'https://pje.tst.jus.br/pje-api', grau: '2' }
};

// Interface do processo
export interface ProcessoInfo {
  id: number;
  numero: string;
  classe: string;
  assuntos: string[];
  dataDistribuicao: string;
  orgaoJulgador: string;
  valorCausa: number;
  segredoJustica: boolean;
  justicaGratuita: boolean;
}

// Interface da movimentação
export interface Movimentacao {
  data: string;
  texto: string;
  tipo: string;
  usuario: string;
}

// Interface da parte
export interface Parte {
  nome: string;
  tipo: 'autor' | 'reu' | 'advogado';
  documento: string;
}

/**
 * Busca processo pelo número
 */
export async function buscarProcesso(numero: string, tribunal: string): Promise<ProcessoInfo> {
  const tribunalInfo = TRIBUNALS[tribunal as keyof typeof TRIBUNALS];
  if (!tribunalInfo) {
    throw new Error(`Tribunal ${tribunal} não suportado`);
  }
  
  try {
    // Busca o processo pelo número
    const response = await axios.get(`${tribunalInfo.url}/api/v1/processos`, {
      params: {
        filter: JSON.stringify({ numero: { eq: numero } })
      },
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.status === 'error') {
      throw new Error(response.data.messages?.join(', ') || 'Erro ao buscar processo');
    }
    
    const processo = response.data.result[0];
    if (!processo) {
      throw new Error('Processo não encontrado');
    }
    
    return {
      id: processo.id,
      numero: processo.numero,
      classe: processo.classe?.nome || 'Não informada',
      assuntos: processo.assuntos?.map((a: any) => a.nome) || [],
      dataDistribuicao: processo.dataDistribuicao,
      orgaoJulgador: processo.orgaoJulgador?.nome || 'Não informado',
      valorCausa: processo.valorCausa || 0,
      segredoJustica: processo.segredoJustica || false,
      justicaGratuita: processo.justicaGratuita || false
    };
  } catch (error: any) {
    if (error.response?.status === 404) {
      throw new Error('Processo não encontrado neste tribunal');
    }
    throw new Error(error.message || 'Erro ao conectar com o tribunal');
  }
}

/**
 * Busca movimentações do processo
 */
export async function buscarMovimentacoes(processoId: number, tribunal: string): Promise<Movimentacao[]> {
  const tribunalInfo = TRIBUNALS[tribunal as keyof typeof TRIBUNALS];
  
  try {
    const response = await axios.get(`${tribunalInfo.url}/api/v1/processos/${processoId}/movimentacoes`, {
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.status === 'error') {
      return [];
    }
    
    return (response.data.result || []).map((m: any) => ({
      data: m.data,
      texto: m.texto,
      tipo: m.tipo || 'movimentacao',
      usuario: m.usuario || 'Sistema'
    }));
  } catch (error) {
    return [];
  }
}

/**
 * Busca partes do processo
 */
export async function buscarPartes(processoId: number, tribunal: string): Promise<Parte[]> {
  const tribunalInfo = TRIBUNALS[tribunal as keyof typeof TRIBUNALS];
  
  try {
    const response = await axios.get(`${tribunalInfo.url}/api/v1/processos/${processoId}/partes`, {
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.status === 'error') {
      return [];
    }
    
    return (response.data.result || []).map((p: any) => ({
      nome: p.nome,
      tipo: p.tipo,
      documento: p.documento || ''
    }));
  } catch (error) {
    return [];
  }
}

/**
 * Gera resumo formatado das movimentações
 */
export function gerarResumoMovimentacoes(movimentacoes: Movimentacao[]): string {
  if (!movimentacoes || movimentacoes.length === 0) {
    return 'Não há movimentações recentes neste processo.';
  }
  
  const ultimas = movimentacoes.slice(-8);
  return ultimas.map(m => `📅 ${m.data}\n📌 ${m.texto}\n`).join('\n');
}

/**
 * Gera resumo completo para análise da IA
 */
export function gerarContextoParaIA(processo: ProcessoInfo, movimentacoes: Movimentacao[], partes: Parte[]): string {
  const partesTexto = partes.map(p => `${p.tipo === 'autor' ? '👤 Autor' : p.tipo === 'reu' ? '🏢 Réu' : '⚖️ Advogado'}: ${p.nome}`).join('\n');
  
  return `
PROCESSO:
Número: ${processo.numero}
Classe: ${processo.classe}
Data de Distribuição: ${processo.dataDistribuicao}
Órgão Julgador: ${processo.orgaoJulgador}
Valor da Causa: R$ ${processo.valorCausa.toLocaleString('pt-BR')}
Justiça Gratuita: ${processo.justicaGratuita ? 'Sim' : 'Não'}

PARTES:
${partesTexto}

ÚLTIMAS MOVIMENTAÇÕES:
${movimentacoes.slice(-5).map(m => `${m.data}: ${m.texto}`).join('\n')}
`;
}

export default { buscarProcesso, buscarMovimentacoes, buscarPartes, gerarResumoMovimentacoes, gerarContextoParaIA };