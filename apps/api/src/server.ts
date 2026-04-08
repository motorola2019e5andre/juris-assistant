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

const PROMPTS = {
  client: `Você é um assistente jurídico. Resuma o seguinte andamento processual em linguagem clara, empática e simples para um cliente leigo. Use "Seu processo", "o juiz decidiu", "o advogado vai agir". Seja direto e tranquilizador. Máximo 500 caracteres.

Andamento:`,
  
  technical: `Você é um advogado especialista. Faça um resumo técnico do seguinte andamento processual, destacando: (1) o que foi decidido, (2) prazo relevante, (3) risco para o cliente, (4) próxima ação recomendada. Seja objetivo.

Andamento:`,
  
  petition: `Você é um advogado experiente e especialista em direito trabalhista. Com base nos dados extraídos do processo abaixo, crie uma PEÇA PROCESSUAL COMPLETA E APROFUNDADA seguindo esta estrutura:

---

**EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DA ___ VARA DO TRABALHO DE [CIDADE]**

**Processo nº:** [Número do processo]

**Reclamante:** [Nome do reclamante]
**Reclamado:** [Nome da empresa]

---

**1. DOS FATOS**

[Elabore uma narrativa detalhada dos fatos com base no andamento processual, incluindo:
- Data da contratação e demissão
- Função exercida
- Jornada de trabalho (horário de entrada, saída, intervalos)
- Salário recebido
- Circunstâncias da rescisão
- Acidente de trabalho (se houver)
- Todas as informações relevantes extraídas do processo]

---

**2. DA FUNDAMENTAÇÃO JURÍDICA**

[Desenvolva tópicos com base na CLT e jurisprudência do TST:

2.1. Do Vínculo Empregatício (art. 3º da CLT)
2.2. Das Horas Extras e Reflexos (art. 58, §1º, e art. 59 da CLT, Súmula 264 do TST)
2.3. Do Adicional Noturno (art. 73 da CLT)
2.4. Do Intervalo Intrajornada (art. 71 da CLT, Súmula 437 do TST)
2.5. Das Verbas Rescisórias (arts. 457, 458, 477 e 487 da CLT)
2.6. Da Multa do art. 477 da CLT
2.7. Da Indenização por Danos Morais (art. 5º, V e X, CF, arts. 186 e 927 do CC)
2.8. Do Acidente de Trabalho (arts. 19, 20 e 21 da Lei 8.213/91)
2.9. Da Justiça Gratuita (Lei 1.060/50, art. 790, §3º da CLT)
2.10. Dos Honorários Advocatícios (art. 791-A da CLT, Súmula 219 e 329 do TST)]

---

**3. DOS PEDIDOS**

[Formule pedidos específicos e detalhados com base na fundamentação:

3.1. Reconhecimento do vínculo empregatício (se for o caso)
3.2. Pagamento de horas extras e reflexos em RSR, férias + 1/3, 13º salário, FGTS + 40%
3.3. Pagamento de adicional noturno e reflexos
3.4. Pagamento do intervalo intrajornada suprimido
3.5. Pagamento de verbas rescisórias (aviso prévio, férias proporcionais + 1/3, 13º proporcional, multa do art. 477)
3.6. Liberação das guias do FGTS e seguro-desemprego
3.7. Indenização por danos morais (valor compatível com o caso)
3.8. Indenização por danos materiais (se houver)
3.9. Pagamento de honorários periciais (se houver perícia)
3.10. Concessão da justiça gratuita
3.11. Condenação em honorários advocatícios (20% sobre o valor da condenação)

---

**4. DAS PROVAS**

Requer a produção de todos os meios de prova em direito admitidos, especialmente:
- Documental (fichas financeiras, cartões de ponto, comprovantes de pagamento)
- Testemunhal (com oitiva de testemunhas presenciais)
- Pericial (se necessário)
- Depoimento pessoal do reclamante sob pena de confissão

---

**5. DO VALOR DA CAUSA**

Dá-se à causa o valor de R$ [valor estimado com base nos pedidos].

---

**6. DOS PEDIDOS FINAIS**

Diante do exposto, requer o recebimento e procedência da presente reclamação para condenar a reclamada ao pagamento de todas as verbas pleiteadas, acrescidas de juros e correção monetária.

---

Nestes termos, pede deferimento.

[Local], [data]
[Advogado] - OAB/UF nº [número]

---

**Dados extraídos do processo para análise:**
%s
`
};

// ============================================
// ROTAS DE IA (COM OS PROMPTS OTIMIZADOS)
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
  
  const prompt = `${PROMPTS.petition}\n\n${text}`;
  const result = await callOpenAI(prompt, 1500);
  
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