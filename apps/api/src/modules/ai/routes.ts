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

// PROMPTS COM ESTRATÉGIA POR POLO
function getPromptByRole(role: string, type: string): string {
  const poloTexto = role === 'reclamante' ? 'RECLAMANTE (TRABALHADOR)' : 'RECLAMADA (EMPRESA)';
  const estrategia = role === 'reclamante' 
    ? 'Defender os direitos do trabalhador, buscar máximos danos morais e materiais, horas extras, verbas rescisórias.'
    : 'Defender a empresa, minimizar condenações, contestar pedidos excessivos, buscar acordos favoráveis.';
  
  if (type === 'technical') {
    return `Você é um advogado sênior especialista em direito trabalhista atuando pelo ${poloTexto}.

ESTRATÉGIA: ${estrategia}

Analise o andamento e responda neste formato:

**1. O QUE FOI DECIDIDO:** [resumo da decisão]

**2. PRAZO:** [prazo relevante]

**3. RISCO:** [Baixo/Médio/Alto] - [motivo baseado no polo]

**4. ESTRATÉGIA RECOMENDADA:** [ação específica considerando o polo]

**5. PRÓXIMA PEÇA:** [nome da peça]

**6. OBSERVAÇÃO:** [dica importante para o polo]`;
  }
  
  if (type === 'petition') {
    return `Você é um advogado especialista atuando pelo ${poloTexto}.

ESTRATÉGIA: ${estrategia}

Crie um esqueleto de petição com:
1. ENDEREÇAMENTO
2. FATOS (destacando a perspectiva do polo)
3. FUNDAMENTAÇÃO (com artigos da CLT favoráveis ao polo)
4. PEDIDOS (específicos para ${role === 'reclamante' ? 'o trabalhador' : 'a empresa'})
5. PROVAS
6. VALOR DA CAUSA`;
  }
  
  // Resumo para cliente (neutro, mas adaptado)
  return `Você é um assistente jurídico atuando pelo ${poloTexto}.

Faça um resumo para o cliente em linguagem simples, clara e empática, considerando que ele é ${role === 'reclamante' ? 'o trabalhador que está reivindicando seus direitos' : 'a empresa que está sendo processada'}.
Máximo 500 caracteres.`;
}

// MOCK para testes
async function mockSummarizeClient(text: string, role: string): Promise<string> {
  const lado = role === 'reclamante' ? 'trabalhador' : 'empresa';
  return `📋 RESUMO PARA ${role === 'reclamante' ? 'CLIENTE (TRABALHADOR)' : 'CLIENTE (EMPRESA)'}:

Seu processo está em andamento. O juiz analisou os autos e determinou as providências necessárias.

Seu advogado está acompanhando todas as movimentações e tomará as medidas cabíveis para defender os interesses do ${lado}.

📌 Próximo passo: Aguardar nova movimentação processual.

🔔 Qualquer novidade será comunicada imediatamente.`;
}

async function mockSummarizeTechnical(text: string, role: string): Promise<string> {
  const estrategia = role === 'reclamante' 
    ? 'Fortalecer a tese do reclamante, juntar documentos comprobatórios, calcular horas extras.'
    : 'Contestar veementemente, buscar provas em contrário, negociar acordo vantajoso.';
  
  return `📊 RESUMO TÉCNICO - POLO: ${role.toUpperCase()}

**1. O QUE FOI DECIDIDO:** Análise processual em andamento.

**2. PRAZO:** Aguardar próxima movimentação.

**3. RISCO:** ${role === 'reclamante' ? 'Médio' : 'Baixo'} - dependendo das provas apresentadas.

**4. ESTRATÉGIA RECOMENDADA:** ${estrategia}

**5. PRÓXIMA PEÇA:** ${role === 'reclamante' ? 'Petição de acompanhamento e cálculos' : 'Contestação com documentos'}

**6. OBSERVAÇÃO:** Manter o cliente informado sobre os prazos.`;
}

