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
// PROMPTS OTIMIZADOS
// ============================================

const PROMPTS = {
  client: `Você é um assistente jurídico. Resuma o seguinte andamento processual em linguagem clara, empática e simples para um cliente leigo. Use "Seu processo", "o juiz decidiu", "o advogado vai agir". Seja direto e tranquilizador. Máximo 500 caracteres.

Andamento:`,
  
  technical: `Você é um advogado especialista. Faça um resumo técnico do seguinte andamento processual, destacando: (1) o que foi decidido, (2) prazo relevante, (3) risco para o cliente, (4) próxima ação recomendada. Seja objetivo.

Andamento:`,
  
  petition: `Você é um advogado experiente e especialista em direito processual do trabalho.

PRIMEIRO, analise o andamento abaixo e IDENTIFIQUE:

1. QUAL É A FASE PROCESSUAL ATUAL
2. QUAL É A PEÇA CABÍVEL NESTA FASE

DEPOIS, crie a peça adequada com base na fase identificada.

**FASES E PEÇAS CABÍVEIS:**
- Fase Inicial (após petição inicial): Aguardar citação ou emendar inicial
- Fase de Contestação (citado): Contestação, exceções, documentos
- Fase de Instrução: Petição de produção de prova, rol de testemunhas
- Fase de Decisão (sentença): Recurso ordinário, embargos de declaração
- Fase de Recurso: Razões recursais, contrarrazões
- Fase de Execução: Impugnação à execução, cálculos

**ESTRUTURA DA PEÇA SEGUNDO A FASE:**

### Se for CONTESTAÇÃO:
EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DA ___ VARA DO TRABALHO
Processo nº: [número]
Reclamante: [nome]
Reclamado: [nome]

**1. PRELIMINARES**
- Inépcia da petição inicial
- Ilegitimidade passiva
- Prescrição bienal/quinqüenal

**2. MÉRITO**
- Impugnação aos pedidos um a um
- Jornada de trabalho correta
- Pagamento de verbas rescisórias

**3. PROVAS**
- Documental (fichas financeiras, cartões de ponto)
- Testemunhal

**4. PEDIDOS**
- Improcedência dos pedidos
- Condenação por litigância de má-fé
- Justiça gratuita

---

### Se for RECURSO ORDINÁRIO:
EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DA ___ VARA DO TRABALHO
Processo nº: [número]
Recorrente: [nome]
Recorrido: [nome]

**RAZÕES DO RECURSO ORDINÁRIO**

**1. TEMPESTIVIDADE**
O presente recurso é tempestivo, protocolado dentro do prazo legal de 8 dias.

**2. PREPARO**
Comprovante de custas e depósito recursal anexos.

**3. PRELIMINARES**
[Apontar preliminares cabíveis]

**4. MÉRITO**
- Impugnação aos fundamentos da sentença
- [Argumentar ponto a ponto]

**5. PEDIDO**
Requer o provimento do recurso para reformar a sentença.

---

### Se for EMBARGOS DE DECLARAÇÃO:
EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DA ___ VARA DO TRABALHO
Processo nº: [número]
Embargante: [nome]
Embargado: [nome]

**EMBARGOS DE DECLARAÇÃO**

**1. TEMPESTIVIDADE**
O presente recurso é tempestivo, protocolado dentro do prazo legal de 5 dias.

**2. OMISSÃO/CONTRADIÇÃO/OBSCURIDADE**
A sentença incorreu em [apontar o vício], conforme detalhado.

**3. PEDIDO DE EFEITO MODIFICATIVO**
Requer seja suprida a omissão com efeito modificativo.

---

### Se for IMPUGNAÇÃO À EXECUÇÃO:
EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DA ___ VARA DO TRABALHO
Processo nº: [número]
Executado: [nome]
Exequente: [nome]

**IMPUGNAÇÃO À EXECUÇÃO**

**1. TEMPESTIVIDADE**
A presente impugnação é tempestiva.

**2. INEXIGIBILIDADE DO TÍTULO**
O título executivo é inexigível porque [fundamentar].

**3. IMPUGNAÇÃO AOS CÁLCULOS**
Os cálculos estão incorretos porque [apontar erros].

**4. PEDIDO**
- Suspensão da execução
- Reforma dos cálculos

---

Andamento para análise: %s`
};

// ============================================
// ROTAS DE IA
// ============================================

// 1. Resumo para cliente
app.post('/v1/ai/summarize-client', async (request, reply) => {
  const { text, role = 'reclamante' } = request.body as { text: string; role?: string };
  
  const office = db.prepare('SELECT credits FROM offices WHERE email = ?').get('admin@juris.com') as any;
  
  if (!office || office.credits < 1) {
    return reply.status(402).send({ error: 'Créditos insuficientes' });
  }
  
  const prompt = `${PROMPTS.client}\n\n${text}`;
  const result = await callOpenAI(prompt, 500);
  
  db.prepare('UPDATE offices SET credits = credits - 1 WHERE email = ?').run('admin@juris.com');
  
  const updated = db.prepare('SELECT credits FROM offices WHERE email = ?').get('admin@juris.com') as any;
  
  return reply.send({ result, creditsRemaining: updated?.credits || 0, role });
});

// 2. Resumo técnico
app.post('/v1/ai/summarize-technical', async (request, reply) => {
  const { text, role = 'reclamante' } = request.body as { text: string; role?: string };
  
  const office = db.prepare('SELECT credits FROM offices WHERE email = ?').get('admin@juris.com') as any;
  
  if (!office || office.credits < 1) {
    return reply.status(402).send({ error: 'Créditos insuficientes' });
  }
  
  const prompt = `${PROMPTS.technical}\n\n${text}`;
  const result = await callOpenAI(prompt, 800);
  
  db.prepare('UPDATE offices SET credits = credits - 1 WHERE email = ?').run('admin@juris.com');
  
  const updated = db.prepare('SELECT credits FROM offices WHERE email = ?').get('admin@juris.com') as any;
  
  return reply.send({ result, creditsRemaining: updated?.credits || 0, role });
});

// 3. Assistente de petição
app.post('/v1/ai/draft-petition', async (request, reply) => {
  const { text, role = 'reclamante' } = request.body as { text: string; role?: string };
  
  const office = db.prepare('SELECT credits FROM offices WHERE email = ?').get('admin@juris.com') as any;
  
  if (!office || office.credits < 1) {
    return reply.status(402).send({ error: 'Créditos insuficientes' });
  }
  
  const prompt = PROMPTS.petition.replace('%s', text);
  const result = await callOpenAI(prompt, 2500);
  
  db.prepare('UPDATE offices SET credits = credits - 1 WHERE email = ?').run('admin@juris.com');
  
  const updated = db.prepare('SELECT credits FROM offices WHERE email = ?').get('admin@juris.com') as any;
  
  return reply.send({ result, creditsRemaining: updated?.credits || 0, role });
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