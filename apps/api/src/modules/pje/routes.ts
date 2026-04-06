import { FastifyInstance } from 'fastify';
import { authenticate, getUserIdFromRequest } from '../../lib/auth';
import { buscarProcesso, buscarMovimentacoes, buscarPartes, gerarResumoMovimentacoes, gerarContextoParaIA } from '../../services/pje-api';
import Database from 'better-sqlite3';

const db = new Database('juris_dev.db');

async function checkCredits(userId: string, required: number): Promise<boolean> {
  const stmt = db.prepare('SELECT credits FROM users WHERE id = ?');
  const result = stmt.get(userId);
  return result ? (result as any).credits >= required : false;
}

async function consumeCredits(userId: string, amount: number): Promise<void> {
  const stmt = db.prepare('UPDATE users SET credits = credits - ? WHERE id = ?');
  stmt.run(amount, userId);
}

export default async function pjeRoutes(app: FastifyInstance) {
  
  // Buscar processo pelo número
  app.post('/pje/consultar', { preHandler: authenticate }, async (request, reply) => {
    const userId = getUserIdFromRequest(request);
    const { numero, tribunal } = request.body as { numero: string; tribunal: string };
    
    if (!numero || !tribunal) {
      return reply.status(400).send({ error: 'Número do processo e tribunal são obrigatórios' });
    }
    
    // Verifica créditos (2 créditos por consulta)
    const hasCredits = await checkCredits(userId, 2);
    if (!hasCredits) {
      return reply.status(402).send({ error: 'Créditos insuficientes. São necessários 2 créditos para consultar um processo.' });
    }
    
    try {
      // Busca dados do processo
      const processo = await buscarProcesso(numero, tribunal);
      const movimentacoes = await buscarMovimentacoes(processo.id, tribunal);
      const partes = await buscarPartes(processo.id, tribunal);
      
      // Gera resumo formatado
      const resumoMovimentacoes = gerarResumoMovimentacoes(movimentacoes);
      const contextoIA = gerarContextoParaIA(processo, movimentacoes, partes);
      
      // Consome créditos
      await consumeCredits(userId, 2);
      
      // Busca créditos restantes
      const user = db.prepare('SELECT credits FROM users WHERE id = ?').get(userId);
      const remainingCredits = user ? (user as any).credits : 0;
      
      return reply.send({
        success: true,
        processo: {
          numero: processo.numero,
          classe: processo.classe,
          dataDistribuicao: processo.dataDistribuicao,
          orgaoJulgador: processo.orgaoJulgador,
          valorCausa: processo.valorCausa,
          segredoJustica: processo.segredoJustica,
          justicaGratuita: processo.justicaGratuita
        },
        partes: partes.map(p => ({ nome: p.nome, tipo: p.tipo })),
        movimentacoes: movimentacoes.slice(-10).map(m => ({ data: m.data, texto: m.texto })),
        resumoMovimentacoes: resumoMovimentacoes,
        contextoIA: contextoIA,
        creditsRemaining: remainingCredits
      });
      
    } catch (error: any) {
      console.error('Erro na consulta PJe:', error);
      return reply.status(500).send({ error: error.message || 'Erro ao consultar processo' });
    }
  });
  
  // Health check do serviço PJe
  app.get('/pje/health', async (request, reply) => {
    return reply.send({ 
      status: 'ok', 
      tribunais: Object.keys(require('../../services/pje-api').TRIBUNALS || {}),
      message: 'Serviço PJe disponível'
    });
  });
}