async function mockDraftPetition(text: string, role: string): Promise<string> {
  const parte = role === 'reclamante' ? 'Reclamante' : 'Reclamado';
  const fundamentos = role === 'reclamante' 
    ? '- Violação da CLT, art. 482\n- Horas extras não pagas (art. 58, CLT)\n- Rescisão indireta (art. 483, CLT)'
    : '- Inexistência de vínculo empregatício\n- Jornada de trabalho regular\n- Pagamento de todas as verbas rescisórias';
  
  const pedidos = role === 'reclamante'
    ? '- Pagamento de horas extras e reflexos\n- Indenização por danos morais\n- Multa do art. 477 da CLT'
    : '- Improcedência dos pedidos\n- Condenação do reclamante por litigância de má-fé\n- Juntada de documentos comprobatórios';
  
  return `📝 ASSISTENTE DE PETIÇÃO - POLO: ${role.toUpperCase()}

EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DA ___ VARA DO TRABALHO

**Processo nº:** [Número do processo]

**${parte}:** [Nome do cliente]

**1. DOS FATOS**
${role === 'reclamante' ? 'O reclamante trabalhava na empresa ré...' : 'O reclamante alega fatos que não condizem com a realidade...'}

**2. DA FUNDAMENTAÇÃO**
${fundamentos}

**3. DOS PEDIDOS**
${pedidos}

**4. DAS PROVAS**
Requer a produção de todos os meios de prova em direito admitidos.

**5. DO VALOR DA CAUSA**
Dá-se à causa o valor de R$ [valor estimado].

Nestes termos, pede deferimento.

[Local], [data]
[Advogado] - OAB/UF nº [número]`;
}

export default async function aiRoutes(app: FastifyInstance) {
  
  app.post('/summarize-client', { preHandler: authenticate }, async (request, reply) => {
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
  
  app.post('/summarize-technical', { preHandler: authenticate }, async (request, reply) => {
    const userId = getUserIdFromRequest(request);
    const { text } = summarizeSchema.parse(request.body);
    const role = getUserRole(userId);

   export default async function aiRoutes(app: FastifyInstance) {
  
  app.post('/summarize-client', { preHandler: authenticate }, async (request, reply) => {
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
  
  // RESUMO TÉCNICO - CORRIGIDO (1 crédito)
  app.post('/summarize-technical', { preHandler: authenticate }, async (request, reply) => {
    const userId = getUserIdFromRequest(request);
    const { text } = summarizeSchema.parse(request.body);
    const role = getUserRole(userId);

    const hasCredits = await checkCredits(userId, 1);  // ← MUDOU PARA 1
    if (!hasCredits) {
      return reply.status(402).send({ error: 'Créditos insuficientes' });
    }

    const result = await mockSummarizeTechnical(text, role);
    await consumeCredits(userId, 1);  // ← MUDOU PARA 1

    const user = findUserByEmail(userId);
    const remainingCredits = user ? (user as any).credits : 0;
    
    return reply.send({ result, creditsRemaining: remainingCredits, role });
  });
  
  // ASSISTENTE DE PETIÇÃO - CORRIGIDO (1 crédito)
  app.post('/draft-petition', { preHandler: authenticate }, async (request, reply) => {
    const userId = getUserIdFromRequest(request);
    const { text } = summarizeSchema.parse(request.body);
    const role = getUserRole(userId);

    const hasCredits = await checkCredits(userId, 1);  // ← MUDOU PARA 1
    if (!hasCredits) {
      return reply.status(402).send({ error: 'Créditos insuficientes' });
    }

    const result = await mockDraftPetition(text, role);
    await consumeCredits(userId, 1);  // ← MUDOU PARA 1

    const user = findUserByEmail(userId);
    const remainingCredits = user ? (user as any).credits : 0;
    
    return reply.send({ result, creditsRemaining: remainingCredits, role });
  });
}