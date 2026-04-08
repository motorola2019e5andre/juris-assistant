import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import fs from 'fs';
import OpenAI from 'openai';

dotenv.config();

const app = Fastify({ logger: true });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Configurar banco de dados
const dbPath = process.env.DATABASE_PATH || './juris_dev.db';
const db = new Database(dbPath);

// Criar tabelas se não existirem
db.exec(`
  CREATE TABLE IF NOT EXISTS offices (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    credits INTEGER DEFAULT 100,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    password TEXT NOT NULL,
    officeId TEXT,
    role TEXT DEFAULT 'reclamante',
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (officeId) REFERENCES offices(id)
  );
`);

// Verificar se já existe escritório padrão
const existingOffice = db.prepare('SELECT * FROM offices WHERE email = ?').get('admin@juris.com');
if (!existingOffice) {
  const officeId = randomUUID();
  db.prepare('INSERT INTO offices (id, name, email, credits) VALUES (?, ?, ?, ?)')
    .run(officeId, 'Escritorio Padrao', 'admin@juris.com', 100);

  const hashedPassword = bcrypt.hashSync('123456', 10);
  db.prepare('INSERT INTO users (id, name, email, password, officeId) VALUES (?, ?, ?, ?, ?)')
    .run(randomUUID(), 'Admin', 'admin@juris.com', hashedPassword, officeId);
  console.log('Banco de dados inicializado com 100 créditos!');
}

app.register(cors, { origin: true });
app.register(jwt, { secret: process.env.JWT_SECRET || 'segredo-padrao' });

// ============================================
// FUNÇÕES DE IA COM OPENAI REAL
// ============================================

async function callOpenAI(prompt: string, maxTokens: number = 500): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
      temperature: 0.7,
    });
    return response.choices[0].message.content || 'Não foi possível gerar o resumo.';
  } catch (error: any) {
    console.error('Erro OpenAI:', error.message);
    return `Erro ao gerar: ${error.message}. Tente novamente mais tarde.`;
  }
}

// ============================================
// ROTAS DE IA (COM OPENAI REAL)
// ============================================

// 1. Resumo para cliente
app.post('/v1/ai/summarize-client', async (request, reply) => {
  const { text } = request.body as { text: string };
  
  const office = db.prepare('SELECT credits FROM offices WHERE email = ?').get('admin@juris.com') as any;
  
  if (!office || office.credits < 1) {
    return reply.status(402).send({ error: 'Créditos insuficientes' });
  }
  
  const prompt = `Você é um assistente jurídico. Resuma o seguinte andamento processual em linguagem simples, clara e empática para um cliente leigo. Use "Seu processo", "o juiz decidiu", "seu advogado". Máximo 400 caracteres.

Andamento: ${text}`;
  
  const result = await callOpenAI(prompt, 500);
  
  db.prepare('UPDATE offices SET credits = credits - 1 WHERE email = ?').run('admin@juris.com');
  
  const updated = db.prepare('SELECT credits FROM offices WHERE email = ?').get('admin@juris.com') as any;
  
  return reply.send({ result, creditsRemaining: updated?.credits || 0 });
});

// 2. Resumo técnico
app.post('/v1/ai/summarize-technical', async (request, reply) => {
  const { text } = request.body as { text: string };
  
  const office = db.prepare('SELECT credits FROM offices WHERE email = ?').get('admin@juris.com') as any;
  
  if (!office || office.credits < 1) {
    return reply.status(402).send({ error: 'Créditos insuficientes' });
  }
  
  const prompt = `Você é um advogado sênior. Faça um resumo técnico do seguinte andamento processual, destacando: (1) o que foi decidido, (2) prazo relevante, (3) risco para o cliente, (4) estratégia recomendada, (5) próxima peça.

Andamento: ${text}`;
  
  const result = await callOpenAI(prompt, 800);
  
  db.prepare('UPDATE offices SET credits = credits - 1 WHERE email = ?').run('admin@juris.com');
  
  const updated = db.prepare('SELECT credits FROM offices WHERE email = ?').get('admin@juris.com') as any;
  
  return reply.send({ result, creditsRemaining: updated?.credits || 0 });
});

// 3. Assistente de petição
app.post('/v1/ai/draft-petition', async (request, reply) => {
  const { text } = request.body as { text: string };
  
  const office = db.prepare('SELECT credits FROM offices WHERE email = ?').get('admin@juris.com') as any;
  
  if (!office || office.credits < 1) {
    return reply.status(402).send({ error: 'Créditos insuficientes' });
  }
  
  const prompt = `Você é um advogado experiente. Com base no andamento abaixo, crie um ESQUELETO DE PEÇA com: (1) endereçamento, (2) fatos relevantes, (3) fundamentação (tópicos), (4) pedidos, (5) provas, (6) valor da causa. Use marcadores.

Andamento: ${text}`;
  
  const result = await callOpenAI(prompt, 1500);
  
  db.prepare('UPDATE offices SET credits = credits - 1 WHERE email = ?').run('admin@juris.com');
  
  const updated = db.prepare('SELECT credits FROM offices WHERE email = ?').get('admin@juris.com') as any;
  
  return reply.send({ result, creditsRemaining: updated?.credits || 0 });
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