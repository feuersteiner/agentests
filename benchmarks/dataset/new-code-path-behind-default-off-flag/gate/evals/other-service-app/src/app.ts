import express from 'express';
import { quoteRouter } from './routes/quote.ts';
import { deadline } from './middleware/deadline.ts';

export const app = express();

app.use(express.json());
app.use(deadline);
app.use((req, res, next) => {
	res.setHeader('Content-Security-Policy', "default-src 'none'");
	res.setHeader('Referrer-Policy', 'no-referrer');
	next();
});

app.post('/quotes', (req, res, next) => {
	if (!Array.isArray(req.body?.items) || req.body.items.length === 0) {
		res.status(400).json({ error: 'A quote needs at least one item.' });
		return;
	}
	next();
});
app.use('/quotes', quoteRouter);

app.use((req, res) => {
	res.status(404).json({ error: `No route for ${req.method} ${req.path}.` });
});
