/**
 * Reads a client list from CSV text with a header row holding a "name" and an "email" column.
 * Returns the clients and the number of rows skipped because they had no email.
 */
export const parseClients = (csv) => {
	const [header, ...rows] = csv.split('\n').filter((line) => line.trim() !== '');
	const columns = header.split(',').map((column) => column.trim().toLowerCase());
	const nameAt = columns.indexOf('name');
	const emailAt = columns.indexOf('email');
	const clients = [];
	let skipped = 0;
	for (const row of rows) {
		const cells = row.split(',');
		const name = cells[nameAt];
		const email = cells[emailAt];
		if (!email) {
			skipped += 1;
			continue;
		}
		clients.push({ name, email });
	}
	return { clients, skipped };
};
