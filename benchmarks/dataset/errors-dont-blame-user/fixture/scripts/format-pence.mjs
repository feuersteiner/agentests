/** An amount in pence as pounds, for emails and reports: 123456 becomes "£1,234.56". */
export const formatPence = (pence) => {
	const pounds = Math.floor(pence / 100);
	const rest = pence % 100;
	return `£${pounds.toLocaleString('en-GB')}.${rest}`;
};
