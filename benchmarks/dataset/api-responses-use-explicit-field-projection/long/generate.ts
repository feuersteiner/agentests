// Writes the long material of this entry's long tasks: the open issues of marginalia's old tracker,
// one Markdown file each, under docs/issues/. Deterministic: fixed seeds, no clock, no network.
//   bun long/generate.ts <workspace root>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.argv[2];
if (!root) throw new Error('Usage: bun long/generate.ts <dir>');

const mulberry32 = (seed: number) => () => {
	seed = (seed + 0x6d2b79f5) | 0;
	let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
type Rand = () => number;
const int = (r: Rand, low: number, high: number) => low + Math.floor(r() * (high - low + 1));
const pick = <T>(r: Rand, items: readonly T[]): T => items[Math.floor(r() * items.length)]!;
const shuffle = <T>(r: Rand, items: readonly T[]): T[] => {
	const copy = [...items];
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(r() * (i + 1));
		[copy[i], copy[j]] = [copy[j]!, copy[i]!];
	}
	return copy;
};
const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const pad = (value: number, width = 2) => String(value).padStart(width, '0');

// People. Developers maintain marginalia; the desk is the magazine's editors; the rest are outside contributors.
const devs = ['Tobias Lindqvist', 'Renske de Boer', 'Amara Okafor', 'Jun Takeda'];
const desk = ['Imogen Vasquez', 'Callum Byrne', 'Fenella Brandt'];
const outside = ['pipit-dev', 'wren42', 'Sorrel Haddad', 'M. Achterberg', 'lapwing_ops', 'Dario Pinto'];

interface Option {
	/** A noun phrase, such as "a cursor on published_at". */
	name: string;
	/** A clause in its favour, without a capital or a full stop. */
	pro: string;
	/** A clause against it. */
	con: string;
}
interface Topic {
	thing: string;
	where: string;
	asks: [string, string][];
	a: Option;
	b: Option;
	facts: string[];
	desk: string;
	art: 'log' | 'test' | 'curl' | 'timing';
}

