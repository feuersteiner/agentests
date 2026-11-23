import { handle } from './app.ts';
import { seed } from './seed.ts';

seed();

const server = Bun.serve({ port: Number(process.env.PORT ?? 3000), fetch: handle });

console.log(`cairn-api listening on ${server.url}`);
