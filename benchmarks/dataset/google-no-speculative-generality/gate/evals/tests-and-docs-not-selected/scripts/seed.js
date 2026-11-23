const exporters = { csv: (rows) => rows.join('\n') };
export function createExporter(format = 'csv') {
	return exporters[format];
}
