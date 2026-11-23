export interface Address {
	name: string;
	street: string;
	houseNumber: string;
	postcode: string;
	city: string;
	country: 'NL' | 'BE' | 'DE';
}

export interface Label {
	lines: string[];
	weightGrams: number;
}

const countryNames = { NL: 'Netherlands', BE: 'Belgium', DE: 'Germany' };

/** The address as the lines printed on a parcel label. */
export function addressLines(address: Address): string[] {
	return [
		address.name,
		`${address.street} ${address.houseNumber}`,
		`${address.postcode} ${address.city}`,
		countryNames[address.country].toUpperCase()
	];
}

/** The label for a parcel of this weight to this address. */
export function makeLabel(address: Address, weightGrams: number): Label {
	if (weightGrams <= 0) throw new Error('A parcel must weigh something');
	return { lines: addressLines(address), weightGrams };
}
