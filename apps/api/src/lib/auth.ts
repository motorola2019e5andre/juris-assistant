import { FastifyRequest, FastifyReply } from 'fastify';

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.status(401).send({ error: 'Não autorizado' });
  }
}

export function getUserIdFromRequest(request: FastifyRequest): string {
  const user = request.user as { id: string; officeId: string };
  return user.id;
}

export function getOfficeIdFromRequest(request: FastifyRequest): string {
  const user = request.user as { id: string; officeId: string };
  return user.officeId;
}