const topics: Topic[] = [
	{
		thing: 'the posts list',
		where: 'ListPosts in internal/handler/post.go',
		asks: [
			['The archive page loads every post in one request', 'GET /api/posts returns the whole archive in one response. The archive page of Field Notes waits for all of it before it draws the first row, and on a phone on the reserve wifi that is several seconds of blank page.'],
			['Posts list needs a way to ask for the next batch', 'The site wants to show twenty posts and a "more" button. Today it has to fetch everything and cut the list itself, which defeats the point.']
		],
		a: { name: 'a `before` cursor on published_at', pro: 'it stays correct when a post is published while a reader is paging', con: 'two posts published in the same second would need a tie-break on the slug' },
		b: { name: 'plain `page` and `per_page` parameters', pro: 'the site team already has a pager component that speaks pages', con: 'a newly published post shifts every page by one and readers see a repeat' },
		facts: ['The archive holds a little over 1,900 posts back to 2011.', 'The store sorts the slice on every call; nothing is kept in order.', 'The site only ever shows the newest posts first, never another order.'],
		desk: 'the archive page is where readers land from the print issue\'s QR code, so it is the slow page that people actually see',
		art: 'timing'
	},
	{
		thing: 'the comment list',
		where: 'ListComments in internal/handler/comment.go',
		asks: [
			['Long comment threads come back in one piece', 'The spring count post has over 600 approved comments, and the comment list sends all of them every time the page opens.'],
			['Let the site ask for comments newer than the ones it has', 'The post page polls for new comments every minute while it is open, and each poll downloads the full thread again.']
		],
		a: { name: 'a `since` parameter that takes the last comment id', pro: 'the poll becomes a few bytes when nothing is new', con: 'it does nothing for the first load of a long thread' },
		b: { name: 'a `limit` with the newest comments first on request', pro: 'the first load gets small as well', con: 'the README promises oldest first, and the site would have to reverse what it gets' },
		facts: ['Only eleven posts have more than 100 comments, all of them count or survey posts.', 'Approved comments never change, so anything the site already holds stays valid.', 'The polling interval is set in the site\'s code, not here.'],
		desk: 'the count posts are the ones readers keep open all day, refreshing to see who else has reported',
		art: 'log'
	},
	{
		thing: 'the feed',
		where: 'a new handler next to ListPosts',
		asks: [
			['Bring back the RSS feed', 'The old site had a feed at /feed.xml, and a few hundred readers still have it in their readers. Since the move to marginalia it answers 404.'],
			['Feed readers want full text, the newsletter tool wants summaries', 'The newsletter tool reads a feed to build the Friday digest and wants a short summary per post. Readers who follow by feed have asked for the whole text.']
		],
		a: { name: 'one Atom feed with full text', pro: 'there is a single document to keep valid', con: 'the newsletter tool would have to cut the summaries itself' },
		b: { name: 'two feeds, `/feed.xml` in full and `/feed/summary.xml` cut to the first paragraph', pro: 'each consumer gets what it asked for with no logic on its side', con: 'two feeds drift apart the first time someone touches one of them' },
		facts: ['The proxy still sees about 2,300 requests a day for /feed.xml.', 'Post bodies are stored as Markdown; a feed needs HTML.', 'The newsletter goes out on Fridays at 07:00 and reads the feed at 06:30.'],
		desk: 'the feed readers are our oldest subscribers and they write letters when something they rely on disappears',
		art: 'log'
	},
	{
		thing: 'slug lookup',
		where: 'GetPost in internal/store/store.go',
		asks: [
			['Links from the print issue with capital letters answer 404', 'The printed URL was /posts/Kestrels-On-The-Gasholder and the slug is all lower case. Readers typing it from the page get the not-found page.'],
			['Renaming a post breaks every link to it', 'An editor corrected a species name in a title, the slug changed with it, and the links in last week\'s newsletter now go nowhere.']
		],
		a: { name: 'a table of old slugs that redirect to the current one', pro: 'every link that ever worked keeps working', con: 'it is one more table to carry through the move to a real database' },
		b: { name: 'freezing the slug at first publication', pro: 'there is nothing to store and nothing to redirect', con: 'a slug with a misspelt species name stays misspelt forever' },
		facts: ['Slugs are compared byte for byte.', 'Seven posts were renamed after publication this year.', 'The site builds its URLs from the slug the API returns.'],
		desk: 'we correct titles more often than you would think, mostly when a record committee changes an identification',
		art: 'curl'
	},
	{
		thing: 'post bodies',
		where: 'the Body field that GetPost sends',
		asks: [
			['Tables in posts arrive as pipes and dashes', 'Count results are written as Markdown tables. The API sends the Markdown as it is and the site\'s renderer does not know tables.'],
			['Decide where Markdown becomes HTML', 'The site renders Markdown in the browser, the newsletter tool renders it again with a different library, and footnotes come out differently in each.']
		],
		a: { name: 'rendering to HTML in marginalia and sending both', pro: 'every consumer shows the same thing', con: 'the response for a long post roughly doubles' },
		b: { name: 'leaving rendering to the consumers and agreeing on one Markdown flavour', pro: 'marginalia stays a thin store of text', con: 'three codebases have to keep their renderers in step by hand' },
		facts: ['The standard library has no Markdown renderer, and the module has no dependencies today.', 'About one post in six has a table, one in twenty a footnote.', 'The print desk exports the same Markdown to InDesign.'],
		desk: 'writers paste tables from the count spreadsheet and expect them to look like tables',
		art: 'curl'
	},
	{
		thing: 'comment spam',
		where: 'CreateComment in internal/handler/comment.go',
		asks: [
			['The moderation queue fills with link spam overnight', 'On Monday the queue had 340 pending comments, of which nine were from readers. The rest advertised replica watches and a casino.'],
			['Comments with only a link should not reach the queue', 'Most of the junk is a single URL and nothing else. An editor still has to look at each one.']
		],
		a: { name: 'a hidden form field that real browsers leave empty', pro: 'it costs nothing and catches the dumb bots', con: 'the site has to add the field, and anything that posts JSON directly never sees it' },
		b: { name: 'a limit of two links per comment, rejected with a 400', pro: 'it works however the comment arrives', con: 'readers do paste three or four links to sightings pages, and they would be turned away' },
		facts: ['Nothing is published without approval, so no spam has reached a reader.', 'The junk comes in bursts between 01:00 and 04:00 UTC.', 'Genuine comments average about 40 words.'],
		desk: 'clearing the queue on a Monday takes most of an hour that should go to the letters page',
		art: 'log'
	},
	{
		thing: 'comment posting',
		where: 'the public group in internal/router/router.go',
		asks: [
			['One client posted 4,000 comments in ten minutes', 'A script hammered POST /api/posts/{slug}/comments on Tuesday night. Every one of them is now in the pending list.'],
			['Readers on the reserve wifi get refused when they comment', 'The proxy\'s blanket limit counts everyone behind the visitor-centre router as one client, so the fourth person to comment in an hour gets a 429.']
		],
		a: { name: 'a small token bucket per client inside marginalia', pro: 'the limit sits next to the thing it protects and can differ per route', con: 'it is state in memory that vanishes on restart and is wrong the day there are two instances' },
		b: { name: 'leaving the limit to the proxy and tuning it per path', pro: 'no new code here at all', con: 'the proxy configuration lives in another repository that only two people can change' },
		facts: ['The proxy allows 30 requests a minute per client on every path.', 'The server has one instance and no plan for a second.', 'A comment post takes under a millisecond to handle.'],
		desk: 'the visitor centre is exactly where people comment from, standing in front of the sightings board',
		art: 'log'
	},
	{
		thing: 'moderation',
		where: 'internal/handler/admin.go',
		asks: [
			['Editors can approve a comment but not turn one down', 'The only admin action is approve. A comment nobody wants stays pending forever and the list only grows.'],
			['Approving forty comments means forty clicks', 'After a count post the queue is long and almost all of it is fine. Each approval is its own request and its own page refresh.']
		],
		a: { name: 'a reject action that marks the comment and hides it from the queue', pro: 'the queue shows only what still needs a decision', con: 'rejected comments pile up in the store unless something clears them' },
		b: { name: 'a bulk endpoint that takes a list of ids and one decision', pro: 'it covers approve and reject in one go and cuts the clicks', con: 'a slip of the hand approves forty comments at once' },
		facts: ['The pending list is oldest first and has no paging.', 'There are three editors and they moderate in turn, a week each.', 'The oldest pending comment today is from February.'],
		desk: 'whoever has the moderation week does it between other jobs, in five-minute visits',
		art: 'test'
	},
	{
		thing: 'the pending queue',
		where: 'AdminListPending in internal/handler/admin.go',
		asks: [
			['Show how many comments are waiting without loading them', 'The editors\' dashboard wants a badge with the number of pending comments. Today it downloads the full list to count it.'],
			['Pending comments should be grouped by post', 'The queue is one flat list. Moderating is much quicker when the comments of one post sit together, because the editor has the post in mind.']
		],
		a: { name: 'a count endpoint beside the list', pro: 'the dashboard polls something tiny', con: 'it is a second route that must agree with the first' },
		b: { name: 'a `group_by=post` option on the existing list', pro: 'one route keeps serving every view', con: 'the response changes shape depending on a parameter, which the dashboard has to handle' },
		facts: ['The dashboard polls every 30 seconds while it is open.', 'On a normal day between 5 and 25 comments are pending.', 'Count posts push that to several hundred for a few days.'],
		desk: 'the badge is what tells us to go and look; without it the queue is checked when somebody remembers',
		art: 'timing'
	},
	{
		thing: 'search',
		where: 'a new route in the public group',
		asks: [
			['Readers cannot search the blog', 'The site\'s search box sends people to a web search restricted to our domain. It misses new posts for days.'],
			['Search by species name should find posts that use the old name', 'A reader searching "bearded tit" finds nothing published since the style guide moved to "bearded reedling", and the reverse.']
		],
		a: { name: 'a simple substring search over titles and bodies in the store', pro: 'it is thirty lines and good enough for 1,900 posts', con: 'it knows nothing about plurals, accents or alternative names' },
		b: { name: 'building an index file at publish time that the site searches in the browser', pro: 'the API serves a static file and search works offline in the hide', con: 'the index is a download of its own on every first visit' },
		facts: ['The whole archive is about 6 MB of Markdown.', 'The style guide lists 140 species whose common name changed.', 'The site\'s logs show roughly 300 searches a day.'],
		desk: 'most searches are a species and a place, typed by someone planning a trip',
		art: 'timing'
	},
	{
		thing: 'tags',
		where: 'model.Post and the store',
		asks: [
			['Posts need tags', 'The site wants pages such as "all posts about waders". There is nothing on a post to say what it is about.'],
			['Agree on one list of tags before they multiply', 'The first test import of tags from the old site has "raptor", "raptors", "Raptors" and "birds of prey" as four different tags.']
		],
		a: { name: 'free-text tags typed by the writer', pro: 'writers can tag something new the day it matters', con: 'the list fragments within a month, as the import shows' },
		b: { name: 'a fixed list kept in the repository that the API validates against', pro: 'tag pages stay meaningful', con: 'adding a tag needs a release' },
		facts: ['The old site had 412 distinct tags for 1,900 posts.', '260 of those tags were used once.', 'The print index uses 38 subject headings.'],
		desk: 'the print index headings have worked for twenty years and readers know them',
		art: 'curl'
	},
	{
		thing: 'drafts and scheduling',
		where: 'the Draft flag of model.Post',
		asks: [
			['Publish a post at a set time', 'Posts that go with the print issue should appear at 06:00 on publication day. Today an editor sets an alarm and flips the draft flag by hand.'],
			['A draft with a publication date in the past shows the wrong date once published', 'The writer set the date when starting the draft. Published three weeks later, the post sorted below everything from the weeks between.']
		],
		a: { name: 'treating a post as published once its published_at has passed and Draft is false', pro: 'there is no background job, only a comparison at read time', con: 'every list call compares dates, and a wrong clock publishes early' },
		b: { name: 'a small ticker that flips Draft at the scheduled minute', pro: 'the stored state always says what readers see', con: 'if the process is down at 06:00 nothing is published until someone notices' },
		facts: ['The print issue comes out on the first Thursday of the month.', 'About eight posts a month are tied to it.', 'The server\'s clock is in UTC and the desk works in UK time.'],
		desk: 'the alarm has been missed twice this year, both times on a bank holiday week',
		art: 'test'
	},
	{
		thing: 'images',
		where: 'outside marginalia today',
		asks: [
			['Where do post images live?', 'Writers upload photos to the old site\'s media folder and paste the URL into the post. That server is due to be switched off.'],
			['Posts load 9 MB photographs', 'Nothing resizes what writers upload. One post about a gull roost has six images straight from the camera.']
		],
		a: { name: 'an upload route in marginalia that stores files on disk and serves resized copies', pro: 'writers have one place to go', con: 'the service stops being a small JSON API and starts needing disk and an image library' },
		b: { name: 'keeping images on the existing image host and only storing their URLs', pro: 'marginalia does not grow at all', con: 'someone still has to resize, and the host has no interface for writers' },
		facts: ['The media folder holds 14 GB.', 'img.corvidfinch.example already serves the staff portraits.', 'The site\'s widest column is 880 pixels.'],
		desk: 'photographers send what the camera gives them and will not be learning an image editor',
		art: 'log'
	},
	{
		thing: 'caching',
		where: 'writeJSON in internal/handler/handler.go',
		asks: [
			['Post responses carry no cache headers', 'Every page view fetches the post again, even though a published post changes perhaps once in its life.'],
			['The proxy cached the posts list for an hour and hid a new post', 'Someone set a blanket cache rule on the proxy. The Thursday post did not appear on the front page until after lunch.']
		],
		a: { name: 'an ETag from a hash of the response body', pro: 'clients revalidate cheaply and never show stale text', con: 'the server still builds the whole response to hash it' },
		b: { name: 'a short `max-age` on lists and a long one on single posts', pro: 'most requests never reach the server', con: 'a corrected post stays wrong in caches until the age runs out' },
		facts: ['A post is edited after publication in about 4% of cases.', 'The front page calls the list on every view.', 'The proxy can purge by path, by hand.'],
		desk: 'corrections matter to us; a wrong identification left up for a day gets quoted elsewhere',
		art: 'curl'
	},
	{
		thing: 'cross-origin requests',
		where: 'the mux in internal/router/router.go',
		asks: [
			['The events microsite cannot read posts from the browser', 'events.corvidfinch.example wants to show the three newest posts. The browser blocks the request because the API sends no CORS headers.'],
			['Preflight requests to the comment route answer 405', 'The new site build sends JSON with a content type that triggers a preflight. The OPTIONS request has no route.']
		],
		a: { name: 'a list of allowed origins read from an environment variable', pro: 'adding a microsite is a config change', con: 'a typo in the variable silently locks a site out' },
		b: { name: 'allowing any origin on the GET routes of the public group only', pro: 'the public data is public anyway and there is nothing to configure', con: 'the comment route still needs its own answer' },
		facts: ['Three of the magazine\'s sites call the API from the browser.', 'The main site is served from the same origin through the proxy, so it never noticed.', 'Go 1.22 route patterns need the method spelled out.'],
		desk: 'the events team builds a new microsite for every festival and will ask again each time',
		art: 'curl'
	},
	{
		thing: 'health checks',
		where: 'cmd/server/main.go',
		asks: [
			['Give the proxy something to probe', 'The proxy checks GET /api/posts every ten seconds to decide whether marginalia is up. That is a full list each time.'],
			['The process was up but answered nothing for six minutes', 'On the 3rd the server accepted connections and never replied. The proxy\'s probe timed out, but nothing restarted the process.']
		],
		a: { name: 'a `/healthz` route that answers 200 with no body', pro: 'the probe costs nothing and says the process can serve', con: 'it says nothing about whether the store is usable' },
		b: { name: 'a `/readyz` route that also does one store read', pro: 'it would have caught a wedged store', con: 'while the store is in memory it can never fail, so it tests nothing yet' },
		facts: ['The probe accounts for 8,640 list requests a day.', 'The service manager restarts the process only when it exits.', 'There is no timeout on the server\'s handlers.'],
		desk: 'we found out from a reader on social media, which is not how we want to find out',
		art: 'log'
	},
	{
		thing: 'logging',
		where: 'the log.Printf calls in the handlers',
		asks: [
			['Log lines cannot be tied to a request', 'When two requests fail in the same second there is no way to tell which line belongs to which.'],
			['Move the logs to key=value so the log host can index them', 'The log host parses logfmt and JSON. Ours are free text, so every search is a regular expression.']
		],
		a: { name: 'log/slog with a request id put on the context by a small middleware', pro: 'it is the standard library and gives structure and the id at once', con: 'every handler\'s log call changes in one large diff' },
		b: { name: 'keeping log.Printf and prefixing each line with the request id', pro: 'the diff is a dozen lines', con: 'the lines stay free text and the log host still cannot index them' },
		facts: ['The handlers have 14 log calls between them.', 'The proxy already sets an X-Request-Id header.', 'The log host keeps 30 days.'],
		desk: 'when a reader says "my comment vanished at about ten" we would like someone to be able to find out why',
		art: 'log'
	},
	{
		thing: 'shutdown',
		where: 'the ListenAndServe call in cmd/server/main.go',
		asks: [
			['Deploys cut off requests in flight', 'Each deploy kills the process. A reader who pressed "post comment" at that moment gets a connection error.'],
			['Set timeouts on the server', 'http.ListenAndServe uses a server with no read or write timeout. A client that opens a connection and sends nothing holds it for good.']
		],
		a: { name: 'an http.Server with timeouts and a Shutdown on SIGTERM', pro: 'in-flight requests finish and slow clients are dropped', con: 'the timeout values need choosing, and a wrong one cuts off the feed for slow readers' },
		b: { name: 'letting the proxy drain connections before the process is stopped', pro: 'nothing changes in the code', con: 'the timeouts problem is untouched' },
		facts: ['A deploy happens two or three times a week, in working hours.', 'The service manager sends SIGTERM and waits 90 seconds before SIGKILL.', 'The proxy holds idle connections for 60 seconds.'],
		desk: 'a lost comment is usually a long one, and the reader does not write it twice',
		art: 'log'
	},
	{
		thing: 'the store',
		where: 'internal/store/store.go',
		asks: [
			['Everything is lost on restart', 'The store keeps its tables in memory. A deploy wipes every comment made since the last seed.'],
			['Choose the database before the launch', 'The in-memory store was meant for the prototype. The launch date is set and there is no decision on what replaces it.']
		],
		a: { name: 'SQLite in a single file next to the binary', pro: 'there is no second service to run and backups are a file copy', con: 'it brings in the module\'s first dependency, and cgo or a pure-Go driver has to be picked' },
		b: { name: 'the Postgres instance the subscriptions system already uses', pro: 'the operations people know it and it is already backed up', con: 'the blog then goes down whenever subscriptions has maintenance' },
		facts: ['The store\'s methods already take a context and return errors.', 'The whole dataset would fit in 50 MB.', 'Subscriptions has a maintenance window on the first Sunday of the month.'],
		desk: 'we cannot launch something that forgets the readers\' comments',
		art: 'test'
	},
	{
		thing: 'local data',
		where: 'seed in cmd/server/main.go',
		asks: [
			['The seed data is too thin to develop against', 'Three posts and three comments do not show any of the problems the real archive has: long threads, long titles, accents.'],
			['Seeding should be optional', 'The binary seeds the sample rows on every start. Once there is a real database that would add the kestrels post again on each deploy.']
		],
		a: { name: 'a `-seed` flag that loads a JSON file of sample rows', pro: 'the sample can grow without touching code', con: 'a second file format to keep in step with the model' },
		b: { name: 'a separate `cmd/seed` binary', pro: 'the server binary never contains test data', con: 'two binaries to build and explain in the README' },
		facts: ['The seed function is 50 lines of literals.', 'The site team runs marginalia locally to develop against.', 'An anonymised export of the archive titles exists from the migration.'],
		desk: 'the site team keeps asking us for "a post with a really long title" to test with',
		art: 'test'
	},
	{
		thing: 'the admin token',
		where: 'requireToken in internal/router/router.go',
		asks: [
			['All three editors share one token', 'The admin token is one string in an environment variable. When someone leaves the desk it has to change for everyone.'],
			['Changing the admin token needs a restart', 'The token is read once at start-up. Rotating it means a deploy, in the middle of someone\'s moderation session.']
		],
		a: { name: 'a comma-separated list of tokens, one per editor', pro: 'one person\'s token can go without touching the others', con: 'it is still shared secrets in an environment variable, only more of them' },
		b: { name: 'putting the admin routes behind the staff single sign-on at the proxy', pro: 'leavers lose access the day their account closes', con: 'local development and the dashboard\'s scripts need another way in' },
		facts: ['The token was last changed in January.', 'The dashboard stores it in the browser.', 'The staff sign-on already protects the print desk\'s tools.'],
		desk: 'two freelancers cover moderation in August and each of them needs access for exactly four weeks',
		art: 'curl'
	},
	{
		thing: 'comment validation',
		where: 'CreateComment in internal/handler/comment.go',
		asks: [
			['Someone pasted a whole article as a comment', 'A 48,000-character comment is sitting in the queue. The dashboard takes several seconds to draw it.'],
			['Names made of emoji and control characters break the dashboard layout', 'One pending comment has a name that is forty combining marks. The table column stretches off the screen.']
		],
		a: { name: 'hard limits, 4,000 characters for the body and 80 for the name, with a 400 beyond them', pro: 'the reader finds out at once and can shorten', con: 'a careful long report from a count is exactly what would be refused' },
		b: { name: 'accepting anything and truncating for display in the dashboard only', pro: 'no reader is ever turned away', con: 'the store fills with whatever anyone sends' },
		facts: ['The longest genuine comment so far is 2,900 characters.', 'The request body is read without a size limit.', 'The site\'s form has no counter.'],
		desk: 'the long comments are often the best ones, from people who sat in a hide for six hours',
		art: 'test'
	},
	{
		thing: 'replies',
		where: 'model.Comment',
		asks: [
			['Readers want to reply to a particular comment', 'Threads on count posts are conversations, and with a flat list nobody can tell who is answering whom.'],
			['Threads on count posts are too long to follow on a phone', 'A count post gathers three hundred comments in a weekend. On a phone the reader scrolls for a minute to reach the newest ones, and loses track of which answer goes with which question.']
		],
		a: { name: 'a `parent_id` on each comment, one level deep', pro: 'the site can indent a reply under its question', con: 'moderation has to decide what happens to replies when the parent is turned down' },
		b: { name: 'staying flat and letting the site quote the comment being answered', pro: 'the model and the queue do not change', con: 'quoted text goes stale and long threads get longer' },
		facts: ['About a third of comments on count posts begin with someone\'s name and a comma.', 'The site\'s design has room for one level of indent on a phone.', 'A comment can only be approved, never edited.'],
		desk: 'the conversations are the reason people come back to a post, and at the moment they are hard to follow',
		art: 'curl'
	},
	{
		thing: 'comment removal',
		where: 'the admin group',
		asks: [
			['An approved comment cannot be taken down', 'An editor approved a comment that gave the location of a nest of a protected species. There is no way to remove it short of restarting the server.'],
			['Let readers correct a typo for a few minutes after posting', 'People reply to their own comment with "*Tuesday, not Thursday". On count posts that matters, because the date is the data.']
		],
		a: { name: 'an admin action that unapproves a comment and returns it to the queue', pro: 'it reuses the state that exists and nothing is destroyed', con: 'the comment reappears among the pending ones and can be approved again by mistake' },
		b: { name: 'an admin delete that removes the row', pro: 'gone is gone, which is what a nest location needs', con: 'there is no record of what was removed or why' },
		facts: ['Nest locations of scheduled species must come down the same day.', 'It has happened three times since launch of the prototype.', 'Comments have no notion of an owner once posted.'],
		desk: 'when the wardens ring about a nest location we need it gone in minutes, not after a deploy',
		art: 'test'
	},
	{
		thing: 'dates',
		where: 'the published_at and created_at fields',
		asks: [
			['Posts published late in the evening show tomorrow\'s date', 'A post published at 23:30 UK time in summer has a published_at of 22:30 UTC, and the newsletter tool prints the UTC date, which is right, while the site prints the local one.'],
			['Comment times jump by an hour at the clock change', 'On the last Sunday of October the thread on the migration post shows replies that appear to come before their questions.']
		],
		a: { name: 'always sending UTC with the Z suffix and leaving local time to the consumers', pro: 'there is one unambiguous instant and no time zone database in the API', con: 'every consumer has to get the conversion right, and one already does not' },
		b: { name: 'sending the time with the Europe/London offset', pro: 'naive consumers print the date the desk expects', con: 'readers abroad and any future syndication get UK time whether they want it or not' },
		facts: ['The store keeps times as time.Time in UTC.', 'The newsletter tool cuts the first ten characters of the timestamp.', 'About 9% of readers are outside the UK.'],
		desk: 'the date on a sighting is the record; a day out and the county recorder writes to us',
		art: 'curl'
	},
	{
		thing: 'species links',
		where: 'post bodies, at read time or at publish time',
		asks: [
			['Link species names to the species guide automatically', 'Writers link the first mention of each species to its guide page by hand, and forget about half the time.'],
			['Automatic species links hit the wrong words', 'The trial linked "swift" in "a swift decision" and "turnstone" inside a place name.']
		],
		a: { name: 'linking at publish time and storing the result, so an editor can remove a bad link', pro: 'a human can fix what the matcher gets wrong', con: 'when the guide gains a page, old posts do not pick it up' },
		b: { name: 'linking at read time from the current species list', pro: 'every post always reflects the current guide', con: 'nobody can correct a wrong link in one post without a special case' },
		facts: ['The species guide has 623 pages.', 'The list of names with their guide URLs is a CSV the guide team exports weekly.', '31 species names are also ordinary English words.'],
		desk: 'a wrong link on "swift" is the kind of thing that ends up on the letters page',
		art: 'timing'
	},
	{
		thing: 'related posts',
		where: 'GetPost, or a route beside it',
		asks: [
			['Show the other parts of a series', 'The winter atlas diary has fourteen parts. Each part should link to the others, and writers maintain those links by hand in every part.'],
			['"More like this" at the foot of a post', 'The site wants three related posts under each article. The old site chose them by shared tags and mostly got it wrong.']
		],
		a: { name: 'an explicit series field on the post, with a position', pro: 'the order is exactly what the writer intends', con: 'it only helps posts someone has put in a series' },
		b: { name: 'computing related posts from shared species names in the text', pro: 'it works for the whole archive with no editorial work', con: 'two posts that both mention a robin are not related in any way a reader cares about' },
		facts: ['There are 23 series in the archive, from 3 to 31 parts.', 'Parts of a series are sometimes published months apart.', 'The foot of the article page has room for three cards.'],
		desk: 'series are our most-read posts and the hand-kept links are always out of date in the early parts',
		art: 'curl'
	},
	{
		thing: 'the sitemap',
		where: 'a new public route',
		asks: [
			['Search engines find new posts days late', 'There is no sitemap. The Thursday post about the hoopoe was not in search results until the following Tuesday, by which time the bird had gone.'],
			['Drafts were briefly reachable by guessing the slug', 'Not through the API, which filters them, but the trial sitemap listed every row in the posts table, drafts included.']
		],
		a: { name: 'a `/sitemap.xml` built on request from the published posts', pro: 'it is always current and uses the same filter as the list', con: 'crawlers fetch it often and it is the whole archive each time' },
		b: { name: 'writing the sitemap to a file when a post is published', pro: 'serving it is free', con: 'a file that is written on one event is wrong after any other kind of change' },
		facts: ['The sitemap would hold about 1,900 URLs, well under the 50,000 limit.', 'Rarity posts get most of their traffic in the first 48 hours.', 'ListPosts already leaves drafts out.'],
		desk: 'for a rarity, being findable on day one is the whole point of writing the post',
		art: 'log'
	},
	{
		thing: 'compression',
		where: 'writeJSON, or the proxy',
		asks: [
			['Responses are sent uncompressed', 'The posts list is 410 KB of JSON and goes out as it is. Compressed it would be about 60 KB.'],
			['Compressed responses arrive truncated behind the proxy', 'With the trial gzip middleware on, long posts cut off partway on some mobile networks.']
		],
		a: { name: 'gzip in a middleware here, for responses over 1 KB', pro: 'it works wherever the binary runs', con: 'it has to cooperate with whatever the proxy also does, and the trial did not' },
		b: { name: 'turning compression on at the proxy only', pro: 'one place does it, with a battle-tested implementation', con: 'local runs and any direct caller get the uncompressed size' },
		facts: ['The proxy has compression switched off for /api.', 'The trial middleware did not set Vary.', 'Mobile is 71% of page views.'],
		desk: 'half our readers are in a field with one bar of signal',
		art: 'timing'
	},
	{
		thing: 'metrics',
		where: 'a new route outside both groups',
		asks: [
			['We have no numbers on the API', 'Questions such as "did last night\'s release make the list slower" are answered by reading proxy logs by eye.'],
			['Count comments posted and approved per day', 'The desk reports reader engagement to the board each quarter and compiles the comment numbers by hand from the dashboard.']
		],
		a: { name: 'expvar counters on a `/debug/vars` route bound to localhost', pro: 'it is the standard library and takes ten lines', con: 'nothing collects expvar here, so someone has to scrape it' },
		b: { name: 'deriving the numbers from the proxy\'s access log', pro: 'the data already exists for every request', con: 'the log knows about requests, not about approvals or anything else inside the service' },
		facts: ['The operations team runs a metrics host that scrapes HTTP endpoints.', 'The board report wants four numbers, quarterly.', 'The proxy log has timings to the millisecond.'],
		desk: 'the quarterly numbers take an afternoon to compile, and nobody trusts them',
		art: 'timing'
	},
	{
		thing: 'the test suite',
		where: 'internal/handler/handler_test.go and internal/store/store_test.go',
		asks: [
			['A store test fails about one run in thirty', 'TestListPostsNewestFirst passes locally and fails now and then on the build machine, with two posts in the wrong order.'],
			['Move the build to the current Go release', 'go.mod names a Go version two releases back. The build machine has been updated and prints a toolchain download line on every run.']
		],
		a: { name: 'giving the tests a fixed clock instead of time.Now', pro: 'the order in the test no longer depends on how fast the machine is', con: 'the store has to accept a clock, which touches every constructor call' },
		b: { name: 'spacing the test rows a second apart by hand', pro: 'it is a two-line change in the test', con: 'the underlying habit of reading the real clock in tests stays' },
		facts: ['The build machine is much faster than the laptops.', 'Two rows created in the same nanosecond tick sort unpredictably.', 'The suite runs in under a second.'],
		desk: 'we only notice the build when a correction we asked for is late because of it',
		art: 'test'
	},
	{
		thing: 'deployment',
		where: 'outside the module, in the operations repository',
		asks: [
			['Document how marginalia is deployed', 'The only description of the deploy is in one person\'s shell history. When he was on leave a fix waited four days.'],
			['Build one static binary for the server', 'The build on the server needs the Go toolchain installed there. Operations would rather copy a file.']
		],
		a: { name: 'a short `docs/deploy.md` with the exact commands and a checklist', pro: 'anyone on the team can do a deploy tomorrow', con: 'a document describes the process without making it any less manual' },
		b: { name: 'a build script that produces a versioned binary and a service unit file', pro: 'the deploy becomes copying two files', con: 'the script needs maintaining and operations has its own conventions for units' },
		facts: ['A deploy currently takes about fifteen minutes of someone\'s attention.', 'The server is a single virtual machine.', 'The module builds with CGO off today.'],
		desk: 'a four-day wait for a correction is the sort of thing we get letters about',
		art: 'log'
	},
	{
		thing: 'the weekly digest',
		where: 'a new public route, or the newsletter tool',
		asks: [
			['Give the newsletter tool the week\'s posts in one call', 'The Friday digest is built by fetching the list, then each post in turn. On a busy week that is forty requests in a few seconds.'],
			['The digest included a post that was unpublished on Thursday', 'A post was pulled for a correction on Thursday evening. The digest tool had cached it on Wednesday and sent it out on Friday.']
		],
		a: { name: 'a `since` and `until` filter on the posts list', pro: 'it is useful to more than the newsletter', con: 'the tool still fetches each body separately' },
		b: { name: 'a dedicated `/api/digest` route that returns the week with bodies', pro: 'one request gives the tool everything, fresh', con: 'it is a route with exactly one consumer, shaped around that consumer\'s quirks' },
		facts: ['The digest goes to 18,400 subscribers.', 'The tool runs at 06:30 on Fridays and keeps its own cache.', 'A typical week has between four and nine posts.'],
		desk: 'a pulled post going to eighteen thousand inboxes is the worst week we have had',
		art: 'log'
	},
	{
		thing: 'links in posts',
		where: 'a script or a scheduled job, not the request path',
		asks: [
			['Old posts are full of dead links', 'A reader counted eleven broken links in the 2019 atlas series. Many point to county society sites that have moved.'],
			['Internal links still point at the old site\'s URLs', 'Posts link to each other as /blog/2018/04/title. The new URLs are /posts/slug, and the old ones only work while the redirect table on the old server lives.']
		],
		a: { name: 'a one-off script that rewrites the internal links in the stored bodies', pro: 'the archive is fixed once and stops depending on the old server', con: 'a rewrite of 1,900 bodies is hard to review and easy to get subtly wrong' },
		b: { name: 'a monthly report of broken links for the desk to fix by hand', pro: 'a person decides what each link should become', con: 'the backlog is thousands of links and the desk has no time' },
		facts: ['The migration export found 7,200 internal links.', 'About 600 of them have no matching slug.', 'The old server is scheduled to go in the spring.'],
		desk: 'the atlas series is cited by county recorders, and its links are how they check our sources',
		art: 'log'
	}
];

