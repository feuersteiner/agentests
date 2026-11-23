import { writeFile } from 'node:fs/promises';
import { exportReport, formatReport, loadOrders, monthlyReport } from '../orders/report.ts';

const [month, csvPath] = process.argv.slice(2);
if (!month || !/^\d{4}-\d{2}$/.test(month)) {
	console.error('Usage: node src/cli/report.ts <YYYY-MM> [<file.csv>]');
	process.exit(1);
}

const report = monthlyReport(await loadOrders(), month);
if (csvPath) {
	await writeFile(csvPath, exportReport(report, 'csv'));
	console.log(`Wrote ${report.orders.length} orders to ${csvPath}`);
} else {
	for (const line of formatReport(report)) console.log(line);
}
