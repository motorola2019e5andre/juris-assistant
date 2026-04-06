import { FastifyInstance } from 'fastify';
import { authenticate, getUserIdFromRequest } from '../../lib/auth';
import { findUserByEmail, updateUserCredits, getUserRole } from '../../lib/db';
import { z } from 'zod';

const summarizeSchema = z.object({
  text: z.string().min(10).max(10000),
});

async function checkCredits(userId: string, required: number): Promise<boolean> {
  const user = findUserByEmail(userId);
  return user ? (user as any).credits >= required : false;
}

async function consumeCredits(userId: string, amount: number): Promise<void> {
  const user = findUserByEmail(userId);
  if (user) {
    const currentCredits = (user as any).credits;
    updateUserCredits(userId, currentCredits - amount);
  }
}

// MOCK - Resumo para cliente
async function mockSummarizeClient(text: string, role: string): Promise<string> {
  const lado = role === 'reclamante' ? 'trabalhador' : 'empresa';
  return `RESUMO PARA CLIENTE (${role === 'reclamante' ? 'Reclamante' : 'Reclamada'}):

Seu processo esta em andamento. O juiz analisou os autos e determinou as providencias necessarias.

Seu advogado esta acompanhando todas as movimentacoes e tomara as medidas cabiveis para defender os interesses do ${lado}.

Proximo passo: Aguardar nova movimentacao processual.`;
}

// MOCK - Resumo técnico
async function mockSummarizeTechnical(text: string, role: string): Promise<string> {
  const estrategia = role === 'reclamante' 
    ? 'Fortalecer a tese do reclamante, juntar documentos comprobatorios.'
    : 'Contestar veementemente, buscar provas em contrario.';
  
  return `RESUMO TECNICO (${role === 'reclamante' ? 'Reclamante' : 'Reclamada'}):

1. O QUE FOI DECIDIDO: Analise processual em andamento.
2. PRAZO: Aguardar proxima movimentacao.
3. RISCO: Baixo.
4. ESTRATEGIA RECOMENDADA: ${estrategia}
5. PROXIMA PECA: Peticao de acompanhamento.`;
}

// MOCK - Assistente de petição
async function mockDraftPetition(text: string, role: string): Promise<string> {
  return `ASSISTENTE DE PETICAO (${role === 'reclamante' ? 'Reclamante' : 'Reclamada'}):

EXCELENTISSIMO SENHOR DOUTOR JUIZ DA ___ VARA DO TRABALHO

Processo nº: [Numero do processo]

1. DOS FATOS
${role === 'reclamante' ? 'O reclamante trabalhava na empresa re...' : 'O reclamante alega fatos que nao condizem com a realidade...'}

2. DA FUNDAMENTACAO
- Violacao da CLT
- Jurisprudencia aplicavel

3. DOS PEDIDOS
- Pagamento de verbas rescisorias
- Horas extras e reflexos

4. DAS PROVAS
Requer a producao de todos os meios de prova.

5. DO VALOR DA CAUSA
Da-se a causa o valor de R$ [valor estimado].

Nestes termos, pede deferimento.`;
}

export default async function aiRoutes(app: FastifyInstance) {
  
  // 1. Resumo para cliente (1 credito)
  app.post('/summarize-client', { preHandler: authenticate }, async (request, reply) => {
    const userId = getUserIdFromRequest(request);
    const { text } = summarizeSchema.parse(request.body);
    const role = getUserRole(userId);

    const hasCredits = await checkCredits(userId, 1);
    if (!hasCredits) {
      return reply.status(402).send({ error: 'Creditos insuficientes' });
    }

    const result = await mockSummarizeClient(text, role);
    await consumeCredits(userId, 1);

    const user = findUserByEmail(userId);
    const remainingCredits = user ? (user as any).credits : 0;
    
    return reply.send({ result, creditsRemaining: remainingCredits, role });
  });
  
  // 2. Resumo tecnico (1 credito)
  app.post('/summarize-technical', { preHandler: authenticate }, async (request, reply) => {
    const userId = getUserIdFromRequest(request);
    const { text } = summarizeSchema.parse(request.body);
    const role = getUserRole(userId);

    const hasCredits = await checkCredits(userId, 1);
    if (!hasCredits) {
      return reply.status(402).send({ error: 'Creditos insuficientes' });
    }

    const result = await mockSummarizeTechnical(text, role);
    await consumeCredits(userId, 1);

    const user = findUserByEmail(userId);
    const remainingCredits = user ? (user as any).credits : 0;
    
    return reply.send({ result, creditsRemaining: remainingCredits, role });
  });
  
  // 3. Assistente de peticao (1 credito)
  app.post('/draft-petition', { preHandler: authenticate }, async (request, reply) => {
    const userId = getUserIdFromRequest(request);
    const { text } = summarizeSchema.parse(request.body);
    const role = getUserRole(userId);

    const hasCredits = await checkCredits(userId, 1);
    if (!hasCredits) {
      return reply.status(402).send({ error: 'Creditos insuficientes' });
    }

    const result = await mockDraftPetition(text, role);
    await consumeCredits(userId, 1);

    const user = findUserByEmail(userId);
    const remainingCredits = user ? (user as any).credits : 0;
    
    return reply.send({ result, creditsRemaining: remainingCredits, role });
  });
}