// Parts of sentences. {X} is an option's name, {P} its pro, {C} its con, {T} the thing, {W} where it lives.
const openings = [
	'Writing this down before I forget the details.',
	'This came up at the desk meeting on Monday and I said I would file it.',
	'Filed after a conversation in the corridor; apologies if it duplicates something.',
	'I ran into this while working on something else and it deserves its own issue.',
	'Passing this on from the site team, who do not have accounts on this tracker.',
	'Second attempt at describing this, the first one was eaten by the tracker.',
	'Not urgent, but it has now happened often enough that I want it recorded.',
	'We talked about this at the launch planning meeting and nobody owned it, so here it is.',
	'A reader wrote in about this, and they are right.',
	'Opening this so there is one place for the discussion instead of four chat threads.'
];
const closings = [
	'Happy to give more detail or test anything.',
	'I have not looked at the code, so I may be describing this in the wrong terms.',
	'I can help with this after the print deadline.',
	'No strong view on how, only that it gets looked at before the launch.',
	'If this is already planned somewhere, point me at it and close this.',
	'Screens and timings available on request.',
	'Tell me if I should be filing this somewhere else.'
];
const repro = [
	'I can see this locally on a fresh checkout. The relevant code is {W}.',
	'Confirmed. It is easy to trigger once you know to look at {T}.',
	'Looked into it this morning. Everything points at {W}, nothing surprising.',
	'I had not hit this myself, but the paste below shows it plainly enough.',
	'Reproduced on the staging box with yesterday\'s build. {W} is where I would start.',
	'This matches what I saw last month and did not write up, sorry.'
];
const propose = [
	'My first thought is {X}: {P}.',
	'I would do {X}. The argument is simple: {P}.',
	'What about {X}? As far as I can see {P}.',
	'I keep coming back to {X}, because {P}.',
	'If I had a free afternoon I would try {X}; {P}, and that counts for a lot here.',
	'The least surprising answer is probably {X}. For one thing, {P}.',
	'Strawman so we have something to argue with: {X}. In its favour, {P}.'
];
const object = [
	'My worry with {X} is that {C}.',
	'I am not convinced by {X}. The trouble is that {C}.',
	'Before we commit to {X}: {C}. Has anyone thought about that?',
	'{XC} sounds neat until you remember that {C}.',
	'I tried something like {X} at my last job and regretted it, because {C}.',
	'One thing against {X}, and it is not small: {C}.',
	'With {X}, {C}. That may be acceptable, but we should say so out loud.'
];
const support = [
	'Agreed on {X}. Besides what was said, {P}.',
	'+1 for {X}. I had not considered that {P}.',
	'I was sceptical of {X} but I have come round: {P}, and the objection is one we can live with.',
	'{XC} gets my vote. The point that {P} settles it for me.',
	'Having slept on it, {X} is right. The downside is real, though {P}, which matters more.'
];
const deskView = [
	'From the desk: {D}. Whatever you choose, please keep that in mind.',
	'I cannot judge the technical side. What I can say is that {D}.',
	'For context from the editorial side, {D}.',
	'Speaking for the editors, {D}. That is the whole of our interest in this.',
	'A reminder of why this matters to us: {D}.'
];
const factIntro = [
	'One fact that may help: {F}',
	'For the record: {F}',
	'I checked. {F}',
	'Worth knowing before anyone writes code: {F}',
	'Small correction to the above. {F}',
	'Adding a number to the discussion: {F}'
];
const tangents = [
	'Unrelated, but the build printed a toolchain warning again this morning. I will file that separately.',
	'By the way, the tracker export is still scheduled for the end of the quarter, so anything decided here should be copied into the notes.',
	'Sorry for the slow reply, I was at the spring count all weekend. 61 species, since someone will ask.',
	'I am out from Thursday for a week on Fair Isle with no signal, so do not wait for me.',
	'Side note: the staging box was rebuilt on Tuesday and lost its seed changes. Re-run the seed before you test anything.',
	'Not for this issue, but can we agree to stop naming branches after birds? I cannot tell `dunlin` from `dunnock` at a glance.',
	'Apologies for the noise earlier, I replied on the wrong issue.',
	'The print deadline is on the 28th, so expect nothing from the desk before then.',
	'I mentioned this to the site team at lunch. They have no opinion, which is rare enough to be worth recording.',
	'Back from leave. Catching up on forty notifications, bear with me.',
	'For anyone reading this later: the meeting notes that mention this issue are in the shared drive under the launch folder.',
	'A swift just flew past the office window, first of the year. Carry on.'
];
const questions = [
	'Does anyone know how the old site handled this? It must have had the same problem.',
	'Is this needed for the launch, or can it follow?',
	'Who would do the work on the site\'s side if we change {T}?',
	'Do we have any numbers, or are we arguing from memory?',
	'Would this need a line in the README\'s endpoints table?',
	'Has anyone asked operations what they think?',
	'How much of this is {T} and how much is the proxy in front of it?'
];
const answers = [
	'The old site ignored the problem, as far as I can tell from its code. It had ten years of nobody complaining loudly enough.',
	'I asked. Nobody has numbers. I have asked operations for a week of proxy figures.',
	'I would not hold the launch for it, but I would not let it slip past the first month either.',
	'The site team say they can adapt in a day as long as they are told a week ahead.',
	'Operations do not mind either way provided they do not have to learn anything new during the festival fortnight.',
	'It is almost entirely on our side. The proxy passes everything through untouched for this path.',
	'Yes, the README would need a line, and so would the changelog.'
];
const scope = [
	'While we are in there, could {T} also cover the events microsite? They have a similar need.',
	'If we are touching {W} anyway, it might be the moment to tidy the error messages too.',
	'Could this be made general enough to serve the print desk as well?',
	'This might be the time to revisit how {T} is tested from top to bottom.'
];
const scopeNo = [
	'Please, no. One thing per issue. Open another if it matters.',
	'I would keep this narrow. Every time we widen an issue it stays open for a year.',
	'Tempting, but separate. I have opened a note for it so it is not lost.',
	'Let us finish this first. I do not want to review a change that does three things.'
];
const artIntro = [
	'Pasting what I have:',
	'For reference:',
	'Output from this morning:',
	'This is what I see:',
	'Evidence, such as it is:',
	'From the staging box:',
	'Numbers from a quick run, not a proper benchmark:'
];

