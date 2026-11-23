const units = ['B', 'KB', 'MB', 'GB'];

/** A size in bytes as people read it, in steps of 1024: 1536 becomes "1.5 KB". */
export const formatSize = (bytes) => {
	let value = bytes;
	let unit = 0;
	while (value >= 1024 && unit < units.length - 1) {
		value /= 1024;
		unit += 1;
	}
	return `${Number(value.toFixed(1))} ${units[unit]}`;
};

/** An hour of the day as the sync settings show it: 14 becomes "14:00". */
export const formatHour = (hour) => `${hour}:00`;
