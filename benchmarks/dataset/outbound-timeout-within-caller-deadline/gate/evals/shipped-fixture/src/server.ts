import { PORT } from './config.ts';
import { withDeadline } from './middleware/deadline.ts';
import { health } from './routes/health.ts';
import { quote } from './routes/quote.ts';

const quoteHandler = withDeadline(quote);

const server = Bun.serve({
	port: PORT,
	fetch(request) {
		const { pathname } = new URL(request.url);
		if (request.method === 'GET' && pathname === '/quote') return quoteHandler(request);
		if (request.method === 'GET' && pathname === '/health') return health();
		return Response.json({ error: 'not found' }, { status: 404 });
	}
});

console.log(`quote-api listening on ${server.url}`);