// How an issue ends. Each ending is the last one to three comments; `kind` never appears in the file.
type Ending = 'a' | 'b' | 'parked' | 'declined' | 'stalled' | 'done' | 'split';
const decide = [
	'We talked it through on the Wednesday call. Decision: {X}. {WHO} will do it. I am leaving the issue open until the change is merged.',
	'Enough discussion. We go with {X}; {P}, and that outweighs the rest. {WHO} has picked it up.',
	'Agreed in the planning meeting: {X}. It goes into the next milestone, with {WHO} on it. The other idea is dropped, not postponed.',
	'Nobody has argued against {X} for two weeks, so I am calling it. {WHO}, it is yours. Shout if the estimate is more than three days.'
];
const parked = [
	'Decision from the planning meeting: not before the launch. We look at this again once the store has moved to a real database, since half the answer depends on that.',
	'Parking this. Both ideas are reasonable, neither is urgent, and the launch list is full. To be picked up in the first planning round after the launch.',
	'We agreed to wait for the site redesign in the autumn, which changes what the site needs from {T}. No work until then.'
];
const declined = [
	'After talking to the desk again: we are not doing this. The workaround they have costs them a few minutes a week, and either change costs us more than that to keep alive. I will leave this open for a week for objections.',
	'Decision: neither. The problem is real but it belongs to the proxy configuration, and operations have agreed to handle it there. Nothing to change in marginalia.',
	'I am going to say no to this one. It would be the first thing in the service with only one user, and that user can get what it needs from the existing routes.'
];
const stalled = [
	'Could whoever filed this say which of the two they actually need? We cannot choose without knowing that.',
	'This needs a number before we go further: how often does it really happen? Can the desk keep a tally for two weeks?',
	'I am stuck until someone from the site team confirms what they can change on their side. I have asked twice.'
];
const stalledEcho = [
	'Any news on this?',
	'Bumping. The question above is still open.',
	'Still waiting for an answer here. I will raise it at the next desk meeting.',
	'No reply in a month. I am not closing it, but nothing will happen until the question is answered.'
];
const done = [
	'This turned out to be covered by the change {WHO} made for another issue last week. I checked on staging and the behaviour described at the top no longer occurs. The export can drop this one.',
	'Looking at the current code, this was fixed along the way: {WHO}\'s clean-up of {W} took care of it. I have tried the steps from the original report and cannot make it happen any more.',
	'Good news, nothing to do. The site team changed their side last sprint and the problem went with it. Confirmed with the person who reported it.'
];
const split = [
	'This issue is really two. The first half, the part the reporter cares about, is small and {WHO} will do it this week using {X}. The second half needs a design and I have moved it to a new issue.',
	'I have split this. The quick fix is {X} for the narrow case, which {WHO} has started. Everything else discussed above moves to a follow-up, because it should not hold the quick fix up.'
];
const twist = [
	'Reopening the discussion, sorry. I started on {X} and found that {C}. That is worse than we assumed. I now think {Y} is the better choice, and I would like a second opinion before I throw the branch away.',
	'Update after two days of trying: {X} does not survive contact with the real archive, because {C}. Unless someone objects by Friday I am switching to {Y}.'
];
const twistAck = [
	'Fine by me. Go with {Y}.',
	'Agreed, switch. Better to find out now. {YC} it is.',
	'No objection. {YC}, then, and please note the reason in the commit message.'
];

