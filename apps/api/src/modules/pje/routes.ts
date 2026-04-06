import { FastifyInstance } from 'fastify';
import { authenticate, getUserIdFromRequest } from '../../lib/auth';
import Database from 'better-sqlite3';

const db = new Database('juris_dev.db');

function padraoRespostaPJe(status: string, code: string, messages: string[], result: any, pageInfo?: any) {
  const response: any = { status, code, messages, result };
  if (pageInfo) response['page-info'] = pageInfo;
  return response;
}

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
  
  app.get('/api/v1/processos', { preHandler: authenticate }, async (request, reply) => {
    const userId = getUserIdFromRequest(request);
    const { page = 1, size = 10 } = request.query as any;
    
    const hasCredits = await checkCredits(userId, 1);
    if (!hasCredits) {
      return reply.status(402).send(padraoRespostaPJe('error', '402', ['Créditos insuficientes'], null));
    }
    
    const processos = [
      { id: 1, numero: "0001234-56.2024.5.02.0001", classe: "TRABALHISTA", dataDistribuicao: "2024-01-15", orgaoJulgador: "2ª Vara do Trabalho", valorCausa: 50000 }
    ];
    
    await consumeCredits(userId, 1);
    
    return reply.send(padraoRespostaPJe('ok', '200', [], processos, {
      current: parseInt(page), last: 1, size: parseInt(size), count: processos.length
    }));
  });
  
  app.post('/api/v1/processos:consultar', { preHandler: authenticate }, async (request, reply) => {
    const userId = getUserIdFromRequest(request);
    const { numero } = request.body as { numero: string };
    
    if (!numero) {
      return reply.status(400).send(padraoRespostaPJe('error', '400', ['Número do processo é obrigatório'], null));
    }
    
    const hasCredits = await checkCredits(userId, 2);
    if (!hasCredits) {
      return reply.status(402).send(padraoRespostaPJe('error', '402', ['Créditos insuficientes'], null));
    }
    
    const processo = {
      id: 1, numero: numero, classe: "TRABALHISTA", dataDistribuicao: "2024-01-15",
      orgaoJulgador: "2ª Vara do Trabalho", valorCausa: 50000,
      partes: [{ nome: "João Silva", tipo: "autor" }, { nome: "Empresa XYZ", tipo: "reu" }],
      movimentacoes: [
        { data: "2024-01-15", texto: "Petição inicial protocolada" },
        { data: "2024-01-20", texto: "Citação expedida" }
      ]
    };
    
    await consumeCredits(userId, 2);
    
    return reply.send(padraoRespostaPJe('ok', '200', [], { processo, creditsRemaining: 48 }));
  });
  
  app.get('/api/v1/health', async () => {
    return padraoRespostaPJe('ok', '200', [], { status: 'available', version: '2.0.0', tribunais: 24 });
  });
}