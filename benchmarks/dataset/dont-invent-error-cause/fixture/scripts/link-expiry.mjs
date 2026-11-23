/** The date a link stops working, as YYYY-MM-DD: `days` days after the day it was sent. */
export const expiresOn = (sentOn, days) => {
	const [year, month, day] = sentOn.split('-').map(Number);
	return `${year}-${String(month).padStart(2, '0')}-${String(day + days).padStart(2, '0')}`;
};
