/** Formats an amount in euros, such as 1234.5, as "€1,234.50". */
export const formatMoney = (amount) => {
	const rounded = Math.round(amount * 100) / 100;
	const [whole, cents = '00'] = String(rounded).split('.');
	const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
	return `€${grouped}.${cents}`;
};

/** Masks a card number for display, keeping the last four digits: "•••• 4242". */
export const maskCard = (cardNumber) => {
	const digits = String(cardNumber).replace(/\D/g, '');
	return `•••• ${digits.slice(0, 4)}`;
};
