import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { findUserByEmail, createUser, updateUserCredits } from '../../lib/db';

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export default async function authRoutes(app: FastifyInstance) {
  app.post('/register', async (request, reply) => {
    const body = registerSchema.parse(request.body);
    
    const existingUser = findUserByEmail(body.email);
    if (existingUser) {
      return reply.status(400).send({ error: 'E-mail já cadastrado' });
    }

    const hashedPassword = await bcrypt.hash(body.password, 10);
    const user = createUser(body.name, body.email, hashedPassword);

    const token = app.jwt.sign({ id: user.id });
    
    return reply.send({ token, user: { id: user.id, name: user.name, email: user.email, credits: user.credits } });
  });

  app.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);
    
    const user = findUserByEmail(body.email);
    if (!user) {
      return reply.status(401).send({ error: 'Credenciais inválidas' });
    }

    const validPassword = await bcrypt.compare(body.password, (user as any).password);
    if (!validPassword) {
      return reply.status(401).send({ error: 'Credenciais inválidas' });
    }

    const token = app.jwt.sign({ id: (user as any).id });
    
    return reply.send({
      token,
      user: {
        id: (user as any).id,
        name: (user as any).name,
        email: (user as any).email,
        credits: (user as any).credits,
      },
    });
  });
}