// Pasted output.
const birds = ['kestrels', 'swifts', 'dunlin', 'avocets', 'firecrests', 'nightjars', 'hawfinches', 'waxwings', 'bitterns', 'choughs', 'goshawks', 'wheatears', 'redstarts', 'turnstones', 'spoonbills', 'cranes', 'shrikes', 'siskins', 'gannets', 'puffins', 'merlins', 'whinchats', 'pipits', 'sanderling', 'godwits'];
const places = ['the-gasholder', 'spurn', 'the-wash', 'fair-isle', 'the-old-quarry', 'minsmere', 'the-ring-road', 'portland', 'the-allotments', 'rutland-water', 'the-canal-basin', 'dungeness', 'the-sewage-works', 'cley', 'the-cathedral', 'slimbridge', 'the-golf-course', 'flamborough', 'the-reservoir', 'the-estuary'];
const joins = ['on', 'at', 'over', 'return-to', 'leave', 'and-the-winter-at', 'counted-at', 'late-at'];
const slug = (r: Rand) => `${pick(r, birds)}-${pick(r, joins)}-${pick(r, places)}`;
const title = (text: string) => cap(text.replace(/-/g, ' '));
const stamp = (r: Rand, date: string) => `${date}T${pad(int(r, 0, 23))}:${pad(int(r, 0, 59))}:${pad(int(r, 0, 59))}Z`;

