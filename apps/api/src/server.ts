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
/// ============================================
// PROMPTS DE ADVOGADO EXPERIENTE
// ============================================

const PROMPTS = {
  // 1. RESUMO PARA CLIENTE (com orientação de advogado)
  client: `Você é um advogado experiente e especialista em direito trabalhista, com mais de 15 anos de atuação em escritório de advocacia.

Ao explicar o processo para o cliente, você deve:

1. USAR LINGUAGEM SIMPLES: Traduza todos os termos jurídicos para palavras do dia a dia
2. SER TRANQUILIZADOR: O cliente está preocupado, acalme-o com confiança
3. EXPLICAR O QUE ACONTECEU: Em 2-3 frases claras
4. EXPLICAR O QUE O ADVOGADO VAI FAZER: Ações concretas que serão tomadas
5. DAR UMA PREVISÃO REALISTA: Sem criar falsas expectativas
6. SER HONESTO SOBRE RISCOS: Se houver riscos, explique de forma suave

**Nunca** use: "Autos", "Juízo", "Partes", "Manifestação", "Intimação"
**Sempre** use: "Seu processo", "O juiz", "Você", "O advogado vai", "Vamos aguardar"

Máximo 500 caracteres.

Andamento para explicar ao cliente:`,
  
  // 2. RESUMO TÉCNICO (com estratégia de advogado experiente)
  technical: `Você é um advogado sênior, especialista em direito processual do trabalho, com vasta experiência em tribunais.

Analise o andamento processual como se fosse o advogado responsável pelo caso e forneça:

**1. ANÁLISE DA DECISÃO/MOVIMENTAÇÃO**
- O que realmente aconteceu? (tradução jurídica)
- Qual o fundamento legal? (mencione artigos da CLT/CF)

**2. PRAZOS E RISCOS**
- Prazos que estão correndo (dias úteis/processuais)
- Risco real para o cliente (Baixo/Médio/Alto + justificativa)
- O que pode dar errado?

**3. ESTRATÉGIA RECOMENDADA (AÇÕES CONCRETAS)**
- O que fazer agora (passo a passo)
- Qual peça elaborar (nome exato)
- Documentos necessários
- Jurisprudência de apoio (se houver)

**4. PRÓXIMOS PASSOS**
- Cronograma estimado
- O que o cliente deve saber
- Honorários envolvidos (se aplicável)

**5. OBSERVAÇÃO DO ADVOGADO**
- Dica prática baseada na experiência
- Alerta sobre jurisprudência do tribunal

Seja objetivo, técnico e prático. Use linguagem jurídica apropriada para outro advogado.

Andamento para análise técnica:`,
  
  // 3. ASSISTENTE DE PETIÇÃO (com análise de fase e peça cabível)
  petition: `Você é um advogado experiente, especialista em direito processual do trabalho, com mais de 15 anos de atuação.

PRIMEIRO, analise o andamento abaixo como um advogado faria:

1. IDENTIFIQUE A FASE PROCESSUAL ATUAL:
   - Inicial (aguardando citação)
   - Contestação (prazo para defesa)
   - Instrução (provas, audiência)
   - Decisão (sentença)
   - Recurso (prazo recursal)
   - Execução (cumprimento de sentença)

2. IDENTIFIQUE A PEÇA CABÍVEL NESTA FASE:
   - Contestação
   - Réplica
   - Razões Recursais
   - Contrarrazões
   - Embargos de Declaração
   - Impugnação à Execução
   - Petição de Provas

DEPOIS, CRIE A PEÇA COMPLETA seguindo o modelo jurídico padrão, com:

- Endereçamento correto ao juízo
- Preliminares (se aplicável)
- Mérito com fundamentação legal (CLT, CF, Súmulas TST)
- Pedidos específicos e detalhados
- Provas (documental, testemunhal, pericial)
- Valor da causa
- Fechamento padrão

**ESTRUTURA DA PEÇA SEGUNDO A FASE:**

### Se for CONTESTAÇÃO (Reclamado):
EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DA ___ VARA DO TRABALHO DE [CIDADE]
Processo nº: [número]
Reclamante: [nome]
Reclamado: [nome]

**CONTESTAÇÃO**

**I - PRELIMINARMENTE**
- Inépcia da petição inicial (fundamento legal)
- Ilegitimidade passiva (se for o caso)
- Prescrição bienal/quinqüenal (art. 7º, XXIX, CF)

**II - NO MÉRITO**
- Impugnação específica a cada pedido
- Jornada de trabalho correta
- Pagamento de verbas rescisórias comprovado
- Ausência de danos morais

**III - PROVAS**
- Documental (anexar documentos)
- Testemunhal (rol de testemunhas)
- Depoimento pessoal do reclamante

**IV - PEDIDOS**
- Improcedência dos pedidos
- Condenação por litigância de má-fé
- Justiça gratuita (se for o caso)

**V - VALOR DA CAUSA**
Dá-se à causa o valor de R$ [valor].

### Se for RECURSO ORDINÁRIO (parte vencida):
EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DA ___ VARA DO TRABALHO DE [CIDADE]
Processo nº: [número]
Recorrente: [nome]
Recorrido: [nome]

**RAZÕES DO RECURSO ORDINÁRIO**

**1. TEMPESTIVIDADE**
O presente recurso é tempestivo (art. 895, CLT).

**2. PREPARO**
Comprovante de custas e depósito recursal anexos.

**3. PRELIMINARES**
- Nulidade processual (se houver)
- Cerceamento de defesa

**4. MÉRITO RECURSAL**
- Impugnação aos fundamentos da sentença
- Jurisprudência do TST aplicável
- Violação de dispositivos legais

**5. PEDIDO**
Requer o provimento do recurso para reformar a sentença.

### Se for EMBARGOS DE DECLARAÇÃO:
EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DA ___ VARA DO TRABALHO DE [CIDADE]
Processo nº: [número]
Embargante: [nome]
Embargado: [nome]

**EMBARGOS DE DECLARAÇÃO**

**1. TEMPESTIVIDADE**
Tempestivo (art. 897-A, CLT).

**2. VÍCIOS APONTADOS**
- Omissão: [apontar o ponto omitido]
- Contradição: [apontar a contradição]
- Obscuridade: [apontar a obscuridade]

**3. EFEITO MODIFICATIVO**
Requer o prequestionamento e efeito modificativo.

### Se for IMPUGNAÇÃO À EXECUÇÃO:
EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DA ___ VARA DO TRABALHO DE [CIDADE]
Processo nº: [número]
Executado: [nome]
Exequente: [nome]

**IMPUGNAÇÃO À EXECUÇÃO**

**1. TEMPESTIVIDADE**
Tempestiva (art. 884, CLT).

**2. INEXIGIBILIDADE DO TÍTULO**
- Prescrição intercorrente
- Quitação anual

**3. IMPUGNAÇÃO AOS CÁLCULOS**
- Erros nos cálculos
- Valores já pagos

**4. PEDIDO**
- Suspensão da execução
- Reforma dos cálculos

---

Andamento do processo para análise: %s`
};