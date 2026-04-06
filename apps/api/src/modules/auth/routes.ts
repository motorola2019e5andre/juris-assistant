import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { findUserByEmail, createUser, updateUserCredits, getUserRole, updateUserRole } from '../../lib/db';

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

const updateRoleSchema = z.object({
  role: z.enum(['reclamante', 'reclamada']),
});

// Helper para pegar userId do token
function getUserIdFromRequest(request: any): string {
  const user = request.user as { id: string };
  return user.id;
}

export default async function authRoutes(app: FastifyInstance) {

  // Registro com role
  app.post('/register', async (request, reply) => {
    const body = registerSchema.parse(request.body);

    const existingUser = findUserByEmail(body.email);
    if (existingUser) {
      return reply.status(400).send({ error: 'E-mail já cadastrado' });
    }

    const hashedPassword = await bcrypt.hash(body.password, 10);
    const user = createUser(body.name, body.email, hashedPassword, body.role);

    const token = app.jwt.sign({ id: user.id, role: user.role });

    return reply.send({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        credits: user.credits,
        role: user.role
      }
    });
  });

  // Login
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

    const role = getUserRole((user as any).id);
    const token = app.jwt.sign({ id: (user as any).id, role: role });

    return reply.send({
      token,
      user: {
        id: (user as any).id,
        name: (user as any).name,
        email: (user as any).email,
        credits: (user as any).credits,
        role: role,
      },
    });
  });

  // Atualizar role (reclamante/reclamada)
  app.put('/user/role', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.status(401).send({ error: 'Não autorizado' });
    }
    
    const userId = getUserIdFromRequest(request);
    const { role } = updateRoleSchema.parse(request.body);

    updateUserRole(userId, role);
    
    // Gera novo token com a nova role
    const newToken = app.jwt.sign({ id: userId, role: role });

    return reply.send({ success: true, role: role, token: newToken });
  });

  // Obter role atual
  app.get('/user/role', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.status(401).send({ error: 'Não autorizado' });
    }
    
    const userId = getUserIdFromRequest(request);
    const role = getUserRole(userId);

    return reply.send({ role: role });
  });
}