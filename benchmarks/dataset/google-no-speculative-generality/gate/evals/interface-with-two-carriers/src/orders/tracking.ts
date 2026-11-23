/** A parcel carrier we ship with. */
interface Carrier {
	trackingUrl(trackingCode: string): string;
	isValidCode(trackingCode: string): boolean;
}

const postnl: Carrier = {
	trackingUrl: (trackingCode) => `https://postnl.example/track/${trackingCode}`,
	isValidCode: (trackingCode) => /^3S[A-Z0-9]{8,13}$/.test(trackingCode)
};

const dhl: Carrier = {
	trackingUrl: (trackingCode) => `https://dhl.example/parcel?code=${trackingCode}`,
	isValidCode: (trackingCode) => /^JVGL\d{16}$/.test(trackingCode)
};

const carriers: Record<'postnl' | 'dhl', Carrier> = { postnl, dhl };

/** The page where the customer can follow the parcel. */
export function trackingUrl(carrier: 'postnl' | 'dhl', trackingCode: string): string {
	const handler = carriers[carrier];
	if (!handler.isValidCode(trackingCode)) {
		throw new Error(`${trackingCode} is not a ${carrier} tracking code`);
	}
	return handler.trackingUrl(trackingCode);
}
