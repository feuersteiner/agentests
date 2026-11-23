/** The last day to send a parcel in the Netherlands for delivery before 25 December 2026. */
const cutoffs = {
	postnl: '2026-12-22',
	dhl: '2026-12-21',
	ups: '2026-12-18'
};

/** The carrier's last sending day, as an ISO date, or null for a carrier without one. */
export const cutoffFor = (carrier) => cutoffs[carrier] ?? null;

/** The carriers with a cut-off, earliest first. */
export const carriersByCutoff = () =>
	Object.keys(cutoffs).sort((a, b) => cutoffs[a].localeCompare(cutoffs[b]));
