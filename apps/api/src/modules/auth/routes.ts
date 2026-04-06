import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { findUserByEmail, createUser, updateUserCredits, getUserRole } from '../../lib/db';

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
  app.put('/user/role', { preHandler: authenticate }, async (request, reply) => {
    const userId = getUserIdFromRequest(request);
    const { role } = updateRoleSchema.parse(request.body);
    
    updateUserRole(userId, role);
    
    return reply.send({ success: true, role: role });
  });
  
  // Obter role atual
  app.get('/user/role', { preHandler: authenticate }, async (request, reply) => {
    const userId = getUserIdFromRequest(request);
    const role = getUserRole(userId);
    
    return reply.send({ role: role });
  });
}

// Helper para pegar userId do token
function getUserIdFromRequest(request: FastifyInstance['jwt']): string {
  const user = (request as any).user as { id: string };
  return user.id;
}