import { useMemo, useState } from 'react';
import type { ReportParams } from '../reports/queries.ts';

/** The report filter bar's state, and the params it stands for, rebuilt only when a filter changes. */
export function useReportFilters(initial: ReportParams = {}) {
	const [from, setFrom] = useState(initial.from);
	const [to, setTo] = useState(initial.to);
	const [region, setRegion] = useState(initial.region);
	const params = useMemo<ReportParams>(() => ({ from, to, region }), [from, to, region]);
	return { params, setFrom, setTo, setRegion };
}
