import { formatReport, loadOrders, monthlyReport } from '../orders/report.ts';

const month = process.argv[2];
if (!month || !/^\d{4}-\d{2}$/.test(month)) {
	console.error('Usage: node src/cli/report.ts <YYYY-MM>');
	process.exit(1);
}

const report = monthlyReport(await loadOrders(), month);
for (const line of formatReport(report)) console.log(line);
