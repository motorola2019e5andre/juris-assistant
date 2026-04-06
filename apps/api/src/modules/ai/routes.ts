import { FastifyInstance } from 'fastify';
import { authenticate, getUserIdFromRequest } from '../../lib/auth';
import { z } from 'zod';
import Database from 'better-sqlite3';

const db = new Database('juris_dev.db');

const summarizeSchema = z.object({
  text: z.string().min(10).max(10000),
});

async function checkCredits(userId: string, required: number): Promise<boolean> {
  const stmt = db.prepare('SELECT credits FROM users WHERE id = ?');
  const result = stmt.get(userId);
  return result ? (result as any).credits >= required : false;
}

async function consumeCredits(userId: string, amount: number): Promise<void> {
  const stmt = db.prepare('UPDATE users SET credits = credits - ? WHERE id = ?');
  stmt.run(amount, userId);
}

// ============================================
// MOCK - Respostas simuladas (sem OpenAI)
// ============================================

async function mockSummarizeClient(text: string): Promise<string> {
  return `📋 RESUMO PARA CLIENTE:

Seu processo está em andamento. O juiz analisou os autos e determinou as providências necessárias.

Seu advogado está acompanhando todas as movimentações e tomará as medidas cabíveis para defender seus interesses.

📌 Próximo passo: Aguardar nova movimentação processual.

🔔 Qualquer novidade será comunicada imediatamente.`;
}

async function mockSummarizeTechnical(text: string): Promise<string> {
  return `📊 RESUMO TÉCNICO COM ESTRATÉGIA:

**1. O QUE FOI DECIDIDO:** Análise processual em andamento.

**2. PRAZO:** Aguardar próxima movimentação.

**3. RISCO PARA O CLIENTE:** Baixo - sem decisão desfavorável até o momento.

**4. ESTRATÉGIA RECOMENDADA:** Acompanhar o processo e aguardar nova decisão.

**5. PRÓXIMA PEÇA:** Petição de acompanhamento (se necessário).`;
}

async function mockDraftPetition(text: string): Promise<string> {
  return `📝 ASSISTENTE DE PETIÇÃO - ESQUELETO:

EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DA ___ VARA DO TRABALHO

**Processo nº:** [Número do processo]

**Reclamante:** [Nome do cliente]
**Reclamado:** [Nome da empresa]

**1. DOS FATOS**
O reclamante trabalhava na empresa ré no período de [data] a [data], na função de [função].

**2. DA FUNDAMENTAÇÃO**
- Violação da CLT, art. [artigo]
- Súmula [número] do TST
- Jurisprudência aplicável

**3. DOS PEDIDOS**
- Pagamento de verbas rescisórias
- Horas extras e reflexos
- Danos morais
- Justiça gratuita

**4. DAS PROVAS**
Requer a produção de todos os meios de prova em direito admitidos.

**5. DO VALOR DA CAUSA**
Dá-se à causa o valor de R$ [valor estimado].

Nestes termos, pede deferimento.

[Local], [data]
[Advogado] - OAB/UF nº [número]`;
}

// ============================================
// ROTAS DA API (USANDO MOCK)
// ============================================

export default async function aiRoutes(app: FastifyInstance) {
  
  // 1. Resumo para cliente
  app.post('/summarize-client', { preHandler: authenticate }, async (request, reply) => {
    const userId = getUserIdFromRequest(request);
    const { text } = summarizeSchema.parse(request.body);

    const hasCredits = await checkCredits(userId, 1);
    if (!hasCredits) {
      return reply.status(402).send({ error: 'Créditos insuficientes' });
    }

    const result = await mockSummarizeClient(text);
    await consumeCredits(userId, 1);

    const stmt = db.prepare('SELECT credits FROM users WHERE id = ?');
    const user = stmt.get(userId);
    const remainingCredits = user ? (user as any).credits : 0;
    
    return reply.send({ result, creditsRemaining: remainingCredits });
  });

  // 2. Resumo técnico com estratégia
  app.post('/summarize-technical', { preHandler: authenticate }, async (request, reply) => {
    const userId = getUserIdFromRequest(request);
    const { text } = summarizeSchema.parse(request.body);

    const hasCredits = await checkCredits(userId, 2);
    if (!hasCredits) {
      return reply.status(402).send({ error: 'Créditos insuficientes' });
    }

    const result = await mockSummarizeTechnical(text);
    await consumeCredits(userId, 2);

    const stmt = db.prepare('SELECT credits FROM users WHERE id = ?');
    const user = stmt.get(userId);
    const remainingCredits = user ? (user as any).credits : 0;
    
    return reply.send({ result, creditsRemaining: remainingCredits });
  });

  // 3. Assistente de petição
  app.post('/draft-petition', { preHandler: authenticate }, async (request, reply) => {
    const userId = getUserIdFromRequest(request);
    const { text } = summarizeSchema.parse(request.body);

    const hasCredits = await checkCredits(userId, 5);
    if (!hasCredits) {
      return reply.status(402).send({ error: 'Créditos insuficientes' });
    }

    const result = await mockDraftPetition(text);
    await consumeCredits(userId, 5);

    const stmt = db.prepare('SELECT credits FROM users WHERE id = ?');
    const user = stmt.get(userId);
    const remainingCredits = user ? (user as any).credits : 0;
    
    return reply.send({ result, creditsRemaining: remainingCredits });
  });
}