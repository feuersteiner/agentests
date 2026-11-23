const carriers = [
	{ id: 'postnl', pattern: /^3S[A-Z0-9]{11,13}$/ },
	{ id: 'dhl', pattern: /^JD\d{16,18}$/ },
	{ id: 'ups', pattern: /^1Z[A-Z0-9]{16}$/ }
];

/** A tracking number as carriers print it: upper case, without spaces at either end. */
export const normalise = (input) => input.trim().toUpperCase();

/** The id of the carrier whose format the tracking number has, or null. */
export const detectCarrier = (input) => {
	const number = normalise(input);
	const match = carriers.find((carrier) => carrier.pattern.test(number));
	return match ? match.id : null;
};
