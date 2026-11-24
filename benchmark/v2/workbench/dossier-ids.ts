/** Fixed approved situation mapping; simple refund pilot IDs are independent. */
export const approvedDossierIds: readonly string[] = Array.from(
	{ length: 10 },
	(_, index) => `complex-support-${String(index + 1).padStart(2, '0')}`
);
