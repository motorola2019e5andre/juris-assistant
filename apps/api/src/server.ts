import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { findUserByEmail, createUser, updateUserCredits, getUserRole, updateUserRole } from './lib/db';

dotenv.config();

const app = Fastify({ logger: true });

app.register(cors, { origin: true });
app.register(jwt, { secret: process.env.JWT_SECRET || 'segredo-padrao' });

// ============================================
// SCHEMAS
// ============================================

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['reclamante', 'reclamada']).default('reclamante'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const summarizeSchema = z.object({
  text: z.string().min(10).max(10000),
});

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function getUserIdFromRequest(request: any): string {
  const user = request.user as { id: string };
  return user.id;
}

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

// ============================================
// MOCKS DE IA
// ============================================

async function mockSummarizeClient(text: string, role: string): Promise<string> {
  const lado = role === 'reclamante' ? 'trabalhador' : 'empresa';
  return `RESUMO PARA CLIENTE (${role === 'reclamante' ? 'Reclamante' : 'Reclamada'}):

Seu processo esta em andamento. O juiz analisou os autos e determinou as providencias necessarias.

Seu advogado esta acompanhando todas as movimentacoes e tomara as medidas cabiveis para defender os interesses do ${lado}.

Proximo passo: Aguardar nova movimentacao processual.`;
}

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

// ============================================
// ROTAS DE AUTENTICAÇÃO
// ============================================

app.post('/v1/auth/register', async (request, reply) => {
  const body = registerSchema.parse(request.body);
  const existingUser = findUserByEmail(body.email);
  if (existingUser) {
    return reply.status(400).send({ error: 'E-mail já cadastrado' });
  }
  const hashedPassword = await bcrypt.hash(body.password, 10);
  const user = createUser(body.name, body.email, hashedPassword, body.role);
  const token = app.jwt.sign({ id: user.id, role: user.role });
  return reply.send({ token, user: { id: user.id, name: user.name, email: user.email, credits: user.credits, role: user.role } });
});

app.post('/v1/auth/login', async (request, reply) => {
  const body = loginSchema.parse(request.body);
  const user = findUserByEmail(body.email);
  if (!user) {
    return reply.status(401).send({ error: 'Credenciais inválidas' });
  }
  const validPassword = await bcrypt.compare(body.password, (user as any).password);
  if (!validPassword) {
    return reply.status(401).send({ error: 'Credenciais inválidas' });
  }
  const role = getUserRole((user as any).id);
  const token = app.jwt.sign({ id: (user as any).id, role: role });
  return reply.send({ token, user: { id: (user as any).id, name: (user as any).name, email: (user as any).email, credits: (user as any).credits, role: role } });
});

// ============================================
// ROTAS DE IA
// ============================================

app.post('/v1/ai/summarize-client', async (request, reply) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    return reply.status(401).send({ error: 'Não autorizado' });
  }
  
  const userId = getUserIdFromRequest(request);
  const { text } = summarizeSchema.parse(request.body);
  const role = getUserRole(userId);

  const hasCredits = await checkCredits(userId, 1);
  if (!hasCredits) {
    return reply.status(402).send({ error: 'Créditos insuficientes' });
  }

  const result = await mockSummarizeClient(text, role);
  await consumeCredits(userId, 1);

  const user = findUserByEmail(userId);
  const remainingCredits = user ? (user as any).credits : 0;
  
  return reply.send({ result, creditsRemaining: remainingCredits, role });
});

app.post('/v1/ai/summarize-technical', async (request, reply) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    return reply.status(401).send({ error: 'Não autorizado' });
  }
  
  const userId = getUserIdFromRequest(request);
  const { text } = summarizeSchema.parse(request.body);
  const role = getUserRole(userId);

  const hasCredits = await checkCredits(userId, 1);
  if (!hasCredits) {
    return reply.status(402).send({ error: 'Créditos insuficientes' });
  }

  const result = await mockSummarizeTechnical(text, role);
  await consumeCredits(userId, 1);

  const user = findUserByEmail(userId);
  const remainingCredits = user ? (user as any).credits : 0;
  
  return reply.send({ result, creditsRemaining: remainingCredits, role });
});

app.post('/v1/ai/draft-petition', async (request, reply) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    return reply.status(401).send({ error: 'Não autorizado' });
  }
  
  const userId = getUserIdFromRequest(request);
  const { text } = summarizeSchema.parse(request.body);
  const role = getUserRole(userId);

  const hasCredits = await checkCredits(userId, 1);
  if (!hasCredits) {
    return reply.status(402).send({ error: 'Créditos insuficientes' });
  }

  const result = await mockDraftPetition(text, role);
  await consumeCredits(userId, 1);

  const user = findUserByEmail(userId);
  const remainingCredits = user ? (user as any).credits : 0;
  
  return reply.send({ result, creditsRemaining: remainingCredits, role });
});

// ============================================
// HEALTH CHECK
// ============================================

app.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// ============================================
// INICIAR SERVIDOR
// ============================================

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3333');
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 Servidor rodando em http://localhost:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();