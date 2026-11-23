/** The onboarding checklist's steps, in the order they are shown. */
export const steps = ['add_logo', 'set_tax_rate'];

/**
 * How far an account is through the checklist. `state` maps a step to "done", "skipped" or
 * nothing when the step is still open.
 */
export const progress = (state) => {
	const done = steps.filter((step) => state[step]).length;
	return { done, total: steps.length, finished: done === steps.length };
};