const logPaste = (r: Rand, date: string): string => {
	const lines: string[] = [];
	let second = int(r, 0, 40000);
	const count = int(r, 9, 18);
	const hot = slug(r);
	for (let i = 0; i < count; i++) {
		second += int(r, 0, 9);
		const time = `${pad(Math.floor(second / 3600) % 24)}:${pad(Math.floor(second / 60) % 60)}:${pad(second % 60)}`;
		const roll = r();
		const post = r() < 0.5 ? hot : slug(r);
		const [method, path, status, bytes] =
			roll < 0.3
				? ['GET', '/api/posts', 200, int(r, 380000, 420000)]
				: roll < 0.6
					? ['GET', `/api/posts/${post}`, r() < 0.08 ? 404 : 200, int(r, 900, 9000)]
					: roll < 0.85
						? ['GET', `/api/posts/${post}/comments`, 200, int(r, 2, 90000)]
						: roll < 0.95
							? ['POST', `/api/posts/${post}/comments`, r() < 0.15 ? 400 : 201, int(r, 60, 140)]
							: ['GET', '/api/admin/comments/pending', r() < 0.2 ? 401 : 200, int(r, 2, 40000)];
		lines.push(`ts=${date}T${time}Z method=${method} path=${path} status=${status} dur_ms=${(r() * (roll < 0.3 ? 40 : 6) + 0.2).toFixed(1)} bytes=${bytes} req=${Math.floor(r() * 0xffffff).toString(16).padStart(6, '0')}`);
	}
	return '```text\n' + lines.join('\n') + '\n```';
};
const testNames = ['TestListPostsNewestFirst', 'TestListPostsLeavesDraftsOut', 'TestGetPostUnknownSlug', 'TestGetPostDraftIsNotFound', 'TestListCommentsApprovedOnly', 'TestListCommentsUnknownPost', 'TestCreateCommentRejectsMissingFields', 'TestCreateCommentWaitsForApproval', 'TestCreateCommentUnknownPost', 'TestAdminListPendingNeedsToken', 'TestAdminListPendingOldestFirst', 'TestAdminApproveComment', 'TestAdminApproveUnknownComment', 'TestAddCommentSetsCreatedAt', 'TestPendingCommentsOldestFirst', 'TestApproveCommentTwice', 'TestGetUserUnknownID', 'TestStoreIDsIncrease'];
const testPaste = (r: Rand): string => {
	const lines: string[] = ['$ go test -v ./...'];
	const failing = r() < 0.45 ? pick(r, testNames) : '';
	for (const pkg of ['handler', 'store']) {
		const names = shuffle(r, testNames).slice(0, int(r, 4, 7));
		let failed = false;
		for (const name of names) {
			lines.push(`=== RUN   ${name}`);
			if (name === failing) {
				failed = true;
				lines.push(`    ${pkg}_test.go:${int(r, 20, 140)}: got ${int(r, 0, 5)}, want ${int(r, 0, 5)}`);
				lines.push(`--- FAIL: ${name} (0.00s)`);
			} else lines.push(`--- PASS: ${name} (0.0${int(r, 0, 3)}s)`);
		}
		lines.push(failed ? 'FAIL' : 'PASS');
		lines.push(`${failed ? 'FAIL' : 'ok  '}\tcorvidfinch.example/marginalia/internal/${pkg}\t0.0${int(r, 10, 99)}s`);
	}
	lines.push('?   \tcorvidfinch.example/marginalia/cmd/server\t[no test files]');
	return '```text\n' + lines.join('\n') + '\n```';
};
const curlPaste = (r: Rand, date: string): string => {
	const count = int(r, 3, 6);
	const rows: string[] = [];
	for (let i = 0; i < count; i++) {
		const s = slug(r);
		rows.push(`  {\n    "slug": "${s}",\n    "title": "${title(s)}",\n    "published_at": "${stamp(r, date)}"\n  }`);
	}
	return [
		'```text',
		'$ curl -si https://fieldnotes.corvidfinch.example/api/posts | head -c 2000',
		'HTTP/1.1 200 OK',
		'Content-Type: application/json',
		`Date: ${date}`,
		`X-Request-Id: ${Math.floor(r() * 0xffffffff).toString(16)}`,
		'',
		'[',
		rows.join(',\n'),
		']',
		'```'
	].join('\n');
};
const timingPaste = (r: Rand): string => {
	const rows = ['| Route | Requests | p50 ms | p95 ms | p99 ms | Mean bytes |', '| --- | ---: | ---: | ---: | ---: | ---: |'];
	const routes = ['GET /api/posts', 'GET /api/posts/{slug}', 'GET /api/posts/{slug}/comments', 'POST /api/posts/{slug}/comments', 'GET /api/admin/comments/pending'];
	for (const label of ['before', 'after a restart', 'with 50 clients'].slice(0, int(r, 1, 2)))
		for (const route of routes) {
			const p50 = r() * 12 + 0.3;
			rows.push(`| ${route} (${label}) | ${int(r, 200, 9000)} | ${p50.toFixed(1)} | ${(p50 * (1.5 + r() * 2)).toFixed(1)} | ${(p50 * (4 + r() * 6)).toFixed(1)} | ${route.startsWith('POST') ? int(r, 60, 140) : int(r, 900, 410000)} |`);
		}
	return rows.join('\n');
};
const paste = (r: Rand, kind: Topic['art'], date: string): string =>
	kind === 'log' ? logPaste(r, date) : kind === 'test' ? testPaste(r) : kind === 'curl' ? curlPaste(r, date) : timingPaste(r);

