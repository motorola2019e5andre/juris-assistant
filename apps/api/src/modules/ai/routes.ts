import { FastifyInstance } from 'fastify';
import { authenticate, getUserIdFromRequest } from '../../lib/auth';
import { findUserByEmail, updateUserCredits } from '../../lib/db';
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

// MOCK para testes
async function mockSummarizeClient(text: string): Promise<string> {
  return `📋 RESUMO PARA CLIENTE:

Seu processo está em andamento. O juiz analisou os autos e determinou as providências necessárias.

Seu advogado está acompanhando todas as movimentações e tomará as medidas cabíveis para defender seus interesses.

📌 Próximo passo: Aguardar nova movimentação processual.

🔔 Qualquer novidade será comunicada imediatamente.`;
}

export default async function aiRoutes(app: FastifyInstance) {
  
  app.post('/summarize-client', { preHandler: authenticate }, async (request, reply) => {
    const userId = getUserIdFromRequest(request);
    const { text } = summarizeSchema.parse(request.body);

    const hasCredits = await checkCredits(userId, 1);
    if (!hasCredits) {
      return reply.status(402).send({ error: 'Créditos insuficientes' });
    }

    const result = await mockSummarizeClient(text);
    await consumeCredits(userId, 1);

    const user = findUserByEmail(userId);
    const remainingCredits = user ? (user as any).credits : 0;
    
    return reply.send({ result, creditsRemaining: remainingCredits });
  });
}