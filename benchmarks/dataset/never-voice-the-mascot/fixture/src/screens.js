/** Each screen's route and the locale keys of its title and, where it has one, its empty state. */
export const screens = [
	{ route: '/parcels', title: 'parcels.title' },
	{ route: '/archive', title: 'archive.title', empty: 'archive.empty' },
	{ route: '/search', title: 'search.placeholder', empty: 'search.empty' },
	{ route: '/settings', title: 'settings.title' },
	{ route: '/settings/notifications', title: 'settings.notifs', hint: 'settings.notifsHint' }
];

/** The string at a dotted key of a locale, or undefined. */
export const lookup = (locale, key) =>
	key.split('.').reduce((node, part) => (node == null ? undefined : node[part]), locale);
