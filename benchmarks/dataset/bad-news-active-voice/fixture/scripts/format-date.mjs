const months = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December'
];

/** An ISO date such as 2026-11-19, written the way our emails write dates: 19 November 2026. */
export const formatDate = (iso) => {
	const [year, month, day] = iso.split('-');
	return `${day} ${months[Number(month) - 1]} ${year}`;
};
