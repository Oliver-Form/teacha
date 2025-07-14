import '@fastify/jwt'

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      userId: string
      role: string
      email?: string
    }
    user: {
      userId: string
      role: string
      email?: string
    }
  }
}

export interface JWTPayload {
  userId: string
  role: string
  email?: string
}