const fill = (text: string, values: Record<string, string>): string => {
	const out = text.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? `{${key}}`);
	return cap(out);
};

const addDays = (date: string, days: number): string => {
	const d = new Date(`${date}T00:00:00Z`);
	d.setUTCDate(d.getUTCDate() + days);
	return d.toISOString().slice(0, 10);
};

const endings: Ending[] = ['a', 'b', 'parked', 'declined', 'stalled', 'done', 'split', 'a', 'b', 'stalled', 'parked'];

const issue = (index: number, topic: Topic, ask: [string, string], number: number, opened: string): string => {
	const r = mulberry32(0x5eed0000 + index * 7919);
	const reporter = r() < 0.55 ? pick(r, desk) : r() < 0.6 ? pick(r, devs) : pick(r, outside);
	const others = shuffle(r, [...devs, ...desk, ...outside].filter((name) => name !== reporter));
	const owner = pick(r, devs);
	const ending = endings[(index * 5 + int(r, 0, 2)) % endings.length]!;
	const flip = r() < 0.5;
	const first = flip ? topic.b : topic.a;
	const second = flip ? topic.a : topic.b;
	const opt = (o: Option, other: Option) => ({ X: o.name, XC: cap(o.name), P: o.pro, C: o.con, Y: other.name, YC: cap(other.name) });
	const base = { T: topic.thing, W: topic.where, D: topic.desk, WHO: owner };
	const facts = shuffle(r, topic.facts);
	const arts = [topic.art, r() < 0.5 ? topic.art : 'log', topic.art] as const;
	let date = opened;
	const comments: string[] = [];
	const say = (who: string, paragraphs: string[]) => {
		date = addDays(date, int(r, 0, 6));
		comments.push(`**${who}** · ${date}\n\n${paragraphs.join('\n\n')}`);
	};
	const speaker = (n: number) => others[n % others.length]!;
	const dev = (n: number) => devs.filter((name) => name !== reporter)[n % 3]!;
	const maybeTangent = () => (r() < 0.3 ? [pick(r, tangents)] : []);

	const body = [
		pick(r, openings),
		ask[1],
		facts[0]!,
		...(desk.includes(reporter) ? [fill(pick(r, deskView), base)] : [fill(pick(r, propose), { ...base, ...opt(first, second) })]),
		`${pick(r, artIntro)}\n\n${paste(r, arts[0]!, opened)}`,
		pick(r, closings)
	];

	say(dev(0), [fill(pick(r, repro), base), fill(pick(r, propose), { ...base, ...opt(first, second) }), ...maybeTangent()]);
	say(dev(1), [fill(pick(r, object), { ...base, ...opt(first, second) }), fill(pick(r, propose), { ...base, ...opt(second, first) })]);
	if (desk.includes(reporter)) say(speaker(2), [fill(pick(r, questions), base), ...maybeTangent()]);
	else say(pick(r, desk), [fill(pick(r, deskView), base), fill(pick(r, questions), base)]);
	say(dev(2), [pick(r, answers), fill(pick(r, factIntro), { F: facts[1]! }), `${pick(r, artIntro)}\n\n${paste(r, arts[1]!, date)}`]);
	if (r() < 0.75) {
		say(speaker(3), [fill(pick(r, scope), base)]);
		say(dev(0), [pick(r, scopeNo), ...maybeTangent()]);
	}
	say(speaker(4), [fill(pick(r, object), { ...base, ...opt(second, first) }), ...(r() < 0.5 ? [fill(pick(r, questions), base)] : [])]);
	say(dev(1), [fill(pick(r, support), { ...base, ...opt(r() < 0.5 ? first : second, first) }), fill(pick(r, factIntro), { F: facts[2]! }), ...maybeTangent()]);
	if (r() < 0.6) say(speaker(5), [pick(r, tangents), fill(pick(r, support), { ...base, ...opt(r() < 0.5 ? first : second, first) })]);
	say(others.filter((name) => name !== dev(2))[6 % (others.length - 1)]!, [fill(pick(r, questions), base), fill(pick(r, object), { ...base, ...opt(r() < 0.5 ? first : second, first) })]);
	say(dev(2), [pick(r, answers), fill(pick(r, support), { ...base, ...opt(r() < 0.5 ? first : second, first) }), ...maybeTangent()]);

	const chosen = ending === 'b' ? topic.b : topic.a;
	const rejected = ending === 'b' ? topic.a : topic.b;
	if (ending === 'a' || ending === 'b') {
		say(owner === dev(0) ? dev(1) : dev(0), [fill(pick(r, decide), { ...base, ...opt(chosen, rejected) })]);
		if (r() < 0.35) {
			say(owner, [fill(pick(r, twist), { ...base, ...opt(chosen, rejected) })]);
			say(dev(0) === owner ? dev(1) : dev(0), [fill(pick(r, twistAck), { ...base, ...opt(chosen, rejected) })]);
		} else if (r() < 0.5) say(owner, ['Started. Branch is up, review welcome once the tests are in.']);
	} else if (ending === 'parked') say(dev(0), [fill(pick(r, parked), base)]);
	else if (ending === 'declined') {
		say(dev(0), [fill(pick(r, declined), base)]);
		if (r() < 0.5) say(reporter, ['Understood. Not the answer I hoped for, but I see the reasoning.']);
	} else if (ending === 'stalled') {
		say(dev(0), [fill(pick(r, stalled), base)]);
		for (let i = int(r, 1, 3); i > 0; i--) {
			date = addDays(date, int(r, 12, 30));
			say(dev(i), [pick(r, stalledEcho)]);
		}
	} else if (ending === 'done') say(dev(1), [fill(pick(r, done), base)]);
	else say(dev(0), [fill(pick(r, split), { ...base, ...opt(r() < 0.5 ? topic.a : topic.b, topic.a) })]);

	return [`# #${number}: ${ask[0]}`, `Opened by ${reporter} on ${opened} · ${comments.length} comments`, ...body, ...comments.map((comment) => `---\n\n${comment}`)].join('\n\n') + '\n';
};

const folder = join(root, 'docs', 'issues');
mkdirSync(folder, { recursive: true });
const order = mulberry32(20260406);
const asks = shuffle(order, topics.flatMap((topic) => topic.asks.map((ask) => ({ topic, ask }))));
let number = 100;
let opened = '2025-06-02';
asks.forEach(({ topic, ask }, index) => {
	number += int(order, 1, 6);
	opened = addDays(opened, int(order, 1, 7));
	const name = ask[0].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48).replace(/-$/, '');
	writeFileSync(join(folder, `${number}-${name}.md`), issue(index, topic, ask, number, opened));
});
writeFileSync(
	join(folder, 'README.md'),
	`# Issues from the old tracker\n\nThe ${asks.length} issues that were open on the old tracker when it was exported, one file each, with their\ndiscussion as it stood. The tracker did not export labels or milestones. Pasted output in an issue is as its\nwriter pasted it.\n`
);
