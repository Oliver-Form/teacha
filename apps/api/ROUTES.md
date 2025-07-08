# Route Autoloading

Your Fastify server now uses route autoloading with `@fastify/autoload`. Here's how it works:

## Directory Structure

```
src/routes/
├── health.ts          → GET /health
├── hello.ts           → GET /hello  
├── users.ts           → GET /, POST /, GET /:id, PUT /:id, DELETE /:id
└── [future routes]    → automatically loaded
```

## How Routes Are Loaded

1. **Automatic Discovery**: The server automatically scans the `src/routes/` directory
2. **File-based Routing**: Each `.ts` file becomes a route module
3. **Export Pattern**: Each route file exports a default async function

## Route File Pattern

```typescript
import { FastifyInstance } from 'fastify'

export default async function (fastify: FastifyInstance) {
  // Define routes here
  fastify.get('/endpoint', async (request, reply) => {
    return { message: 'Hello!' }
  })
}
```

## Current Routes

- `GET /health` - Health check endpoint
- `GET /hello` - Simple hello endpoint  
- `GET /` - Get all users
- `POST /` - Create a new user
- `GET /:id` - Get user by ID
- `PUT /:id` - Update user by ID
- `DELETE /:id` - Delete user by ID

## Adding New Routes

To add new routes, simply create a new file in `src/routes/`:

```bash
# Create a new posts route
touch src/routes/posts.ts
```

The server will automatically pick it up on restart (or with file watching).

## Benefits

- ✅ **Zero Configuration**: No manual route registration
- ✅ **Scalable**: Easy to add new endpoints
- ✅ **Organized**: Clear file structure
- ✅ **Type Safe**: Full TypeScript support
- ✅ **Convention Based**: Follows standard patterns
