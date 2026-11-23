/** A discount that may apply to an order. Add a discount by implementing this and listing it below. */
export interface DiscountRule {
	readonly name: string;
	applies(subtotalCents: number): boolean;
	amountCents(subtotalCents: number): number;
}

export class PercentageOverThreshold implements DiscountRule {
	readonly name: string;
	private readonly thresholdCents: number;
	private readonly rate: number;

	constructor(name: string, thresholdCents: number, rate: number) {
		this.name = name;
		this.thresholdCents = thresholdCents;
		this.rate = rate;
	}

	applies(subtotalCents: number): boolean {
		return subtotalCents > this.thresholdCents;
	}

	amountCents(subtotalCents: number): number {
		return Math.round(subtotalCents * this.rate);
	}
}

/** The active discounts, in the order they are tried. */
export const discountRules: DiscountRule[] = [new PercentageOverThreshold('big-order', 20000, 0.1)];

/** The discount on an order with this subtotal: the first rule that applies, or nothing. */
export function discountFor(subtotalCents: number): number {
	for (const rule of discountRules) {
		if (rule.applies(subtotalCents)) return rule.amountCents(subtotalCents);
	}
	return 0;
}
