export type Customer = {
	name: string;
	email: string;
	/** In international format, such as +31612345678, or null when the customer gave none. */
	phone: string | null;
};

export type CartLine = {
	sku: string;
	quantity: number;
};

export type OrderLine = {
	sku: string;
	name: string;
	quantity: number;
	lineCents: number;
};

export type Order = {
	id: string;
	customer: Customer;
	lines: OrderLine[];
	totalCents: number;
};
