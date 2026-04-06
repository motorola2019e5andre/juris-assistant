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
// ROTAS DE AUTENTICAÇÃO
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

function getUserIdFromRequest(request: any): string {
  const user = request.user as { id: string };
  return user.id;
}

// Registro
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

// Login
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

// Health check
app.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
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