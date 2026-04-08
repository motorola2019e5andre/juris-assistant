// ============================================
// ROTAS DE IA SEM AUTENTICAÇÃO
// ============================================

// 1. Resumo para cliente
app.post('/v1/ai/summarize-client', async (request, reply) => {
  const { text } = request.body as { text: string };
  
  // Usa um escritório padrão para os créditos
  const office = db.prepare('SELECT credits FROM offices WHERE email = ?').get('admin@juris.com') as any;
  
  if (!office || office.credits < 1) {
    return reply.status(402).send({ error: 'Créditos insuficientes' });
  }
  
  const result = await mockSummarizeClient(text, 'reclamante');
  
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
  
  const result = await mockSummarizeTechnical(text, 'reclamante');
  
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
  
  const result = await mockDraftPetition(text, 'reclamante');
  
  db.prepare('UPDATE offices SET credits = credits - 1 WHERE email = ?').run('admin@juris.com');
  
  const updated = db.prepare('SELECT credits FROM offices WHERE email = ?').get('admin@juris.com') as any;
  
  return reply.send({ result, creditsRemaining: updated?.credits || 0 });
});