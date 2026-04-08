import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import fs from 'fs';

dotenv.config();

const app = Fastify({ logger: true });

// Configurar banco de dados
const dbPath = process.env.DATABASE_PATH || './juris_dev.db';
const dbExists = fs.existsSync(dbPath);
const db = new Database(dbPath);

// Criar tabelas se não existirem
if (!dbExists) {
  console.log('Criando banco de dados...');
  db.exec(`
    CREATE TABLE offices (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      credits INTEGER DEFAULT 100,
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

  // Inserir escritório padrão
  const officeId = randomUUID();
  db.prepare('INSERT INTO offices (id, name, email, credits) VALUES (?, ?, ?, ?)')
    .run(officeId, 'Escritorio Padrao', 'admin@juris.com', 100);

  // Inserir usuário admin
  const hashedPassword = bcrypt.hashSync('123456', 10);
  db.prepare('INSERT INTO users (id, name, email, password, officeId) VALUES (?, ?, ?, ?, ?)')
    .run(randomUUID(), 'Admin', 'admin@juris.com', hashedPassword, officeId);

  console.log('Banco de dados inicializado com 100 créditos!');
}

app.register(cors, { origin: true });
app.register(jwt, { secret: process.env.JWT_SECRET || 'segredo-padrao' });

// ============================================
// MOCKS DE IA
// ============================================

async function mockSummarizeClient(text: string, role: string): Promise<string> {
  return `📋 RESUMO PARA CLIENTE:

Seu processo está em andamento. O juiz analisou os autos e determinou as providências necessárias.

Seu advogado está acompanhando todas as movimentações.

📌 Próximo passo: Aguardar nova movimentação processual.`;
}

async function mockSummarizeTechnical(text: string, role: string): Promise<string> {
  return `📊 RESUMO TÉCNICO:

1. O QUE FOI DECIDIDO: Análise processual em andamento.
2. PRAZO: Aguardar próxima movimentação.
3. RISCO: Baixo.
4. ESTRATÉGIA: Acompanhar o processo.
5. PRÓXIMA PEÇA: Petição de acompanhamento.`;
}

async function mockDraftPetition(text: string, role: string): Promise<string> {
  return `📝 ASSISTENTE DE PETIÇÃO:

EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DA ___ VARA DO TRABALHO

**Processo nº:** [Número do processo]

**1. DOS FATOS**
[Descrever os fatos]

**2. DA FUNDAMENTAÇÃO**
- Violação da CLT
- Jurisprudência aplicável

**3. DOS PEDIDOS**
- Pagamento de verbas rescisórias
- Horas extras e reflexos

**4. DAS PROVAS**
Requer a produção de todos os meios de prova.

**5. DO VALOR DA CAUSA**
Dá-se à causa o valor de R$ [valor estimado].

Nestes termos, pede deferimento.`;
}

// ============================================
// ROTAS DE IA (SEM AUTENTICAÇÃO)
// ============================================

app.post('/v1/ai/summarize-client', async (request, reply) => {
  const { text } = request.body as { text: string };
  
  const office = db.prepare('SELECT credits FROM offices WHERE email = ?').get('admin@juris.com') as any;
  
  if (!office || office.credits < 1) {
    return reply.status(402).send({ error: 'Créditos insuficientes' });
  }
  
  const result = await mockSummarizeClient(text, 'reclamante');
  
  db.prepare('UPDATE offices SET credits = credits - 1 WHERE email = ?').run('admin@juris.com');
  
  const updated = db.prepare('SELECT credits FROM offices WHERE email = ?').get('admin@juris.com') as any;
  
  return reply.send({ result, creditsRemaining: updated?.credits || 0 });
});

app.post('/v1/ai/summarize-technical', async (request, reply) => {
  const { text } = request.body as { text: string };
  
  const office = db.prepare('SELECT credits FROM offices WHERE email = ?').get('admin@juris.com') as any;
  
  if (!office || office.credits < 1) {
    return reply.status(402).send({ error: 'Créditos insuficientes' });
  }
  
  const result = await mockSummarizeTechnical(text, 'reclamante');
  
  db.prepare('UPDATE offices SET credits = credits - 1 WHERE email = ?').run('admin@juris.com');
  
  const updated = db.prepare('SELECT credits FROM offices WHERE email = ?').get('admin@juris.com') as any;
  
  return reply.send({ result, creditsRemaining: updated?.credits || 0 });
});

app.post('/v1/ai/draft-petition', async (request, reply) => {
  const { text } = request.body as { text: string };
  
  const office = db.prepare('SELECT credits FROM offices WHERE email = ?').get('admin@juris.com') as any;
  
  if (!office || office.credits < 1) {
    return reply.status(402).send({ error: 'Créditos insuficientes' });
  }
  
  const result = await mockDraftPetition(text, 'reclamante');
  
  db.prepare('UPDATE offices SET credits = credits - 1 WHERE email = ?').run('admin@juris.com');
  
  const updated = db.prepare('SELECT credits FROM offices WHERE email = ?').get('admin@juris.com') as any;
  
  return reply.send({ result, creditsRemaining: updated?.credits || 0 });
});

// ============================================
// ROTAS DE AUTENTICAÇÃO (OPCIONAL PARA TESTE)
// ============================================

app.post('/v1/auth/register', async (request, reply) => {
  const { name, email, password, officeName } = request.body as any;
  
  const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (existing) {
    return reply.status(400).send({ error: 'E-mail já cadastrado' });
  }
  
  const hashedPassword = await bcrypt.hash(password, 10);
  const officeId = randomUUID();
  const userId = randomUUID();
  
  db.prepare('INSERT INTO offices (id, name, email, credits) VALUES (?, ?, ?, ?)')
    .run(officeId, officeName, email, 50);
  
  db.prepare('INSERT INTO users (id, name, email, password, officeId) VALUES (?, ?, ?, ?, ?)')
    .run(userId, name, email, hashedPassword, officeId);
  
  const token = app.jwt.sign({ id: userId, officeId: officeId });
  
  return reply.send({ token, user: { id: userId, name, email, credits: 50 } });
});

app.post('/v1/auth/login', async (request, reply) => {
  const { email, password } = request.body as any;
  
  const user = db.prepare(`
    SELECT u.*, o.credits as officeCredits 
    FROM users u 
    JOIN offices o ON u.officeId = o.id 
    WHERE u.email = ?
  `).get(email) as any;
  
  if (!user) {
    return reply.status(401).send({ error: 'Credenciais inválidas' });
  }
  
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return reply.status(401).send({ error: 'Credenciais inválidas' });
  }
  
  const token = app.jwt.sign({ id: user.id, officeId: user.officeId });
  
  return reply.send({ token, user: { id: user.id, name: user.name, email: user.email, credits: user.officeCredits } });
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