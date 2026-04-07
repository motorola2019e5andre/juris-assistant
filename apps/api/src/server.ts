import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import fs from 'fs';

dotenv.config();

const app = Fastify({ logger: true });

// Forçar recriação do banco para garantir a estrutura correta
const dbPath = process.env.DATABASE_PATH || './juris_dev.db';
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log('Banco antigo removido. Recriando...');
}

const db = new Database(dbPath);

// Criar tabelas na ordem correta
db.exec(`
  CREATE TABLE offices (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    credits INTEGER DEFAULT 50,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE users (
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

// Inserir um escritório padrão para testes
const defaultOfficeId = randomUUID();
db.prepare('INSERT INTO offices (id, name, email, credits) VALUES (?, ?, ?, ?)')
  .run(defaultOfficeId, 'Escritorio Padrao', 'admin@juris.com', 100);

// Inserir um usuário admin padrão
const hashedPassword = bcrypt.hashSync('123456', 10);
db.prepare('INSERT INTO users (id, name, email, password, officeId, role) VALUES (?, ?, ?, ?, ?, ?)')
  .run(randomUUID(), 'Admin', 'admin@juris.com', hashedPassword, defaultOfficeId, 'reclamante');

console.log('Banco de dados inicializado com 100 créditos!');

app.register(cors, { origin: true });
app.register(jwt, { secret: process.env.JWT_SECRET || 'segredo-padrao' });

// ============================================
// SCHEMAS
// ============================================

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  officeName: z.string().min(2),
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

function getOfficeIdFromRequest(request: any): string {
  const user = request.user as { officeId: string };
  return user.officeId;
}

// ============================================
// MOCKS DE IA
// ============================================

async function mockSummarizeClient(text: string, role: string): Promise<string> {
  return `RESUMO PARA CLIENTE:

Seu processo esta em andamento. O juiz analisou os autos e determinou as providencias necessarias.

Seu advogado esta acompanhando todas as movimentacoes.

Proximo passo: Aguardar nova movimentacao processual.`;
}

// ============================================
// ROTAS
// ============================================

app.post('/v1/auth/register', async (request, reply) => {
  const body = registerSchema.parse(request.body);
  
  const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(body.email);
  if (existingUser) {
    return reply.status(400).send({ error: 'E-mail já cadastrado' });
  }
  
  const hashedPassword = await bcrypt.hash(body.password, 10);
  const officeId = randomUUID();
  const userId = randomUUID();
  
  db.prepare('INSERT INTO offices (id, name, email, credits) VALUES (?, ?, ?, ?)')
    .run(officeId, body.officeName, body.email, 50);
  
  db.prepare('INSERT INTO users (id, name, email, password, officeId, role) VALUES (?, ?, ?, ?, ?, ?)')
    .run(userId, body.name, body.email, hashedPassword, officeId, body.role);
  
  const token = app.jwt.sign({ id: userId, officeId: officeId, role: body.role });
  
  return reply.send({ 
    token, 
    user: { 
      id: userId, 
      name: body.name, 
      email: body.email, 
      credits: 50, 
      officeId: officeId,
      role: body.role 
    } 
  });
});

app.post('/v1/auth/login', async (request, reply) => {
  const body = loginSchema.parse(request.body);
  
  const user = db.prepare(`
    SELECT u.*, o.credits as officeCredits 
    FROM users u 
    JOIN offices o ON u.officeId = o.id 
    WHERE u.email = ?
  `).get(body.email) as any;
  
  if (!user) {
    return reply.status(401).send({ error: 'Credenciais inválidas' });
  }
  
  const valid = await bcrypt.compare(body.password, user.password);
  if (!valid) {
    return reply.status(401).send({ error: 'Credenciais inválidas' });
  }
  
  const token = app.jwt.sign({ id: user.id, officeId: user.officeId, role: user.role });
  
  return reply.send({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      credits: user.officeCredits,
      officeId: user.officeId,
      role: user.role
    }
  });
});

app.post('/v1/ai/summarize-client', async (request, reply) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    return reply.status(401).send({ error: 'Não autorizado' });
  }
  
  const officeId = getOfficeIdFromRequest(request);
  const { text } = request.body as { text: string };
  
  const office = db.prepare('SELECT credits FROM offices WHERE id = ?').get(officeId) as any;
  
  if (!office || office.credits < 1) {
    return reply.status(402).send({ error: 'Créditos insuficientes' });
  }
  
  const result = await mockSummarizeClient(text, 'reclamante');
  
  db.prepare('UPDATE offices SET credits = credits - 1 WHERE id = ?').run(officeId);
  
  const updated = db.prepare('SELECT credits FROM offices WHERE id = ?').get(officeId) as any;
  
  return reply.send({ result, creditsRemaining: updated?.credits || 0 });
});

app.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

app.get('/v1/admin/credits', async (request, reply) => {
  const offices = db.prepare('SELECT id, name, email, credits FROM offices').all();
  return reply.send({ offices });
});

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