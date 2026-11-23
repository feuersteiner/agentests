// Writes the long material of this entry's long tasks: every issue of the flat's old tracker, the Gitea that ran
// on the Pi beside Hearth from January 2025, one Markdown file each under docs/issues/, as its export left them:
// the issue and its comments, without labels, assignees or whether it was closed. Deterministic: fixed seeds, no
// clock, no network.
//   bun long/generate.ts <workspace root>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** How many issues to write. Dates, numbers and how often each topic comes up all follow from it. */
const ITEMS = 224;

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
const chance = (r: Rand, p: number) => r() < p;
const shuffle = <T>(r: Rand, items: readonly T[]): T[] => {
	const copy = [...items];
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(r() * (i + 1));
		[copy[i], copy[j]] = [copy[j]!, copy[i]!];
	}
	return copy;
};
const pad = (value: number) => String(value).padStart(2, '0');
const one = (value: number) => value.toFixed(1);
const thousands = (value: number) => String(value).replace(/\B(?=(\d{3})+$)/g, ',');
const hex = (r: Rand, length: number) => Array.from({ length }, () => '0123456789abcdef'[int(r, 0, 15)]).join('');

// Time is kept in minutes since 00:00 on 1 January 2025, the flat's local time.
const EPOCH = Date.UTC(2025, 0, 1);
const dayOf = (y: number, m: number, d: number) => (Date.UTC(y, m - 1, d) - EPOCH) / 60000;
const at = (minutes: number) => new Date(EPOCH + minutes * 60000);
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const clock = (m: number) => `${pad(at(m).getUTCHours())}:${pad(at(m).getUTCMinutes())}`;
const weekday = (m: number) => DAYS[at(m).getUTCDay()]!;
const mon = (m: number) => MONTHS[at(m).getUTCMonth()]!.slice(0, 3);
const stamp = (m: number) => `${weekday(m).slice(0, 3)} ${at(m).getUTCDate()} ${mon(m)} ${at(m).getUTCFullYear()}, ${clock(m)}`;
const jstamp = (m: number, s: number) => `${mon(m)} ${pad(at(m).getUTCDate())} ${clock(m)}:${pad(s)}`;
const iso = (m: number) => at(m).toISOString().slice(0, 10);
const shortDay = (m: number) => `${weekday(m).slice(0, 3)} ${at(m).getUTCDate()} ${mon(m)}`;
const summer = (m: number) => at(m).getUTCMonth() >= 3 && at(m).getUTCMonth() <= 9;
const zone = (m: number) => (summer(m) ? 'BST' : 'GMT');
const minuteOfDay = (m: number) => ((m % 1440) + 1440) % 1440;
const startOfDay = (m: number) => m - minuteOfDay(m);

// The flat's history, as the fixture's CHANGELOG and README tell it.
const OPENED = dayOf(2025, 1, 13); // the tracker, the day after 0.1.0
const PAGE = dayOf(2025, 2, 16); // Tariq's page on the kitchen tablet
const WEATHER = dayOf(2025, 3, 2); // 0.2.0, weather.temperature
const PURIFIER = dayOf(2025, 9, 20); // Sofie's Aerona purifier in the living room
const STRIP = dayOf(2025, 12, 6); // Callum fits the Lumen strip under the kitchen cupboards
const LUMEN = dayOf(2026, 6, 7); // 0.4.0, lumen.kitchen on the tablet
const CALLUM_LEAVES = dayOf(2026, 8, 30);
const JONAH_ARRIVES = dayOf(2026, 9, 5);
const LAST_OPEN = dayOf(2026, 11, 12) + 21 * 60;
const LAST = dayOf(2026, 11, 19) + 22 * 60;

// People. Nell wrote Hearth and runs the Pi; Tariq made the page on the kitchen tablet; Mei is Nell's partner.
type Person = 'nell' | 'tariq' | 'sofie' | 'callum' | 'jonah' | 'mei';
const display: Record<Person, string> = { nell: 'Nell', tariq: 'Tariq', sofie: 'Sofie', callum: 'Callum', jonah: 'Jonah', mei: 'Mei' };
const fourthAt = (m: number): Person => (m < JONAH_ARRIVES ? 'callum' : 'jonah');
const flatmatesAt = (m: number): Person[] => ['tariq', 'sofie', fourthAt(m)];

// Topics. An issue follows one path of one topic. What the issue turned out to be about, and how it ended, is only
// ever in its comments.
//   Speakers: a author, n Nell, t Tariq, s Sofie, m Mei, f the fourth flatmate, o and x two other flatmates.
//   A message that starts with ~ comes days later, with ~~ weeks later. Its third item, when there is one, is
//   pasted output under it. An opening that starts with W| is only used from November to March. In any text,
//   [[a|b|c]] becomes one of its options and {name} a value of the issue, such as {temp} or {other}.
type Who = 'a' | 'n' | 't' | 's' | 'm' | 'f' | 'o' | 'x';
type Msg = [Who, string, string?];
interface Path {
	/** Openings that only fit this path, in place of the topic's. */
	open?: string[];
	since?: number;
	until?: number;
	detail?: string;
	detailPaste?: string;
	lookBy?: Who;
	look: string;
	lookPaste?: string;
	/** Checks that rule a cause out before the look, by name from `probes`. */
	probes?: string[];
	ends: Msg[][];
}
interface Topic {
	since?: number;
	until?: number;
	/** How many issues of this topic at most. */
	max?: number;
	/** How many times the topic is dealt in each round. */
	weight?: number;
	/** Only between October and March. */
	winter?: boolean;
	/** Only in the days just after one of these. */
	after?: number[];
	/** The Pi booted just before the issue was opened (after a power cut). */
	freshBoot?: boolean;
	/** Who may open it; Nell opens an issue as a note to herself, and then nobody asks her for details. */
	by: Who[];
	subjects: string[];
	open: string[];
	openPaste?: string;
	more?: string[];
	askBy?: Who;
	ask?: string[];
	/** A flatmate's guess before anyone looks. */
	guess?: string[];
	/** Flatmates' views, one or two of which come up. */
	chat?: Msg[];
	paths: Path[];
}

const topics: Topic[] = [
	// The tablet shows an old temperature.
	{
		since: WEATHER,
		by: ['t', 's', 'f', 'm'],
		weight: 3,
		subjects: ['Tablet temperature not changing', 'Weather stuck on the tablet?', 'Temperature frozen', 'Tablet says the same temperature all day', 'Is the weather broken again'],
		open: [
			'W|The tablet has said {temp} °C since I got up, and it’s obviously colder than that: there was frost on the bins and my breath was steaming on the balcony. Is the weather bit stuck? I didn’t want to start poking at the tablet in case I made it worse, so I’ve left it alone. The rest of the page looks normal as far as I can tell, but I don’t really know what normal looks like apart from the number.',
			'[[Came home|Got back from work|Came in from the shops]] and the tablet showed exactly the same temperature as when I left this morning, {temp}. Either it’s been an incredibly steady day or something has frozen, and I’m guessing the second, because it rained all afternoon and then the sun came out. My phone says it’s a couple of degrees colder than the tablet thinks. Not the end of the world, but I do look at it before I decide what to wear.',
			'Weather on the tablet seems stuck. I only noticed because I was deciding whether to take a coat: it said {temp} at eight, and it said {temp} again at nine while it was pouring down outside. Rain doesn’t usually leave the temperature exactly where it was. {other} says it was the same number when they made coffee at seven.'
		],
		more: ['It might have been the same yesterday evening too, now that I think about it, but I wasn’t paying attention.', 'I tried tapping the page in case it needed waking up. Nothing changed.', 'I haven’t touched anything, promise. Nobody has been in the cupboard as far as I know.'],
		ask: [
			'[[Thanks for flagging.|Thanks.|Sorry about that.]] Is the little dot in the top corner of the page green or grey? Green means the page has heard from Hearth in the last few minutes, grey means it hasn’t. And roughly when did you first notice?',
			'[[Odd.|Hm.|Thanks.]] Did anything else on the page look wrong, or only the temperature? And what does the small print under the reading say, the “updated” time? That tells me whether it’s Hearth or the tablet before I go and open the cupboard.'
		],
		guess: ['I bet it’s the tablet again. It was doing something odd with the brightness on {wday} as well.', 'Could it be the power blip on {wday}? The oven clock was flashing when I got up.'],
		paths: [
			{
				since: LUMEN,
				detail: 'Grey dot. And it says the kitchen light is on, which it isn’t: {other} switched the strip off at the plug yesterday to clean behind the worktop and I don’t think it has been back on since. The updated time says yesterday afternoon.',
				probes: ['up', 'disk', 'sky', 'tablet'],
				look: 'Found it. Hearth has been restarting every few seconds since yesterday afternoon. Every time it starts it reads the weather, then tries the light strip, can’t reach it because the strip has no power, and falls over before it has written anything out. So the tablet never gets a new reading, for either of them. This is the log since this morning, and it has been the same for about eighteen hours:',
				lookPaste: 'crash:route',
				ends: [
					[['n', 'Plugged the strip back in and Hearth came straight back; the temperature is current again. The real problem is that one device being off takes everything else down with it, which is daft: the weather has nothing to do with the kitchen light. I’m leaving this open: Hearth should carry on with the other readings when one device doesn’t answer, and show only that one as unavailable.'], ['a', 'OK. In the meantime nobody unplug the strip, got it.'], ['o', '~Sorry, that was me. I’ve moved the toaster back to the other socket.']],
					[['n', 'Strip back on, and Hearth recovered within a minute. Here it is again:', 'states'], ['n', 'I’ve stuck a label on that plug saying “Hearth needs this on”.'], ['a', 'Ha, fine. Temperature is moving again.'], ['o', '~Sorry, that was me. Won’t happen again.']],
					[['n', 'Strip plugged back in, and Hearth is fine again. But that’s the second time that one thing being off has taken the whole page down. It should keep going with whatever it can still reach.'], ['t', 'Agreed. The page could show a dash for the one that’s missing, it already knows how to do that for the light.'], ['n', 'OK. Leaving this open until Hearth does that. Until then: the strip stays plugged in.']]
				]
			},
			{
				detail: 'The dot is green, which confused me. The time under the reading says {clock}, which was hours ago.',
				probes: ['up', 'running', 'sky', 'disk', 'router'],
				look: 'Hearth on the Pi is fine: it wrote a fresh reading a minute ago, and the temperature has been moving all day, a tenth here and there, as you’d expect:',
				lookPaste: 'states',
				ends: [
					[['n', 'So it’s the tablet side. Tariq, isn’t the page meant to reload itself every hour?'], ['t', 'It is. The browser on the tablet updated itself on {wday}, and the update reset the kiosk settings, including the hourly reload. That also explains the green dot: the dot is drawn by the same frozen page. I’ve set it all again and turned off automatic updates for the browser.'], ['a', 'It’s moving again, thanks both.']],
					[['n', 'So the tablet isn’t picking it up. Tariq?'], ['t', 'The kiosk browser crashed and the screen just kept showing its last picture, dot and all. Restarted it. There’s an option to restart it automatically when it crashes, but only in the paid version.'], ['n', 'How much?'], ['t', 'About £6, once. I’ll buy it if nobody minds.'], ['a', 'Go for it.'], ['t', '~Bought and set up. It restarts itself now if it crashes; I tested it by killing it from the settings.']],
					[['n', 'So it’s the tablet. Tariq?'], ['t', 'Battery saver kicked in at 15% and it stops the page refreshing in the background. The charger had fallen out of the back again. Plugged it in.'], ['a', 'Ugh, OK. Can the charger be made not to fall out?'], ['t', 'I’ll get a right-angle cable, the straight one sticks out and gets knocked. Until then, push it in when you walk past.']]
				]
			},
			{
				detail: 'Green dot, and the time under the reading is current, it updated a minute ago. It’s just the number that doesn’t change.',
				probes: ['up', 'running', 'tablet', 'disk', 'boots'],
				look: 'Nothing wrong on our side. Hearth asks Skycast for the weather every minute and gets exactly the same number back every time, to the tenth, which never happens with a real thermometer. Skycast’s status page explains it:',
				lookPaste: 'frozen+skystatus',
				ends: [
					[['n', '~Back to normal this morning: Skycast fixed the station. Nothing to change here.'], ['a', 'Great, thanks for checking.']],
					[['n', '~Still the same three days later. I’ve asked Skycast’s support whether the station is coming back; if not, we can pick another place nearby.'], ['a', 'The number’s still stuck, for the record.'], ['n', '~Skycast replied that the sensor is being replaced but couldn’t say when. They’ve promised to email me a date. Waiting on that.']],
					[['n', '~Skycast say the Ashford station is gone for good. I’ve pointed Hearth at the station at the airfield instead; it’s further away, but it updates.'], ['a', 'Moving again, thanks. A bit warmer than it feels though.'], ['n', 'That’s the airfield being up on the hill. Close enough, I think.']]
				]
			},
			{
				detail: 'Grey dot. And the page says the last update was yesterday at {clock}.',
				probes: ['up', 'tablet', 'sky', 'net'],
				look: 'Hearth isn’t running, because the Pi has run out of space and it can’t write anything. The system log has grown and grown:',
				lookPaste: 'df:journal',
				ends: [
					[['n', 'Capped the system log at 200 MB and cleared out the old ones. Hearth started straight away:', 'dfok'], ['a', 'Back to normal here.']],
					[['n', 'Cleared some space and Hearth’s running again, but it’ll fill up again; I need to put a limit on the logs properly.'], ['a', '~It’s stuck again.'], ['n', 'Sorry, my fault, I never did it. Done properly this time: logs are capped at 200 MB and the old ones are gone. Plenty of room now:', 'dfok'], ['a', 'Moving again.']]
				]
			},
			{
				detail: 'Grey dot, last update yesterday evening.',
				probes: ['up', 'tablet', 'sky', 'net'],
				look: 'The Pi’s card is full, so Hearth gave up. Most of what’s on there isn’t Hearth at all:',
				lookPaste: 'df:dumps',
				ends: [
					[['n', 'Freed a few gigabytes, so Hearth’s back. Nearly all of it was the tracker’s nightly backups, which were never deleted. I’ve kept the last three, but the card is small anyway and I’d like a bigger one before this happens again. Ordered a 64 GB card, it comes {day}.'], ['a', 'Thanks. Moving again.'], ['n', '~The card hasn’t come. The seller says it’s lost in the post and is sending another one.']],
					[['n', 'Deleted all but the last three of the tracker’s nightly backups and set it to keep a week of them from now on. Hearth started as soon as there was room.', 'dfok'], ['a', 'Back, thanks.']]
				]
			}
		]
	},
	// The temperature doesn't match what people feel.
	{
		since: WEATHER,
		by: ['t', 's', 'f'],
		weight: 3,
		subjects: ['Tablet says it’s warmer than it is', 'Temperature is wrong', 'Weather reading way off', 'Tablet vs reality', 'Is the temperature for somewhere else?'],
		open: [
			'W|The tablet said {temp} °C this morning, so I went out without [[a coat|a jumper|gloves]]. It was not {temp}. My car said {temp2} when I got in, and the windscreen was iced over, which doesn’t happen at {temp}. It’s not the first time either: I’ve been caught out at least twice this month.',
			'[[Is the temperature on the tablet for somewhere else?|Is the tablet showing the weather for somewhere else?]] It has been [[a few|two or three|a couple of]] degrees warmer than the thermometer by the back door every time I’ve compared them this week, and the forecast it shows never seems to match what happens outside. I started writing the numbers down because I thought I was imagining it.',
			'For the [[last week|past fortnight|last few days]] the tablet has been warmer than every other number I can find: the thermometer by the back door, my phone, [[the sign outside the chemist|the clock on the bus stop|the app at work]]. [[I’m not saying it’s broken, just that I’ve stopped trusting it.|Maybe it’s me, but I no longer believe it.|I’ve started ignoring it, which seems a shame.]]'
		],
		more: ['Not a big deal, but it’s the only thing I look at it for.', 'Someone said it has always been a bit off. Is that right?', 'Happy to keep a log for a few days if that helps.'],
		ask: [
			'[[Interesting.|Hm.|OK.]] Can you note down a few readings with times, from the tablet and from whatever you’re comparing with? Then I can tell whether it’s a steady difference or a delay.',
			'[[Which thermometer are you comparing with|What are you comparing it with]], and at what time of day? First thing in the morning it can be a lot colder down here by the river than at the weather station.'
		],
		guess: ['The back door thermometer is in the sun after lunch, so I wouldn’t trust it either.'],
		paths: [
			{
				detail: 'Against the thermometer by the back door, mornings and afternoons, over three days:',
				detailPaste: 'compare:wrong',
				probes: ['readings', 'sky', 'up'],
				look: 'I asked Skycast for “Ashford” from my laptop, and it gives me the Ashford near Heathrow, not ours. The name on its own picks the wrong one, and Hearth has been showing the weather on the other side of London since the day I set it up. That explains a couple of degrees all day long, and the rain it keeps forecasting that never arrives here.',
				ends: [
					[['n', 'I’ve changed the location in config.json to the flat’s coordinates and restarted Hearth. It now matches the Met Office within half a degree:', 'states'], ['a', 'Ha. Much better: it said {temp2} this morning and it was.']],
					[['n', 'Switched the location to the flat’s coordinates and restarted. Can you keep an eye on it for a few days?'], ['a', '~Spot on all week. Thanks!'], ['o', 'Can’t believe we’ve had the wrong town for this long.']]
				]
			},
			{
				detail: 'Mostly early mornings, against the thermometer by the back door:',
				detailPaste: 'compare:morning',
				probes: ['readings', 'sky', 'up'],
				look: 'The readings are right for the weather station; it’s just that the station is at the airfield, nine miles away and a lot higher up. On still mornings we sit in a frost pocket by the river and can be three degrees colder. In the afternoon the two agree within a few tenths, which is what your numbers show too: the gap is only there before nine.',
				ends: [
					[['a', 'So the tablet will always be wrong first thing?'], ['n', 'On cold still mornings, yes, by two or three degrees. The proper fix is our own thermometer outside the kitchen window that Hearth reads instead. I’m leaving this open for that.'], ['a', 'Would love that.']],
					[['a', 'Fair enough. I’ll knock a couple of degrees off in the mornings.'], ['n', 'That’s about right. Not worth more than that, I think.'], ['a', 'Agreed, never mind then.']],
					[['a', 'Could we get our own thermometer outside?'], ['n', 'We could, if the landlord doesn’t mind a little box on the wall by the kitchen window. I’ve asked the letting agent.'], ['n', '~No answer from the agent yet. Chased them today.']]
				]
			},
			{
				detail: 'Against my car, in the afternoons mostly:',
				detailPaste: 'compare:car',
				probes: ['readings', 'sky', 'up'],
				look: 'The tablet agrees with the Met Office and with my phone within a few tenths, [[every time|each time I checked|all week]]. Your car sits in the sun on the street all afternoon; its sensor is behind the bumper, and it reads high when the car has been parked in the sun and low at night on the road. The mornings in your list agree, it’s only the afternoons.',
				ends: [
					[['a', 'Huh. I trusted the car.'], ['n', 'I wouldn’t. Nothing to change here.'], ['a', 'OK, fair.']],
					[['a', 'Fine, but this morning it was two degrees off from the car, and the car had been in the shade all night.'], ['n', '~Compared every morning for a week: the tablet and the Met Office agree each time. I think it’s the car.'], ['a', 'OK, I give up, you win.']]
				]
			}
		]
	},
	// The kitchen light comes on by itself.
	{
		since: LUMEN,
		by: ['t', 's', 'f'],
		weight: 3,
		subjects: ['Kitchen light came on at 3am', 'Light strip turning itself on', 'Who turned the kitchen light on?', 'Kitchen light on in the night again'],
		open: [
			'[[Woke up at about three for water|Got up at half three for the loo|Came in late, just after three,]] and the kitchen strip was on, [[full brightness|properly bright|as bright as it goes]]. [[Nobody was up, all the doors were shut.|Everyone else was asleep.|Nobody else was around.]] The tablet shows it as on as well, so I wasn’t dreaming. I switched it off with the app and went back to bed.',
			'[[Second|Third]] time [[this week|in ten days]] the kitchen light has been on when I came down [[at six|first thing|for breakfast]]. I definitely turned it off the night before; I was the last one up and I remember doing it, because I had to find my phone to do it.',
			'The strip under the cupboards switches itself on at night. It’s not a big deal, except that it shines straight down the hall and under my door, and I sleep badly enough already.'
		],
		more: ['Is that Hearth doing it?', 'I checked the tablet, and it says it has been on since sometime after three.'],
		ask: [
			'Hearth only reads the strip, it never switches it, so it isn’t [[that|Hearth]]. Can you [[check|send me|look at]] the history in the Lumen app? It lists every change and what made it.',
			'Hearth can’t switch it, it only looks. Which [[nights|days]], roughly? I’ll check Hearth’s log against them, and the Lumen app keeps a history too, which is the more useful one.'
		],
		paths: [
			{
				detail: 'Here’s the Lumen app’s history:',
				detailPaste: 'lumenlog:schedule',
				probes: ['running', 'readings', 'boots'],
				look: 'There’s a schedule in the Lumen app called “Wake up” for weekday mornings. None of us made it, as far as I know. I think it was set up with the strip when Callum fitted it, and it only started working once the strip was properly back on the Wi-Fi.',
				ends: [
					[['n', 'Deleted the schedule. That should be the end of it.'], ['a', '~No more surprises all week. Thanks.']],
					[['n', 'Deleted the schedule.'], ['a', '~It came on again on {wday} at ten past three.'], ['n', 'That one isn’t a schedule: the app says “Power restored”. The power must have dipped, and the strip comes back on after a cut. I’ve set it to stay off after a power cut.'], ['a', '~Haven’t seen it since.']]
				]
			},
			{
				detail: 'The app just says “Power restored” at the times it came on:',
				detailPaste: 'lumenlog:power',
				probes: ['running', 'readings', 'boots'],
				look: 'Every time the strip came on, the Pi has a gap in its log at the same minute, so the power is dipping for the whole flat, not only the strip. The strip turns itself back on after a power cut unless you tell it not to. The Pi’s list of boots shows the gaps:',
				lookPaste: 'boots:power',
				ends: [
					[['n', 'I’ve set the strip to stay off after a power cut, so the light part is sorted. The dips themselves are one for the landlord. Emailed the letting agent with the times.'], ['o', '~Any reply?'], ['n', 'Not yet. Still waiting for the agent to send an electrician.']],
					[['n', 'Set the strip to stay off after a cut. The dips turned out to be the street’s supply: downstairs had the same, and the network people came on {wday} and replaced something in the road.'], ['a', '~Nothing since. Thanks.']]
				]
			},
			{
				detail: 'The app’s history says “Mei’s phone” every time. Is that a thing?',
				detailPaste: 'lumenlog:phone',
				probes: ['running', 'readings', 'boots'],
				look: 'Mei, does your phone still have the Lumen app from when you set up the evening scene for us?',
				ends: [
					[['m', 'Oh no. It has an “arrive home” rule that turns the kitchen light on when my phone comes near. I live twenty minutes away, and apparently on some nights that counts. Turned it off, sorry!'], ['a', 'Ha, mystery solved.']],
					[['m', 'It does, and it has a “when I get home” rule. Deleted it. Sorry!'], ['a', '~Still came on last night.'], ['n', 'That one was a power cut; the app says “Power restored”. I’ve set it to stay off after a cut as well.'], ['a', '~Fine all week.']]
				]
			}
		]
	},
	// The tablet has the kitchen light wrong.
	{
		since: LUMEN,
		by: ['t', 's', 'f', 'm'],
		weight: 3,
		subjects: ['Tablet says the light is off when it’s on', 'Kitchen light wrong on the tablet', 'Light status stuck', 'Light strip missing from the page'],
		open: [
			'The tablet has said the kitchen light is off [[all evening|since dinner|for hours]], while it has been on the whole time. I switched it off and on again in the app to see if the tablet would notice, and it didn’t. The temperature looks plausible, but I’m not sure it has moved either.',
			'The light on the tablet has been the opposite of reality since [[this morning|lunchtime|I got home]]: on when it’s off, off when it’s on. Also the temperature hasn’t moved, if that helps.',
			'Hearth seems to have lost the light strip[[| again| since this afternoon]]. The Lumen app still switches it fine from my phone, but the tablet is stuck on whatever it last saw.'
		],
		ask: ['Does the Lumen app work from your phone when you’re on the flat’s Wi-Fi, not on mobile data? That tells me whether the strip is on the network at all.', 'Thanks, looking. Did anyone do anything to the router today, or move anything in the kitchen?'],
		paths: [
			{
				detail: 'App works fine on the Wi-Fi. The router was restarted this afternoon: the broadband dropped and {other} turned it off and on.',
				probes: ['up', 'disk', 'sky', 'boots'],
				look: 'That’s it. After the restart the router gave the strip a new address, and Hearth is still talking to the old one, which is now nobody. Hearth crashes every time it tries, so nothing reaches the tablet. The router’s list:',
				lookPaste: 'leases:strip',
				ends: [
					[['n', 'Reserved .31 for the strip in the router so it always gets the same address, and power-cycled the strip. Hearth found it straight away:', 'states'], ['a', 'Showing right now.']],
					[['n', 'Changed Hearth’s config to the new address for now. I need to reserve the address in the router, but I can’t remember the router password and the card with it is in the landlord’s folder.'], ['o', 'The folder’s in the hall drawer, under the takeaway menus.'], ['n', '~Found it, reserved .31 for the strip, then put the config back. Done properly now.']]
				]
			},
			{
				detail: 'The app is slow too, and sometimes it says the light is offline for a few seconds.',
				probes: ['up', 'running', 'disk', 'router'],
				look: 'The strip drops off the Wi-Fi every time the microwave runs. Its controller box sits right behind the microwave, and they share the same bit of the radio band. Here is a ping from the Pi, with the microwave on for the second half:',
				lookPaste: 'ping:microwave',
				ends: [
					[['n', 'Moved the controller box to the other end of the strip, by the window. No drops in an hour with the microwave going:', 'ping:good'], ['a', 'Brilliant.']],
					[['n', 'The box is behind the microwave, and moving it means lengthening the strip’s cable. I’ve ordered an extension lead for it, which arrives {day}. Until then, I suppose, don’t microwave while you’re checking the tablet.'], ['a', 'Will try not to.'], ['n', '~The lead was the wrong connector. Sent it back; the right one is on its way.']]
				]
			},
			{
				detail: 'The app works, but it offered a firmware update this morning and I said yes.',
				probes: ['up', 'running', 'net', 'boots'],
				look: 'The update reset the strip’s network settings, and it came back on the guest network, where the Pi can’t see it. Nothing to do with the router.',
				ends: [
					[['n', 'Moved it back to the main network from the Lumen app. Back on the tablet:', 'states'], ['a', 'Thanks, sorry!'], ['n', 'Not your fault. The app could at least warn you it’s going to do that.']],
					[['n', 'Moved it back to the main network. It’ll happen again with the next update, so I’ve turned off automatic updates in the Lumen app and written a note on the router.'], ['a', 'OK, thanks.']]
				]
			}
		]
	},
	// The tablet on the wall.
	{
		since: PAGE,
		by: ['s', 'f', 'm'],
		askBy: 't',
		subjects: ['Tablet fell off the wall', 'Tablet keeps unplugging', 'Tablet won’t charge', 'Tablet mount', 'Tablet hanging off the wall'],
		open: [
			'The tablet fell off the wall again while I was cooking. It landed in the sink, which was empty, luckily, and it still works. It’s on the windowsill for now, propped against the fruit bowl.',
			'The tablet has been at 4% two days running. The cable is plugged in at both ends, I checked, and the page is so dim you can hardly read it.',
			'The tablet is coming away from the wall at the top. I’ve pushed it back, but the sticky strips are giving up and it leans out a bit more every day.'
		],
		ask: ['Ugh. Is it the stick-on strips giving up, or the charging? If it’s the charging, does the little light by the port come on, and does it flicker when you wiggle the cable?', 'I put it up with stick-on strips, which may be the steam from the kettle. But can you check the little light by the charging port too, and whether it flickers when you wiggle the cable?'],
		paths: [
			{
				detail: 'Probably, it’s right above the kettle and the strips feel damp.',
				lookBy: 't',
				look: 'The strips are rated for bathrooms, but not for sitting directly above a kettle that boils ten times a day. A screwed bracket would hold, but that means drilling.',
				ends: [
					[['n', 'I’ll ask the landlord about drilling. Two small holes in the grout should be fine.'], ['n', '~The agent says the landlord is fine with holes in the grout, not in the tiles.'], ['t', 'Done, it’s on a screwed bracket now. Not going anywhere.']],
					[['n', 'Asked the letting agent whether we can drill. No answer yet.'], ['a', '~Fell off again.'], ['n', 'Chased the agent. Still waiting to hear whether we’re allowed to drill.']],
					[['t', 'Moved it to the wall by the door instead, away from the kettle, on new strips. It’s held for a week.'], ['a', '~Still up. Happy.']]
				]
			},
			{
				detail: 'The light flickers when I wiggle the cable.',
				lookBy: 't',
				look: 'The cable has gone right at the plug; you can see the wires. I have a spare somewhere.',
				ends: [
					[['t', 'Swapped the cable and ran it down behind the bread bin so it doesn’t get bent every time someone moves the toaster.'], ['a', 'Charging again.']],
					[['t', 'Swapped it for my spare, which is a bit short; it only reaches if the tablet sits slightly crooked. I’ll get a longer one.'], ['a', 'Crooked is fine for now.']]
				]
			},
			{
				detail: 'The light comes on, but the back of the tablet is bulging a bit. Is that normal?',
				lookBy: 't',
				look: 'Not normal at all. The battery is swelling; it needs to come off the wall today. The battery screen says:',
				lookPaste: 'battery',
				ends: [
					[['t', 'It’s off the wall and on a tile on the balcony. I have an old tablet I don’t use; I’ll set it up instead this weekend.'], ['t', '~The old tablet is up and showing the page. The swollen one went to the recycling centre.'], ['a', 'Thanks Tariq!']],
					[['t', 'Took it down. I can’t get another one this month. The page works on any browser, so for now use your phone.'], ['a', 'OK. Can we get a new one?'], ['n', 'Mei has an old one she might give us; I’ve asked her.'], ['m', '~Still looking for it, I think it’s at my mum’s.']]
				]
			}
		]
	},
	// The tablet at night.
	{
		since: PAGE,
		by: ['s', 'f'],
		askBy: 't',
		chat: [['o', 'I don’t mind it, but I’m at the other end of the flat.'], ['x', 'Please don’t turn it off completely, I look at it when I come in late.']],
		subjects: ['Tablet too bright at night', 'Can the tablet go dark at night?', 'Kitchen glow', 'Tablet screen at night'],
		open: [
			'The tablet lights up the whole hall at night. My door doesn’t quite close, and it’s like a night light I never asked for. I’ve started putting a tea towel over it, which can’t be good for it.',
			'Coming in from late shifts at three in the morning, the tablet is blinding. Can it dim itself at night? I don’t need to know the temperature at 3am.',
			'Is there a way to have the tablet screen off overnight? It seems a waste to have it glowing while we’re all asleep, and it’s the brightest thing in the flat.'
		],
		ask: ['Easy enough. Do you want it off completely at night, or just very dim?', 'Yes, the tablet can do that. What hours would you like?'],
		paths: [
			{
				detail: 'Dim is fine, I like being able to see the temperature on my way out. Eleven till seven?',
				lookBy: 't',
				look: 'Set the screen to 5% from 23:00 to 07:00 with the tablet’s own schedule, and the page switches to a dark background at the same time:',
				lookPaste: 'schedule:dim',
				ends: [[['a', '~Much better, thank you.']], [['a', '~Better, but it still lights up the hall a bit.'], ['t', 'Took it down to the lowest it goes. That’s as dark as it gets without switching it off.'], ['a', 'Fine, that’ll do.']]]
			},
			{
				detail: 'Off would be best, but someone will want it in the morning.',
				lookBy: 't',
				look: 'The tablet can switch the screen off after a while and wake it when the camera sees movement. Set it up: off after two minutes with nobody around, on when someone walks in:',
				lookPaste: 'schedule:motion',
				ends: [
					[['a', '~Works, though it wakes up when next door’s cat walks along the window ledge.'], ['t', 'Turned the sensitivity down.']],
					[['o', '~This means it’s always off when I glance at it from the hall.'], ['t', 'Can’t please everyone. Leaving it like this unless someone really hates it.'], ['a', 'I like it.']]
				]
			},
			{
				detail: 'Off completely, eleven till seven.',
				lookBy: 'o',
				look: 'I use it at half six to decide what to wear. Can it at least come on at six?',
				ends: [
					[['a', 'Six is fine.'], ['t', 'Set: off from 23:00 to 06:00.'], ['a', '~Thanks.']],
					[['a', 'Half six then?'], ['o', 'Deal.'], ['t', 'Done, off from 23:00 to 06:30.']]
				]
			}
		]
	},
	// The Pi reboots by itself.
	{
		since: WEATHER,
		by: ['n', 't', 's'],
		weight: 3,
		subjects: ['Pi rebooting by itself', 'Hearth keeps going away for a few minutes', 'Pi restarting', 'Grey dot a few times a day'],
		open: [
			'The page goes grey for a few minutes [[a couple of times a day|every so often|once or twice a day]], and when it comes back the Pi says it has only been up for a few minutes. Nobody is restarting it on purpose, as far as I know. The list of boots:',
			'The dot on the tablet was grey [[twice|three times]] this evening, then green again a few minutes later. Is the Pi OK? It’s been doing it for a few days, I think.',
			'Looked at the Pi’s list of boots after the page went grey again. It has started up five times since Sunday, and none of those were me:'
		],
		openPaste: 'boots:plain',
		paths: [
			{
				probes: ['disk', 'net', 'heat'],
				look: 'The kernel log has undervoltage warnings just before every reboot. The Pi has been running off an old phone charger since the proper power supply went missing, and a phone charger can’t keep up when the Pi gets busy:',
				lookPaste: 'throttled',
				ends: [
					[['n', 'Bought the official power supply. No warnings and no reboots since:', 'throttledok'], ['o', '~Page has been green all week.']],
					[['t', 'The official one is in my room, I borrowed it for my own Pi. Sorry!'], ['n', 'Ha. Swapped back, and I’ve ordered you your own one.'], ['t', '~Mine arrived. All good.']]
				]
			},
			{
				probes: ['volts', 'disk', 'net'],
				look: 'No power warnings, but the Pi gets to over 80 °C when the boiler runs: the cupboard gets hot, the Pi slows itself down, and eventually it falls over. I logged it for an evening:',
				lookPaste: 'temps',
				ends: [
					[['n', 'Put the Pi in a case with a fan. It tops out at 56 now:', 'measuretemp'], ['s', '~The fan whines at night, I can hear it from my room.'], ['n', 'I’ve set the fan to come on only above 65, so it should be silent most nights.']],
					[['n', 'Propped the cupboard door open as a stopgap. A case with a fan is ordered, it arrives {day}.'], ['o', '~Has the case come?'], ['n', 'Not yet, it’s been delayed. The door stays open till it comes.']]
				]
			},
			{
				probes: ['volts', 'heat', 'disk'],
				look: 'No warnings in the log and the temperature is fine. The reboots are proper power cuts to the Pi: its log just stops mid-line, with no shutdown at all. Someone is switching the extension lead off.',
				ends: [
					[['o', 'That might be me. The vacuum plugs into the same lead and I switch it off at the lead when I’m done. I didn’t know the Pi was on it.'], ['n', 'Mystery solved. I’ve taped over the switch.'], ['a', '~No grey dot since.']],
					[['x', 'Oh. I switch that lead off when I iron, the iron trips it otherwise. Didn’t realise.'], ['n', 'Moved the Pi to the socket on the other side of the cupboard. Iron away.']]
				]
			}
		]
	},
	// The SD card.
	{
		since: OPENED,
		by: ['n'],
		weight: 3,
		subjects: ['SD card errors in the kernel log', 'Pi filesystem went read-only', 'Card errors again', 'Pi card is dying?'],
		open: [
			'Hearth stopped writing its log [[this morning|overnight|at some point last night]], and the kernel log is full of card errors. The filesystem has gone read-only, so the tracker can’t save anything either:',
			'The Pi went read-only overnight. Writing down what I saw so I remember it next time:',
			'Grey dot this morning. Logged into the Pi and couldn’t save a file, then found this:'
		],
		openPaste: 'dmesg',
		paths: [
			{
				lookBy: 't',
				look: 'Is the card dying? It’s the one from when you first set the Pi up, isn’t it?',
				ends: [
					[['n', 'It is, three years old and cheap. Flashed a new card from last week’s backup and copied the config across. Hearth and the tracker are back, nothing lost:', 'status:started'], ['t', 'Nice.']],
					[['n', 'Probably. Running on the old card after a disk check for now. A new card arrives {day}; I’ll swap it then.'], ['n', '~New card in, restored from the backup. Fine since.']]
				]
			},
			{
				look: 'Second time this year. Cards don’t like a Pi writing logs all day, every day.',
				ends: [
					[['n', 'Moved the whole system onto an old SSD over USB; it boots from that now. It should outlive the card by years:', 'dfok'], ['t', 'Seems faster too.']],
					[['n', 'Moved the logs into memory so they don’t wear the card, and kept the card. Not perfect, the logs are lost at every reboot, but the card should last.'], ['t', 'Fair trade.']]
				]
			},
			{
				look: 'It came back after a disk check, but the errors come back every few days.',
				ends: [[['n', 'Ordered an SSD and a USB adapter, arriving {day}. Until then we may get the odd grey dot.'], ['s', '~Grey dot again this morning.'], ['n', 'The SSD delivery has been pushed back a week. Rebooted it again in the meantime.']]]
			}
		]
	},
	// After a power cut.
	{
		since: WEATHER,
		by: ['t', 's', 'f', 'm'],
		ask: ['Did the router come back on its own? And is the tablet itself on, or black?', 'Thanks. Is the router back by itself, and is the tablet on, or just black?'],
		weight: 3,
		subjects: ['Hearth didn’t come back after the power cut', 'Nothing on the tablet after the power went off', 'After the power cut', 'Tablet blank since the power cut'],
		open: [
			'The power went off for about [[twenty minutes|half an hour|a quarter of an hour]] [[this morning|at breakfast|while I was in the shower]]. Everything came back except the page, which has a grey dot and a temperature from before the cut.',
			'We had a [[power cut|short power cut|blackout]] at {clock}. The router and the lights are back, the oven clock is flashing, but Hearth isn’t.'
		],
		freshBoot: true,
		guess: ['Same at work, the whole street went off. Maybe it needs a kick?'],
		paths: [
			{
				detail: 'The router came back by itself. The tablet is on, it’s just grey.',
				probes: ['up', 'net', 'tablet'],
				look: 'Hearth started before the Wi-Fi was up, couldn’t reach anything, crashed, and after a few quick restarts systemd gave up on it altogether:',
				lookPaste: 'status:failed',
				ends: [
					[['n', 'Started it by hand, and changed the service so it waits for the network and never stops retrying. It should survive the next one:', 'status:started'], ['a', 'Back. Thanks.']],
					[['n', 'Started it by hand. I’ll change the service so it waits for the network.'], ['a', '~Another power cut last night, and it didn’t come back again.'], ['n', 'Sorry, I never got round to it. Done now: it waits for the network and keeps retrying. I pulled the plug to test, and it came back on its own:', 'status:started']]
				]
			},
			{
				detail: 'The router came back by itself and the tablet is on, but the time under the reading looks wrong.',
				probes: ['running', 'net'],
				look: 'Hearth is running, but the Pi thinks it’s still the moment the power went, because it has no clock battery and hadn’t got the time from the internet yet:',
				lookPaste: 'timedate',
				ends: [
					[['n', 'The time came back once the router had finished starting, and everything caught up. Nothing to fix: the page was showing a reading stamped with the wrong time.'], ['a', 'OK, it’s right now.']],
					[['n', 'It caught up once the router was properly back. I could add a clock battery to the Pi so this doesn’t happen, about £5.'], ['a', 'Worth it?'], ['n', 'Not really, it only matters for ten minutes after a cut. Leaving it.']]
				]
			},
			{
				open: ['After this morning’s power cut the tablet is just black. I pressed the button on the side and nothing happened.', 'The power was off for a while this morning, and since then the tablet screen has been completely dark. Everything else came back by itself.'],
				lookBy: 't',
				detail: 'The tablet is black and won’t wake up when I press the button.',
				probes: ['up', 'running', 'readings'],
				look: 'Hearth is fine. The tablet switched itself off when its battery ran out during the cut, and it doesn’t start again by itself when the power comes back.',
				ends: [
					[['t', 'Turned on the setting that starts it when it’s plugged in. Tested by pulling the plug, it comes back.'], ['a', 'Nice.']],
					[['t', 'This tablet has no setting to start itself when the power comes back. Someone just has to hold the button for three seconds.'], ['a', 'Fine, I’ll put a note on it.']]
				]
			}
		]
	},
	// The weather stops every afternoon.
	{
		since: WEATHER,
		by: ['t', 's', 'm'],
		weight: 3,
		subjects: ['Weather stops in the afternoon', 'Temperature stuck every afternoon', 'Weather gone after 4pm', 'Page grey every evening'],
		open: [
			'Every day at around [[half four|twenty to five|five]] the temperature stops updating until the next morning. It has been like this all week. The dot goes grey too.',
			'Is it me, or does the weather stop at the same time every afternoon? I’ve noticed it [[three days running|all week|on and off]] now, always after four.',
			'The page has been grey every evening this week and fine every morning. Weird pattern.'
		],
		ask: ['Same time every day is a clue. When does it come back?', 'Interesting. I’ll check the logs tonight. Does it come back by itself?'],
		paths: [
			{
				detail: 'Around midnight, as far as I can tell.',
				probes: ['up', 'disk', 'net', 'tablet'],
				look: 'Skycast’s free plan allows 1,000 calls a day, and Hearth asks every minute, which is 1,440. Once the allowance is used up, Skycast refuses and Hearth crashes until midnight, when the count starts again. Their usage page:',
				lookPaste: 'usage:free',
				ends: [
					[['n', 'I’ve set Hearth to refresh every two minutes. That’s 720 a day, well inside the allowance. Today so far:', 'states'], ['o', '~That means the light lags by up to two minutes now too.'], ['n', 'True, everything refreshes together. Ideally the weather would refresh less often than the rest. Leaving this open for that.']],
					[['n', 'Set the refresh to every two minutes. The weather doesn’t change faster than that anyway.'], ['a', '~Fine all week, thanks.']]
				]
			},
			{
				until: CALLUM_LEAVES,
				detail: 'About midnight.',
				probes: ['up', 'disk', 'net', 'tablet'],
				look: 'Our Skycast account is making far more calls than Hearth does by itself, thousands a day more. Usage page:',
				lookPaste: 'usage:script',
				ends: [
					[['f', 'Oops, that’s my bike commute script. I used the flat’s Skycast account when I set it up in the spring. I’ll make my own.'], ['f', '~Done, mine has its own account now.'], ['n', 'Usage is back to Hearth’s 1,440 a day. All good:', 'usage:fixed']],
					[['f', 'That might be my script that texts me if it’s going to rain on the way home. Is it on the flat’s account? Sorry.'], ['n', 'It is. Could you make your own? It’s free.'], ['f', '~Done.']]
				]
			},
			{
				detail: 'Midnight-ish.',
				probes: ['up', 'disk', 'net', 'tablet'],
				look: 'Skycast cut the free plan from 2,000 to 1,000 calls a day this month, and Hearth makes 1,440. Usage:',
				lookPaste: 'usage:cut',
				ends: [
					[['n', 'Options: refresh every two minutes, or pay £2 a month for the next plan up. I’d rather pay than make everything lag.'], ['a', 'Fine by me, I’ll chip in.'], ['o', 'Same.'], ['n', 'Upgraded. The weather is updating again:', 'states']],
					[['n', 'Options: refresh less often, or pay for the next plan. Opinions?'], ['a', 'Pay, it’s pennies.'], ['o', 'Refresh less, I don’t want another subscription.'], ['n', '~Nobody else has said anything. Let’s decide at the flat meeting.']]
				]
			}
		]
	},
	// Guests and the tablet.
	{
		since: WEATHER,
		by: ['s', 'f', 'm'],
		chat: [['o', 'My parents were confused by it last time too.'], ['x', 'I think it’s obvious, but I’ve lived here two years.']],
		subjects: ['My parents thought the tablet was a TV', 'Cat-sitter question', 'Guests and the tablet', 'What is the tablet for, asked my mum'],
		open: [
			'My parents stayed over the weekend, and Dad spent ten minutes trying to get the news on the tablet. Not a bug exactly, but could it say what it is? He was convinced it was a TV that had lost its remote.',
			'The cat-sitter messaged to ask whether the tablet in the kitchen controls the heating, because the flat was cold and she wanted to turn it up. It doesn’t, right?',
			'Had friends round and one of them asked what the number on the kitchen screen is. It took a while to explain, and then they wanted to know why we have it.'
		],
		ask: ['Ha. What would have helped, a line at the top of the page?', 'It doesn’t. What did they think it was for?'],
		paths: [
			{
				lookBy: 't',
				look: 'I can add a small heading to the page. Something like “Hearth: the flat’s readings”.',
				ends: [
					[['t', 'Added a heading, and a little card for the fridge for guests.'], ['a', 'Perfect.']],
					[['n', 'I’ve laminated a card and stuck it under the tablet: what it is, and that tapping it does nothing.'], ['a', 'Ha, love it.']]
				]
			},
			{
				detail: 'They wanted to know if the heating was on. Which, fair.',
				look: 'That’s the bit that would actually help guests, and it’s the bit we can’t do: the boiler has no connection to anything.',
				ends: [[['a', 'Fine, I’ll just tell them.'], ['n', 'OK, leaving it.']]]
			},
			{
				detail: 'Mum also couldn’t read it without her glasses.',
				lookBy: 't',
				look: 'The number is already big. I could make the labels bigger, but then the page gets crowded.',
				ends: [[['a', 'Could it at least get bigger when someone taps it?'], ['t', 'That’s a change to the page, not to Hearth. I’ll do it next time I work on the page.'], ['a', '~Bump, Mum’s coming at Christmas.']]]
			}
		]
	},
	// The Pi's Wi-Fi.
	{
		since: WEATHER,
		by: ['n', 't', 's', 'f'],
		ask: ['When does it happen, roughly? Every evening, or at random?'],
		weight: 3,
		subjects: ['Pi’s Wi-Fi is terrible', 'Hearth drops off the network', 'Grey dot most evenings', 'Wi-Fi in the hall cupboard'],
		open: [
			'The page goes grey for a minute or two [[several times an evening|most evenings|a few times a night]]. [[Not a disaster, but it’s annoying|Not the end of the world, but it’s irritating|Minor, but noticeable]], and it seems worse when the heating is on.',
			'The Pi is unreachable from my laptop half the time. It sits in the cupboard behind the boiler, which can’t help.',
			'Grey dot again tonight. Is the Pi still on Wi-Fi? The signal in the hall is awful even on my phone.'
		],
		paths: [
			{
				detail: 'Evenings mostly, when the heating comes on, I think.',
				probes: ['up', 'running', 'heat', 'router'],
				look: 'The signal in the cupboard is poor, and worse when the boiler is on, because the Pi sits right behind it:',
				lookPaste: 'iw',
				ends: [[['n', 'Ran a flat cable from the router along the skirting into the cupboard. The Pi’s on a wire now:', 'pingrouter'], ['o', '~Not a single grey dot since.']]]
			},
			{
				detail: 'Evenings, especially when the washing machine is running. Not sure that’s related.',
				probes: ['up', 'running', 'heat', 'router'],
				look: 'The signal in the cupboard is poor, and drops to almost nothing when the boiler fires up:',
				lookPaste: 'iw',
				ends: [[['n', 'We can’t run a cable without drilling through the door frame. I’ve put a powerline adapter on it instead; not as good as a cable, but it doesn’t drop.'], ['o', '~Better. Still the odd grey dot when the washing machine is on.'], ['n', 'That’s the powerline adapter disliking the washing machine. Livable.']]]
			},
			{
				detail: 'All the time, honestly. Daytime too.',
				probes: ['up', 'running', 'heat', 'router'],
				look: 'The Pi barely hears the router from in there:',
				lookPaste: 'iw',
				ends: [[['n', 'The fix is a cable from the router, which means a small hole through the cupboard wall. Asked the letting agent.'], ['o', '~Any news?'], ['n', 'The agent says they’ll ask the landlord. Still waiting.']]]
			}
		]
	},
	// The new router.
	{
		since: WEATHER,
		by: ['t', 's', 'f'],
		ask: ['Did the new router come with a new Wi-Fi name and password, or did you keep the old ones?'],
		weight: 3,
		subjects: ['Everything broke after the new router', 'New router: tablet can’t see Hearth', 'Broadband swap', 'Router replaced'],
		open: [
			'The broadband company sent a new router and I plugged it in as the letter said[[| while everyone was out| this morning]]. The internet works, but the tablet is grey, and my laptop can’t find the printer.',
			'New router installed this morning. Phones are fine, but the page says it can’t find Hearth and the dot has been grey since.',
			'After the router swap: tablet grey, printer gone, and the TV box wants setting up again. Sorry, I thought it would just work.'
		],
		paths: [
			{
				detail: 'Kept the old name and password, like the letter said.',
				probes: ['up', 'running'],
				look: 'The new router handed out new addresses to everything, and the page is still looking for the Pi at its old one. Here’s what the new router gave out:',
				lookPaste: 'leases:swap',
				ends: [
					[['n', 'Reserved the old addresses again in the new router and restarted everything. The tablet is green:', 'leases:fixed'], ['a', 'The printer works too now.']],
					[['n', 'Reserved the Pi’s old address in the new router. The printer and the TV box I’ll do tomorrow.'], ['a', '~Printer still gone.'], ['n', 'Done now, sorry. Printer and TV box both back on their old addresses.']]
				]
			},
			{
				lookBy: 't',
				detail: 'There was a new name on the sticker, so I used that for my phone and the tablet.',
				probes: ['up', 'running', 'readings'],
				look: 'The tablet joined the new router’s guest network, which keeps devices from seeing each other. The Pi is fine.',
				ends: [[['t', 'Moved the tablet to the main network and made it forget the guest one. Green again:', 'kiosk'], ['a', 'Thanks!']]]
			},
			{
				since: LUMEN,
				detail: 'Kept the old name and password.',
				probes: ['up', 'running'],
				look: 'Everything is back except the light strip, which only does 2.4 GHz. The new router puts both bands under one name, and the strip won’t join it.',
				ends: [
					[['n', 'Made a separate 2.4 GHz network just for the strip. Not elegant, but it works:', 'states'], ['a', 'Showing again.']],
					[['n', 'The router can only split the bands from an admin page that the broadband company locks. Asked their support to turn it on.'], ['n', '~Their support say they’ll call back. Still waiting.']]
				]
			}
		]
	},
	// The printer.
	{
		since: OPENED,
		by: ['s', 'f', 'm', 't'],
		chat: [['x', 'Same on my laptop, for what it’s worth.'], ['o', 'Mine printed fine on Sunday, so it’s recent.']],
		ask: ['Can you print the printer’s own status page? Hold its Wi-Fi button for five seconds.'],
		subjects: ['Printer offline again', 'Can’t print', 'Printer', 'Printer not showing on my laptop'],
		open: [
			'Sorry, I know this is the Hearth tracker, but nobody can print and you’re the person who knows things. I need a boarding pass by tomorrow morning.',
			'The printer says it’s online on its little screen, but my laptop can’t find it at all.',
			'Can the tablet tell us when the printer is out of ink? I found out the hard way, ten minutes before an interview.'
		],
		paths: [
			{
				lookPaste: 'printer',
				detail: 'Printed it. It has an address on it I don’t recognise.',
				look: 'The printer picked up a new address after the last router restart, and your laptop is still looking for it at the old one.',
				ends: [[['n', 'Reserved an address for the printer in the router and added it again on your laptop. Try now.'], ['a', 'Printed. Thank you!']]]
			},
			{
				lookPaste: 'printer',
				detail: 'It says the toner is low, which I knew.',
				look: 'The printer does report its ink level, but honestly a note on the printer would do the same job. Is it worth putting on the tablet?',
				ends: [
					[['a', 'Probably not, I print twice a year.'], ['o', 'Agreed, not worth it.'], ['n', 'Leaving it then.']],
					[['a', 'I think it would be useful.'], ['n', 'OK, it’s on the list after everything else. Low priority.'], ['a', 'Fair.']]
				]
			},
			{
				detail: 'It won’t print anything, not even that. It just flashes orange.',
				look: 'The printer is showing a paper-feed error that won’t clear. It’s eight years old.',
				ends: [[['o', 'Shall we just get a new one? I’ll pay my share.'], ['n', 'Ordered a cheap laser one, split four ways. Arrives {day}.'], ['n', '~Set up and on everyone’s laptop.']]]
			}
		]
	},
	// The heating.
	{
		since: WEATHER,
		by: ['t', 's', 'f', 'm'],
		chat: [['o', 'Yes please. I never know if it’s on.'], ['x', 'I’d settle for knowing whether the timer is set.'], ['t', 'If it ever happens, it would fit next to the temperature on the page.']],
		ask: ['Do you mean on as in the boiler is firing, or on as in the timer says it should be?'],
		winter: true,
		subjects: ['Show whether the heating is on', 'Heating on the tablet?', 'Could the tablet show the heating', 'Thermostat'],
		open: [
			'Would it be possible to show on the tablet whether the heating is on? I’m never sure whether it’s on and the flat is just cold, or off. The dial in the hall doesn’t tell you anything.',
			'The thing I actually want from the tablet is the heating. The outside temperature is nice, but what I want to know at six in the evening is whether the flat will be warm by the time I’ve cooked. Is that doable?',
			'Could we get a smart thermostat and put it on the tablet? The dial and the timer in the hall are a mystery to me, and I’m scared to touch them.'
		],
		paths: [
			{
				detail: 'Both, really. I just want to know whether it’s supposed to be warm.',
				look: 'The boiler only has the dial and the timer on the front, nothing Hearth can talk to. It would need a smart thermostat, and that’s the landlord’s boiler and the landlord’s call.',
				ends: [
					[['a', 'Can we ask?'], ['n', 'Emailed the letting agent.'], ['n', '~The agent says the landlord will think about it when the boiler is serviced in the spring.']],
					[['n', 'Asked the agent anyway. The landlord said no, he doesn’t want anything wired into the boiler.'], ['a', 'Shame.']]
				]
			},
			{
				detail: 'I just want to know whether the living room is warm before I come out of my room.',
				look: 'We can’t touch the boiler, but a cheap thermometer in the living room would at least tell us whether it’s warm in here. I borrowed one from work for a day, next to what the tablet showed outside:',
				lookPaste: 'indoor',
				ends: [
					[['a', 'That would help, yes.'], ['n', 'Leaving this open for an indoor temperature on the tablet.']],
					[['a', 'I can just look at a thermometer.'], ['n', 'True. Bought one for the hall shelf, £4.'], ['a', 'Ha, low-tech. Fine.']]
				]
			}
		]
	},
	// The bins.
	{
		since: WEATHER,
		by: ['t', 's', 'f', 'm'],
		chat: [['o', 'I’d use that every single week.'], ['x', 'Only if it doesn’t push the temperature off the screen.'], ['t', 'There’s room under the temperature for one more line, if it’s short.']],
		ask: ['Which ones get missed, recycling or general, or both?'],
		subjects: ['We missed the bins again', 'Bin day on the tablet?', 'Which bin this week?', 'Bins'],
		open: [
			'We missed recycling again. Could the tablet show which bin goes out and when? The box is overflowing and the glass is now on the balcony.',
			'The council changed the bin days and nobody noticed for two weeks. The recycling box is overflowing.',
			'Every week someone asks the group chat which bin it is. Could the tablet just say?'
		],
		paths: [
			{
				detail: 'Recycling mostly. It’s every other week, which nobody can remember.',
				look: 'The council publishes the dates for each address. Simplest thing first: I’ve printed this year’s calendar for 14 Brookside Road and stuck it on the fridge. The next few, from the council’s page:',
				lookPaste: 'bins',
				ends: [
					[['a', '~Helps. Still think the tablet would be better.'], ['n', 'Agreed, keeping this open for the tablet.']],
					[['a', 'That’ll do.'], ['n', 'OK.']],
					[['a', '~The dates moved over the bank holiday and the fridge calendar didn’t know.'], ['n', 'Fair point. Keeping this open for the tablet, then.']]
				]
			},
			{
				detail: 'Both, honestly.',
				look: 'The council has a free text reminder the night before. It might be all we need.',
				ends: [[['a', 'Signed up. It worked last night!'], ['o', 'Signed up too.']]]
			},
			{
				detail: 'General, last week. The bin men don’t take it if the lid doesn’t shut.',
				look: 'Yes, that’s doable, the council publishes the dates for every address. This is what its page says for us at the moment:',
				lookPaste: 'bins',
				ends: [[['o', '~Bump, missed general waste this week.'], ['n', 'Still on my list, sorry.']]]
			}
		]
	},
	// Air quality.
	{
		since: PURIFIER,
		by: ['s'],
		chat: [['o', 'I’d like that too, the living room gets stuffy in the evenings.'], ['t', 'A coloured dot would be enough on the page: green, amber, red.'], ['x', 'As long as it doesn’t beep at us.']],
		subjects: ['Air quality on the tablet', 'Purifier reading on the tablet?', 'Show the purifier', 'Air after cooking'],
		open: [
			'My purifier in the living room shows the air quality on its own little screen, but you have to walk over to see it. Could the tablet show it?',
			'The purifier goes into overdrive every time someone fries something. I’d love to see that on the tablet, so people put the extractor on.',
			'Now that the Aerona is in the living room, could Hearth show its reading? My asthma has been worse this autumn, and I’d like to see when the air is bad without getting up.',
			'This is what the purifier’s app showed for yesterday evening. You can see exactly when someone started cooking:'
		],
		openPaste: 'pm25',
		paths: [
			{
				look: 'It can be reached on the flat’s Wi-Fi, so it should be possible. On the list.',
				ends: [[['a', '~Any news?'], ['n', 'Not yet, sorry. Still on the list.']], [['a', '~Bump.'], ['o', 'I’d like it too.'], ['n', 'Noted, it’s near the top now.']]]
			},
			{
				look: 'I can, but it might be a while. In the meantime the purifier’s own app has a widget for your phone.',
				ends: [[['a', 'Set up the widget. It’s fine for now, but I’d still like it on the tablet eventually.'], ['n', 'Noted, leaving this open.']]]
			},
			{
				look: 'Happy to, but there’s a bit of setting up first.',
				ends: [[['a', '~Actually, I’ve moved the purifier into my room, so the living room reading doesn’t matter any more. Never mind.'], ['n', 'OK.']]]
			},
			{
				look: 'Happy to look at it.',
				ends: [[['o', 'Or we could just turn the extractor on when we cook?'], ['a', 'We could. Let’s try that first.'], ['a', '~Much better with the extractor on. Don’t need it on the tablet after all.']]]
			}
		]
	},
	// The washing machine.
	{
		since: OPENED,
		by: ['t', 's', 'm'],
		chat: [['o', 'Yes, please, my towels have been in there since Tuesday.'], ['x', 'Couldn’t we just agree to empty it when it’s done?'], ['t', 'A line saying the washing is done at the top of the page would be enough.']],
		ask: ['Is it the end of the wash you want to know about, or when the door unlocks?'],
		subjects: ['Know when the washing is done', 'Washing machine finished?', 'Washing machine alert'],
		open: [
			'I can’t hear the washing machine finish from my room, so things sit damp for hours and then smell, and I have to wash them again. Any way the tablet could tell us when it’s done?',
			'Somebody’s washing sat in the machine all night again, and I needed it at seven. Not naming names. Could the tablet show when it’s finished, so whoever started it sees it on the way past?'
		],
		paths: [
			{
				detail: 'When the door unlocks and it can be emptied.',
				look: 'The machine has no connection at all. Simplest thing: set a timer on your phone when you start it.',
				ends: [[['a', 'Fine, I’ll do that.'], ['o', 'Will do.']]]
			},
			{
				since: dayOf(2026, 10, 12),
				lookPaste: 'wash',
				detail: 'The end, when it can be emptied.',
				look: 'You can tell from the power it draws. I borrowed a plug-in meter and watched a wash: when it drops to almost nothing for a few minutes, it’s done. I’ve ordered a Nordlys smart plug that measures power, it arrives {day}.',
				ends: [
					[['n', '~The plug is in, between the wall and the machine, and I’ve given it .40 in the router. It isn’t on the tablet yet; that’s next.'], ['a', 'Exciting.']],
					[['a', 'Ooh.'], ['n', '~It’s been delayed, arriving next week now.']]
				]
			},
			{
				until: CALLUM_LEAVES,
				detail: 'When it can be emptied.',
				look: 'A plug that measures power would do it.',
				ends: [[['f', 'Honestly, I’ll just hang it up straight away. Sorry.'], ['a', '~It’s been fine for a month. Forget it.'], ['n', 'OK.']]]
			}
		]
	},
	// The electricity bill.
	{
		since: WEATHER,
		by: ['t', 's', 'm'],
		ask: ['Which quarter, and roughly how much higher?'],
		subjects: ['Electricity bill went up', 'Is the Pi costing us much?', 'Energy bill question', 'Why is the bill so high'],
		open: [
			'The electricity bill for last quarter is a lot higher than the same quarter last year. Is it the Pi and the tablet being on all the time?',
			'Before anyone blames me: is Hearth expensive to run? The bill went up again.'
		],
		openPaste: 'bill',
		paths: [
			{
				detail: 'Last quarter, about £60 more than the same quarter last year.',
				look: 'Borrowed a plug-in meter and went round the flat. Hearth is not the problem:',
				lookPaste: 'meter:heater',
				ends: [[['f', 'Ah. The heater in my room is mine. I’ll use it less, sorry.'], ['a', 'Thanks.']]]
			},
			{
				detail: 'The summer one. It was almost as much as the winter.',
				look: 'Borrowed a meter from work and went round everything that plugs in:',
				lookPaste: 'meter:dryer',
				ends: [[['a', 'So it’s the tumble dryer.'], ['o', 'Then we use the airer more.'], ['n', 'Agreed. Nothing to do with Hearth.']]]
			},
			{
				detail: 'Last quarter, about a third more.',
				look: 'Borrowed a plug-in meter for a week:',
				lookPaste: 'meter:fridge',
				ends: [[['n', 'The fridge freezer uses more than everything else put together. It’s the landlord’s. Asked the agent if they’ll replace it.'], ['n', '~The agent says the landlord will replace it in the new year.']]]
			},
			{
				detail: 'About £40 more for the last quarter.',
				look: 'We used about the same as last year. The price per unit went up in April.',
				ends: [[['a', 'Oh. Nothing we can do then.'], ['o', 'I looked at switching in the summer, nothing cheaper.'], ['n', 'Leaving it then.']]]
			}
		]
	},
	// More weather.
	{
		since: WEATHER,
		by: ['t'],
		chat: [['o', 'Rain would be more use to me than wind.'], ['s', 'I’d look at that too, for walking to the station.'], ['x', 'Is that not what the weather app is for?']],
		subjects: ['Wind on the tablet', 'Could the tablet show rain?', 'Cycling weather', 'More weather on the tablet'],
		open: [
			'Would love to see the wind on the tablet before I cycle in. The temperature alone doesn’t tell me whether to take the train: ten degrees and calm is lovely, ten degrees with a headwind over the bridge is miserable.',
			'Chance of rain for the next hour would be the most useful thing the tablet could show, for me anyway. This morning, for example, the forecast looked like this and the tablet just said a temperature:'
		],
		openPaste: 'forecast',
		paths: [
			{
				look: 'Skycast reports the wind as well, it just isn’t on the tablet. Good idea, on the list.',
				ends: [[['a', '~Bump, windy season.'], ['n', 'Still on the list.']]]
			},
			{
				look: 'Could do, but your phone already tells you.',
				ends: [[['a', 'True. I’ll use the widget.'], ['n', 'OK.']]]
			},
			{
				look: 'Good idea. I’ll look at it.',
				ends: [[['a', '~Never mind, I’ve started taking the train every day.'], ['n', 'Ha, OK.']]]
			}
		]
	},
	// Renaming the kitchen light.
	{
		since: LUMEN,
		by: ['s', 'f'],
		subjects: ['Rename the kitchen light', 'Light has the wrong name', 'Strip moved', 'Worktop light'],
		open: ['I’ve moved the strip from under the cupboards to the shelf over the worktop, where it actually lights the chopping board. Could the tablet call it the worktop light? “Kitchen” sounds like the big ceiling light.', 'The tablet calls the strip “kitchen”, but we have two kitchen lights now, since the landlord put the new ceiling one in. Could it be the worktop light? I keep thinking the tablet means the big one.'],
		paths: [
			{
				look: 'Changed its name in Hearth’s config to “worktop” and restarted.',
				ends: [[['t', '~That broke the page: it looks for the light by name, so it shows nothing for the light now.'], ['t', 'Updated the page to the new name. Showing again.'], ['a', 'Thanks both.']]]
			},
			{
				look: 'Changed its name in the config to “worktop”.',
				ends: [[['t', '~The page lost the light after the rename. Can we keep the old name? I’d rather not change the page this week.'], ['n', 'Put the name back to “kitchen”. The page will just have to call it that.'], ['a', 'Fine, it’s only a name.']]]
			},
			{
				look: 'Happy to, but Tariq’s page looks for the light by its name, so we’d have to change both at once. Tariq?',
				ends: [[['t', '~I’m away until the weekend. Can do it then.']]]
			}
		]
	},
	// Getting Hearth going on the Pi.
	{
		since: OPENED,
		until: dayOf(2025, 3, 20),
		max: 2,
		by: ['n'],
		subjects: ['Getting Hearth onto the Pi', 'Hearth won’t install on the Pi'],
		open: ['Writing down what happened installing Hearth on the Pi, for next time:'],
		openPaste: 'pip',
		paths: [
			{
				look: 'The Pi was still on the old OS with Python 3.9, and Hearth needs 3.11.',
				ends: [[['n', 'Reinstalled the Pi with the current OS, which has 3.11. Installed fine, and it starts at boot now:', 'status:started'], ['t', '~Nice, the tablet can see it.']]]
			},
			{
				look: 'The Pi is on the old OS with Python 3.9.',
				ends: [[['n', 'Built 3.11 from source next to the system one, which took an hour on the Pi. Works, but upgrading the OS properly is on my list.'], ['t', '~Still on the list?'], ['n', 'Yes. Some weekend.']]]
			}
		]
	},
	// Noise from the cupboard.
	{
		since: dayOf(2025, 5, 1),
		by: ['s', 'f'],
		ask: ['All night, or only sometimes?'],
		subjects: ['Something whining in the hall at night', 'Pi fan noise', 'Noise from the cupboard'],
		open: ['There’s a high whine from the hall cupboard at night. Is that the Pi? It stops when I open the cupboard door, which makes no sense, and starts again when I close it.', 'I can hear the Pi’s fan from my bed. It never used to be there, and once you’ve noticed it you can’t stop hearing it.'],
		paths: [
			{
				detail: 'All night. It’s a constant whine.',
				look: 'It’s the fan on the Pi’s case. It runs flat out all the time, whatever the temperature.',
				ends: [[['n', 'Set it to come on only above 65 °C. It’s off most of the night now.'], ['a', '~Silent. Thank you.']]]
			},
			{
				detail: 'Most nights, and it’s getting louder.',
				look: 'It’s the Pi’s fan, and it’s getting noisier, probably the bearing.',
				ends: [[['n', 'Swapped the fan case for a fanless aluminium one. Silent, and it runs at about 55 °C.'], ['a', 'Bliss.']]]
			},
			{
				detail: 'Every night now.',
				look: 'It’s the fan, and it’s on its way out.',
				ends: [[['n', 'Ordered a fanless case, it comes {day}. I’ve put a towel along the bottom of the cupboard door in the meantime.'], ['a', '~Still whining.'], ['n', 'The case went to the wrong address and they’re sending another. Still waiting.']]]
			}
		]
	},
	// Other things on the tablet.
	{
		since: PAGE,
		by: ['s', 'f', 'm'],
		askBy: 't',
		chat: [['o', 'I’d use a timer, for what it’s worth.'], ['x', 'Please keep it simple, it’s nice that it does only one thing.']],
		subjects: ['Can the tablet play the radio?', 'Recipes on the tablet', 'Use the tablet for other things', 'Timer on the tablet'],
		open: [
			'Could the tablet also play the radio while I cook? My phone speaker is useless over the extractor fan, and the tablet is right there on the wall doing nothing most of the time.',
			'It would be handy to have a recipe up on the tablet while cooking. At the moment it’s locked to the page, so I end up with my phone propped against the kettle getting splashed.',
			'Could the tablet have a kitchen timer? I keep burning things because my phone is in the other room, and the oven timer is broken.'
		],
		paths: [
			{
				lookBy: 't',
				look: 'The tablet is locked to the page in kiosk mode, but I can add a second profile that isn’t. Swipe down and pick it.',
				ends: [[['a', '~Works. Though someone left it on the other profile overnight and the page was gone all evening.'], ['t', 'Set it to go back to the page after half an hour of nobody touching it.']]]
			},
			{
				lookBy: 't',
				look: 'I’d rather keep it locked; it’s the one screen in the flat that just shows things.',
				ends: [[['a', 'Fair, I’ll use my phone.']]]
			},
			{
				lookBy: 't',
				look: 'A timer on the page is doable, I’ll add it when I next work on the page.',
				ends: [[['a', '~Bump.'], ['t', 'Still on my list, sorry.']]]
			}
		]
	},
	// Callum moves out.
	{
		since: dayOf(2026, 7, 20),
		until: CALLUM_LEAVES - 2 * 1440,
		max: 1,
		by: ['n'],
		subjects: ['Callum moving out: things to undo'],
		open: ['Callum leaves at the end of August. Making a list here so I don’t forget anything: his phone and PC off the Wi-Fi, his phone out of the Lumen app, the bike script off the flat’s Skycast account, and his name off the tracker.'],
		paths: [
			{ look: 'Callum, can you do the Lumen app one yourself? It has to be done from your phone.', ends: [[['f', 'Done. And the script has had its own account for months.'], ['n', '~Wi-Fi done, tracker done. That’s everything.']]] },
			{ look: 'Wi-Fi done and the router password changed. Callum, the Lumen one has to be done from your phone.', ends: [[['f', 'Will do before I go.'], ['n', '~Callum’s gone and his phone is still in the Lumen app. Messaged him.']]] }
		]
	},
	// Jonah moves in.
	{
		since: JONAH_ARRIVES,
		until: dayOf(2026, 10, 25),
		max: 2,
		by: ['f'],
		subjects: ['New here: what does the tablet do?', 'Kitchen light on my phone?'],
		open: ['Hi all, new here. What does the tablet in the kitchen do, and can I get the kitchen light on my phone like everyone else? I keep standing in the dark looking for a switch that isn’t there.', 'Is there a way to get the kitchen light on my phone? Tariq said to ask here, and that this is where everything about the flat’s gadgets lives.'],
		paths: [
			{ look: 'Welcome! The tablet shows the outside temperature and whether the kitchen light is on, nothing else, and tapping it does nothing. The light is switched from the Lumen app; I’ve sent you an invite.', ends: [[['a', 'Got it, works. Thanks!']]] },
			{ look: 'The Lumen app only allows four people, and Callum is still on it. I’ve asked him to take himself off.', ends: [[['a', '~Any word from Callum?'], ['n', 'Not yet. Still waiting on him.']]] },
			{ look: 'The tablet only shows the outside temperature and the kitchen light. The light is switched from the Lumen app, invite sent.', ends: [[['a', 'Thanks. Could it show the heater in my room too?'], ['n', 'It’s a plain oil heater with a dial, there’s nothing to read. Sorry.'], ['a', 'Fair enough.']]] }
		]
	},
	// The clocks change.
	{
		since: WEATHER,
		max: 3,
		by: ['t', 's', 'f', 'm'],
		after: [dayOf(2025, 3, 30), dayOf(2025, 10, 26), dayOf(2026, 3, 29), dayOf(2026, 10, 25)],
		subjects: ['Tablet clock an hour out', 'The clocks changed, the page didn’t', 'Wrong time on the page'],
		open: ['The clocks changed at the weekend, but the time on the page is still an hour out. Everything else in the flat has changed by itself, even the oven, which never does.', 'The “updated” time on the page has been an hour off since the weekend. It made me think the page was stuck, until I worked out it was exactly an hour.'],
		paths: [
			{ lookBy: 't', look: 'The tablet’s time zone was set to a fixed hour instead of London, so it never changes for summer time.', ends: [[['t', 'Set it to London. It should change by itself from now on.'], ['a', 'Right now, thanks.']]] },
			{ look: 'The Pi keeps its log in UTC, which is why it looked an hour out when I sent the log round. The page shows local time and is right.', ends: [[['a', 'Oh, it’s fine on the tablet now, maybe I misread it.'], ['n', 'OK, nothing to do then.']]] },
			{ lookBy: 't', look: 'My fault: the page works out the time itself and I got summer time wrong.', ends: [[['t', 'Fixed on the page.'], ['a', 'Thanks.']]] }
		]
	},
	// Frost.
	{
		since: WEATHER,
		by: ['s', 'f', 'm'],
		chat: [['o', 'Seconded, I nearly went flying on the steps too.'], ['t', 'The page could do something without any change to Hearth.']],
		winter: true,
		subjects: ['Frost warning on the tablet?', 'Warn us when it’s icy', 'Ice warning'],
		open: ['Could the tablet go a different colour when it’s below freezing? I scraped the car for fifteen minutes this morning and was late for work, and the tablet said {temp} at seven, which I read without really reading it.', 'Slipped on the front steps this morning, they were glassy. A frost warning on the tablet would be nice, something you notice on the way out without having to think about the number.'],
		paths: [
			{ lookBy: 't', look: 'The page could turn the number blue below 1 °C. Easy enough.', ends: [[['t', 'Done, it goes blue below 1 °C.'], ['a', '~Saw it this morning. Love it.']]] },
			{ look: 'The trouble is that it’s the overnight low that matters, and the tablet only shows the temperature now. Last night’s forecast against what the tablet showed at bedtime:', lookPaste: 'forecast', ends: [[['n', 'Leaving this open for an overnight low on the tablet.'], ['a', 'That would be even better.'], ['o', '~Bump, first frost tonight.']]] },
			{ look: 'An overnight low would be the useful thing, and the tablet only shows the temperature now. Leaving this open for that.', ends: [[['a', 'That would be even better.'], ['o', '~Bump, first frost tonight.']]] },
			{ look: 'Fair, but the number is right there. Do we need a colour too?', ends: [[['a', 'I guess not. Forget it.']]] }
		]
	},
	// Backups.
	{
		since: dayOf(2025, 4, 1),
		by: ['t', 's'],
		chat: [['o', 'And what do we lose if it dies? Just the tracker?'], ['n', 'The tracker, the config and the logs. Hearth itself is on my laptop as well.']],
		subjects: ['Do we have a backup of the Pi?', 'Backups', 'What if the Pi dies?'],
		open: ['After last week’s scare, do we have a backup of the Pi? I don’t mean Hearth itself, I mean the tracker with everyone’s complaints in it, and whatever else lives on there.', 'Genuine question: if the Pi dies, how long until the tablet works again? And would we lose anything? I realise I have no idea what’s on it apart from Hearth.'],
		paths: [
			{ look: 'I copy the whole card to my laptop on the first Sunday of every month. Restoring takes about half an hour.', ends: [[['a', 'Good enough for me.']]] },
			{ look: 'Honestly, not a recent one. I copy it to my laptop when I remember, which isn’t often.', ends: [[['a', 'Could it happen by itself?'], ['n', 'It could, to the NAS every night. Leaving this open for that.']]] },
			{ look: 'There’s a backup from the summer. I want to back it up to a USB drive every night, but the drive I had died. A new one is ordered, it arrives {day}.', ends: [[['a', '~Did the drive come?'], ['n', 'Not yet.']]] }
		]
	},
	// The TV box.
	{
		since: OPENED,
		by: ['t', 's', 'f', 'm'],
		chat: [['x', 'It’s slow on my laptop in the evenings as well.'], ['o', 'It was fine during the day when I worked from home.']],
		subjects: ['TV box can’t find the Wi-Fi', 'TV keeps buffering', 'TV box'],
		ask: ['Is the box on the Wi-Fi or on a cable? And is it worse at any particular time?', 'Wi-Fi or cable, the box? And is it every evening, or only sometimes?'],
		open: ['The TV box keeps buffering every evening. Is it the Wi-Fi or the box? It’s fine for the first ten minutes and then it stops every couple of minutes, which makes anything with subtitles unwatchable.', 'The TV box lost the Wi-Fi after the weekend, and when it does connect, everything buffers. I know it’s not Hearth, sorry, but this is where things get fixed.'],
		paths: [
			{ detail: 'Wi-Fi. It’s worst at about nine.', look: 'Not Hearth, but: the router had been up for 94 days and was struggling. Speed tests from my laptop before and after restarting it:', lookPaste: 'speed', ends: [[['a', 'Smooth all evening. Thanks.']]] },
			{ detail: 'Wi-Fi, I think. There’s no cable going into it.', look: 'The box was on the 2.4 GHz network, which is crowded here. Moved it to 5 GHz. Speed tests from the box’s own settings page:', lookPaste: 'speed', ends: [[['a', 'Perfect now.']]] },
			{ detail: 'Wi-Fi, and it takes ages to start up as well.', look: 'The box is seven years old and can’t keep up with the apps any more.', ends: [[['o', 'There’s a cheap stick that does the same, I’ll get one.'], ['o', '~Stick plugged in, the old box is in the cupboard.']]] }
		]
	},
	// The page is blank.
	{
		since: WEATHER,
		weight: 2,
		by: ['s', 'f', 'm'],
		subjects: ['Tablet page is blank', 'White screen on the tablet', 'Page won’t load'],
		open: [
			'The tablet just shows a white page this morning, no temperature, no dot, nothing. I pulled down to reload and it thought about it for a while and then showed the same white page.',
			'The page on the tablet says it can’t be reached. The tablet’s Wi-Fi is on, and the internet works on it, I checked the news.'
		],
		ask: ['Does it say anything at all, even small grey text?', 'Since when, roughly? Did it work last night?'],
		paths: [
			{
				detail: 'It worked last night. Now it says the site can’t be reached and something about the address.',
				probes: ['up', 'running', 'disk', 'readings'],
				look: 'Hearth is fine. The tablet finds the Pi by its name, and since the router restarted on {wday} the name doesn’t resolve any more, so the tablet doesn’t know where the page is.',
				ends: [
					[['t', 'Pointed the tablet at the Pi’s address instead of its name. The address is reserved, so it won’t move. Page is back:', 'kiosk'], ['a', 'Thanks.']],
					[['t', 'Restarted the router and the name works again. It’ll happen again, though.'], ['n', 'Use the address, it’s reserved.'], ['t', '~Done, the tablet uses the address now.']]
				]
			},
			{
				detail: 'It worked last night. Small grey text: “connection refused”.',
				probes: ['up', 'disk', 'net', 'readings'],
				look: 'Hearth is running, but the little server that hands the page to the tablet didn’t start after the Pi rebooted for its updates. It was never set to start at boot; we’ve just been lucky.',
				ends: [
					[['t', 'My fault, that’s mine. Set it to start at boot and started it. Page is back.'], ['a', 'Back here too.']],
					[['t', 'Started it by hand. I’ll make it start at boot this weekend.'], ['a', '~White again this morning.'], ['t', 'Sorry. Done properly now: it starts at boot, and I rebooted the Pi to check.']]
				]
			},
			{
				detail: 'It worked last night. Nothing written on it, it’s just white.',
				probes: ['up', 'running', 'readings', 'router'],
				lookBy: 't',
				look: 'The Pi and the page are fine from my laptop. The tablet’s browser had run out of storage and couldn’t even draw the page.',
				ends: [[['t', 'Cleared the browser’s storage and set it to clear itself every week. Page is back:', 'kiosk'], ['a', 'Perfect, thanks.']]]
			}
		]
	},
	// The reading jumps between two numbers.
	{
		since: WEATHER,
		weight: 2,
		by: ['t', 's', 'f'],
		subjects: ['Temperature keeps jumping', 'Tablet flips between two temperatures', 'Weather reading flickering'],
		open: [
			'The temperature on the tablet is flipping between two numbers about a degree apart, every minute or so. [[It looks like it can’t make up its mind.|Like it’s arguing with itself.|Very odd to watch.]]',
			'Is it normal for the temperature to go up and down by a degree every time the page updates? Watched it for five minutes while the pasta cooked: {temp}, then a degree less, then {temp} again.'
		],
		paths: [
			{
				probes: ['up', 'disk', 'sky', 'tablet'],
				look: 'There are two copies of Hearth running: the service, and one I started by hand a few days ago to test something and forgot about. They read the weather a few seconds apart, the old one with my test location, and the page shows whichever wrote last:',
				lookPaste: 'twins',
				ends: [[['n', 'Stopped the one I’d started by hand. Only the service is left, and the temperature is steady:', 'states'], ['a', 'Ha. Steady now.']], [['n', 'Killed the stray one. Sorry, that was me.'], ['a', '~Steady all week.']]]
			},
			{
				probes: ['up', 'running', 'disk', 'tablet'],
				look: 'Only one Hearth running, and it really is getting two different numbers from Skycast, depending on which of their stations answers. Skycast’s forum says they are moving the Ashford readings between two sites this month:',
				lookPaste: 'flip',
				ends: [
					[['n', '~They finished moving it and it’s steady again. Nothing to do on our side.'], ['a', 'Good.']],
					[['n', 'I’ve asked Skycast whether we can choose the station. No answer yet.'], ['a', '~Still flipping.'], ['n', 'Still waiting on Skycast.']]
				]
			}
		]
	},
	// The light shows late on the tablet.
	{
		since: LUMEN,
		weight: 2,
		by: ['t', 's', 'f', 'm'],
		subjects: ['Tablet slow to show the light', 'Light on the tablet lags', 'Kitchen light status is behind'],
		open: [
			'When I switch the kitchen light off with the app, the tablet keeps saying it’s on for up to a minute. Not a big deal, but it makes me think the app didn’t work, and I end up pressing it twice and turning it back on.',
			'The tablet takes ages to notice the kitchen light. Switched it on, counted to forty before the tablet agreed.'
		],
		paths: [
			{
				probes: ['up', 'running', 'net'],
				look: 'That’s how it works at the moment: Hearth asks the strip once a minute, with everything else, so the tablet can be up to a minute behind. The log shows the change arriving on the next minute:',
				lookPaste: 'states',
				ends: [
					[['a', 'Could it ask more often?'], ['n', 'It could, but then the weather would be asked more often too, and Skycast counts every call. I’d rather the light was asked more often than the weather. Leaving this open for that.'], ['a', 'OK.']],
					[['a', 'Fine, now I know, I’ll just wait for it.'], ['n', 'OK, leaving it as it is.']]
				]
			},
			{
				probes: ['up', 'running', 'readings'],
				lookBy: 't',
				look: 'Hearth has it within a minute, but the page only reloads its numbers every two minutes, which I set ages ago to save the tablet’s battery. It’s on the charger all the time now, so there’s no reason for that.',
				ends: [[['t', 'The page now picks up new numbers every twenty seconds. So the most it can be behind is a minute and twenty seconds.'], ['a', 'Better, thanks.']]]
			}
		]
	},
	// The tracker itself.
	{
		since: OPENED,
		by: ['t', 's', 'f', 'm'],
		subjects: ['Can’t log in to the tracker', 'Tracker keeps logging me out', 'Tracker on my phone', 'Forgot my tracker password'],
		open: [
			'I can’t log in to the tracker from my phone. It says my password is wrong, and I’m fairly sure it isn’t, because my laptop is still logged in. Writing this from the laptop, obviously.',
			'The tracker logs me out every time I close the browser, and I have to dig my password out every time. Is there a “remember me” somewhere that I’m missing?',
			'Forgot my password for the tracker, and the reset email never arrives. Asking here while I’m still logged in on the laptop.'
		],
		ask: ['Which browser, and what does it say exactly? And do you get any email from the tracker at all, like notifications when someone comments?', 'Sure. What does it say when it fails, and do you get the tracker’s notification emails?'],
		paths: [
			{
				detail: 'The one that came with the phone. It says the username or password is wrong.',
				look: 'Your account is fine, but the phone has been filling in your old password from before I made everyone change them. The browser’s saved password wins every time, so you never get to type the new one.',
				ends: [[['n', 'Deleted the saved one on your phone with you over breakfast, and you’re in.'], ['a', 'Ha, thanks. I’d never have found that.']]]
			},
			{
				detail: 'I get notifications, so email works. Just not the reset one.',
				look: 'The tracker can’t send email from the Pi at all. Notifications reach you because I forward them from my own account with a rule, and reset emails go nowhere. I’ve reset your password by hand and sent it to you on the group chat; change it when you log in.',
				ends: [[['a', 'In, and changed it. Thanks.'], ['n', 'I’d like the resets to work properly, but sending email from the Pi means setting up a mail account for it. Leaving this open for that.']]]
			},
			{
				look: 'There’s a “Remember this device” box under the password, but private browsing throws it away when you close the tab. Use a normal tab.',
				ends: [[['a', 'Oh, I use private tabs out of habit. The normal tab remembers me now.']]]
			}
		]
	},
	// A sensor on the balcony door.
	{
		since: WEATHER,
		by: ['s', 'f', 'm'],
		subjects: ['Is the balcony door open?', 'Window left open warning', 'Door sensor for the tablet?'],
		open: [
			'Twice this month someone has left the balcony door open all day, and the flat was freezing when I got home. Could the tablet show whether it’s open?',
			'The bathroom window gets left open overnight and the heating runs for nothing. Is there a sensor for that kind of thing?'
		],
		chat: [['o', 'I’d rather we just remembered to close it, honestly.'], ['x', 'The balcony one would be useful in winter.'], ['t', 'A line under the temperature, like “balcony door open”, would fit on the page.']],
		paths: [
			{ look: 'There are small door sensors that run on a battery for a year and join the Wi-Fi. About £15 each. Do we want one for the balcony door?', ends: [[['a', 'Yes please, just that one.'], ['o', 'Fine by me.'], ['n', '~Ordered one, it comes {day}.'], ['n', '~It came, and it’s on the door. Not on the tablet yet; that’s the next job.']]] },
			{ look: 'Possible, but every sensor is another battery to change and another thing on the Wi-Fi. Is it worth it for the odd day?', ends: [[['a', 'Probably not. I’ll put a note on the door instead.'], ['n', 'OK. Leaving it.']]] },
			{ look: 'The inventory says no sticky pads on the window frames, and the sensors stick on. I’ve asked the agent whether two small screws in the frame would be OK.', ends: [[['n', '~No reply from the agent yet.'], ['a', '~Bump. Door was open all day again.'], ['n', 'Chased the agent again.']]] }
		]
	},
	// The Pi's automatic updates.
	{
		since: WEATHER,
		by: ['t', 's', 'f'],
		subjects: ['Pi restarted itself at six this morning', 'Grey dot at breakfast on Sundays', 'Hearth gone for ten minutes every Sunday'],
		open: ['The page was grey at six this morning for about ten minutes, then came back. Same last Sunday, I think.', 'Every Sunday morning the page goes grey for a few minutes around six. Not a problem exactly, but it’s when I look at the weather before my run.'],
		paths: [
			{
				probes: ['disk', 'volts', 'heat', 'router'],
				look: 'The Pi installs its updates on Sunday at six and restarts when an update asks for it. That happens to be exactly when you look:',
				lookPaste: 'apt',
				ends: [[['n', 'Moved the updates to Tuesday at three in the morning, when nobody is looking. The new timer:', 'timer'], ['a', '~Green at six this Sunday. Thanks.']]]
			},
			{
				probes: ['disk', 'volts', 'heat'],
				look: 'That’s the Pi’s automatic updates, which run on Sunday mornings and restart it when they need to:',
				lookPaste: 'apt',
				ends: [[['n', 'I could move them, but I’d rather they happen when someone is around in case something breaks. Can you live with it?'], ['a', 'Sure, it’s ten minutes.'], ['n', 'OK, leaving it as it is.']]]
			}
		]
	},
	// Trains.
	{
		since: WEATHER,
		by: ['t', 's', 'f', 'm'],
		subjects: ['Next train on the tablet?', 'Train times', 'Departures on the tablet'],
		open: ['Would it be possible to show the next trains from the station on the tablet? Half the flat runs for the 8:12 every morning.', 'Feature idea: departures from our station on the tablet. I check them on my phone every single morning while the kettle boils.'],
		chat: [['o', 'Yes! The 8:12 has been cancelled three times this week.'], ['x', 'I drive, but I can see the appeal.'], ['t', 'It would need its own corner of the page; the temperature takes up most of it.']],
		paths: [
			{ look: 'The rail data is free, but you have to register for it, and it needs looking after whenever they change things. I’ll think about it.', ends: [[['a', '~Any thoughts?'], ['n', 'Still thinking. It’s on the list.']]] },
			{ look: 'Honestly, the rail company’s app already does this well. I’d rather spend the time on other things.', ends: [[['a', 'Fair enough.'], ['o', 'Agreed, the app is fine.']]] },
			{ look: 'Tariq, could the page show the station’s departure board in a corner?', ends: [[['t', 'Not easily, but I’ll see what I can do at the weekend.'], ['t', '~It works in a little box at the bottom. Not pretty, but it updates.'], ['a', 'Love it!']]] }
		]
	}
];

// Side matters: a second, small thing raised in an issue and settled there, so that the issue's own matter has to be
// told from it. Speakers as in the topics.
const sides: { since?: number; msgs: Msg[] }[] = [
	{ msgs: [['a', 'Also, the tablet’s clock is two minutes fast. Not important, it just bugs me.'], ['t', 'It was set to manual time for some reason. Switched it to automatic, it’s right now.']] },
	{ msgs: [['o', 'While you’re in there: the light switch in the cupboard sparks a bit when you flick it.'], ['n', 'Told the agent, they’re sending someone with the other jobs. Don’t use it till then, there’s a torch on the shelf.']] },
	{ msgs: [['x', 'Unrelated: can I put my own little Pi in the cupboard too? It blocks adverts for the whole Wi-Fi.'], ['n', 'Sure, there’s a spare socket on the [[left|right, behind the boiler pipe]]. Give it a fixed address in the router, though, or we’ll be back here in a month.'], ['x', 'Will do, thanks.']] },
	{ msgs: [['a', 'Also, is the tracker meant to email me every time anyone comments on anything? My inbox is all Hearth.'], ['n', 'Settings, Notifications, and set it to only the issues you’re in. Or I can turn it off for you.'], ['a', 'Found it, thanks.']] },
	{ msgs: [['o', 'Side question: what’s the guest Wi-Fi password again? My sister is coming on Friday.'], ['n', 'It’s on the card on the fridge, the one with the cactus on it.']] },
	{ msgs: [['x', 'Somewhat related: the router’s lights flash orange every night at about two.'], ['n', 'That’s the broadband company’s automatic update. Harmless, it’s back to white in five minutes.']] },
	{ msgs: [['a', 'And can someone change the tablet’s wallpaper? It’s still the photo of a lake from whoever owned it before.'], ['t', 'Ha, changed it to plain grey. You only see it for a second anyway.']] },
	{ msgs: [['o', 'While I remember: the extension lead in the cupboard is warm to the touch.'], ['n', 'It’s rated for far more than what’s on it, but I’ve moved the Pi’s plug to the wall socket anyway, to be safe.']] },
	{ msgs: [['n', 'Side note for whoever is next to the router: please don’t unplug the grey box beside it.'], ['o', 'Ah, that’s what that is. I unplugged it last week to charge my phone. Sorry.']] },
	{ msgs: [['a', 'Is there a way to see Hearth from my phone when I’m out?'], ['n', 'Not from outside the flat, and I’d rather not open the Pi up to the internet. [[It’s a hallway cupboard, not a server room.|It isn’t built for that.|Too much can go wrong.]]'], ['a', 'Fair.']] },
	{ msgs: [['x', 'Also, the page says Ashford in the corner. Do we actually live in Ashford?'], ['t', 'Near enough. It’s the place the weather is for.']] },
	{ msgs: [['o', 'Anyone else getting the tablet’s update notification? It has been nagging for a week.'], ['t', 'Ignore it, please. I’m holding that update back until I’ve checked it doesn’t reset the kiosk settings.']] },
	{ msgs: [['a', 'The tracker was really slow to load just now.'], ['n', 'The Pi was taking the tracker’s nightly backup. It’s quicker after half past.']] },
	{ msgs: [['n', 'Unrelated: the Pi will be off for ten minutes on {day} evening while I update it. Don’t panic about the grey dot.'], ['o', 'Noted.']] },
	{ msgs: [['x', 'Can I add my desk lamp to Hearth? It’s just a normal lamp.'], ['n', 'Only if it’s a smart one, sorry. A plain lamp has nothing to read.'], ['x', 'Thought so.']] },
	{ msgs: [['o', 'By the way, the stand on the windowsill is mine; I’ll need it back at some point.'], ['t', 'Noted, it goes back to you as soon as the tablet is on the wall again.']] },
	{ msgs: [['a', 'Also, who changed the Wi-Fi name? My laptop forgot it.'], ['n', 'The broadband company, with their update. Same password.'], ['a', 'Got it, reconnected.']] },
	{ msgs: [['o', 'Is the cupboard meant to be this warm?'], ['n', 'Boiler. It’s fine; the Pi is the only thing in there that minds, and it’s been coping.']] },
	{ msgs: [['x', 'Somebody’s phone keeps connecting to the TV box and playing adverts on it. Whose?'], ['o', 'Mine, sorry, it’s a game. Turned off casting in it.']] },
	{ since: STRIP, msgs: [['a', 'PS: the kitchen strip flickers a bit at low brightness.'], ['n', 'That’s the strip itself below about 20%. Not much to do except keep it above that.']] },
	{ msgs: [['o', 'Also, the tablet’s volume is up full and it beeps at every notification.'], ['t', 'Muted it. It shouldn’t be getting notifications at all, I’ve turned those off too.']] },
	{ msgs: [['x', 'Has the Pi got a name? My laptop keeps calling it raspberrypi.'], ['n', 'hearth-pi. Your laptop remembers the old name; forget the network and join it again.'], ['x', 'That did it.']] },
	{ msgs: [['a', 'Unrelated, but can I have an account on the tracker for my sister while she stays? She keeps asking me to report things.'], ['n', 'She can just tell you, honestly. Two weeks isn’t worth an account.'], ['a', 'Ha, fine.']] },
	{ since: PURIFIER, msgs: [['o', 'Small thing: the purifier’s filter light is on.'], ['s', 'I know, a new filter is on its way. It’s fine for another week or so.']] },
	{ msgs: [['o', 'Random question: does the Pi need turning off and on now and then?'], ['n', 'No, it’s happiest left alone. If it needs a restart it does it itself.']] },
	{ msgs: [['a', 'PS: the tablet’s case has a crack in the corner now.'], ['t', 'I saw. It’s only the case, the screen is fine. I’ll get a new one if it gets worse.']] },
	{ msgs: [['x', 'Also, what’s the little box with the blinking light next to the Pi?'], ['n', 'That’s the drive the Pi keeps its backups on. Blinking is normal.']] },
	{ msgs: [['o', 'Totally unrelated, but the Wi-Fi in my room was slow last night.'], ['n', 'Someone’s laptop was backing up photos, I think. It was fine again by eleven.']] },
	{ msgs: [['a', 'Can we get a second tablet for the living room?'], ['t', 'We could, the page works on anything. There’s no spare tablet, though.'], ['a', 'Never mind then.']] },
	{ msgs: [['x', 'The cupboard door doesn’t close properly because of the cables.'], ['n', 'Tidied them with a couple of clips. It closes now, just.']] },
	{ msgs: [['o', 'By the way, the tablet showed a “storage almost full” message this morning.'], ['t', 'Cleared the browser’s cache. It had over a year of it.']] },
	{ msgs: [['x', 'The guest Wi-Fi password is on a sticky note on the fridge, which seems bad.'], ['n', 'It’s only the guest one, so it’s fine. The main one isn’t written anywhere.']] },
	{ msgs: [['a', 'Unrelated: is the router meant to be this hot?'], ['n', 'It runs warm. It’s fine as long as nothing is stacked on top of it, so I’ve moved the post off it.']] },
	{ msgs: [['o', 'The tracker shows all the times an hour off for me.'], ['n', 'Your profile was set to UTC. Settings, Profile, Time zone: set it to London.'], ['o', 'Fixed, thanks.']] },
	{ msgs: [['x', 'Could the tracker have a dark mode?'], ['n', 'It already has one: Settings, Appearance.'], ['x', 'Oh, nice.']] },
	{ msgs: [['a', 'While I think of it: the tablet’s bracket is wobbly.'], ['t', 'Tightened the screw.']] },
	{ msgs: [['o', 'Shall we put the tracker’s address on the fridge card too?'], ['n', 'Good idea, done.']] },
	{ msgs: [['a', 'Small thing: the writing on the page is tiny since the last change.'], ['t', 'Made it bigger again. Shout if it’s too big now.']] },
	{ msgs: [['x', 'Did someone move the router? It’s on the floor now.'], ['o', 'Me, the shelf was full of post. I’ll put it back.'], ['n', 'Please do, it reaches the cupboard better from up there.']] }
];
const tangents: [string, string][] = [
	['Unrelated, but whose turn is it to buy loo roll?', 'Mine, sorry, getting some today.'],
	['Unrelated: the boiler pressure is down to 0.7 again.', 'Topped it up to 1.3.'],
	['Has anyone seen the big saucepan?', 'Balcony. Don’t ask.'],
	['Also, the hall bulb has gone.', 'There are spares above the fridge.'],
	['The gas safety check is {day} morning, can someone be in?', 'I’m working from home, I’ll let them in.'],
	['Parcel for {other2} on the stairs, by the way.', 'Thanks, got it.'],
	['Off topic: the rent goes up next month, the agent emailed.', 'Saw it. Grim.'],
	['Is anyone using the airer? I want to dry my sheets.', 'Go ahead.'],
	['The smoke alarm in the hall chirped twice last night.', 'Battery. I’ll change it tonight.'],
	['Can we do a flat meeting this week?', '{day} evening works for me.'],
	['Reminder that the window cleaner comes {day}.', 'Noted.'],
	['Who left the balcony door open all night?', 'Me, sorry.'],
	['Milk’s off, if anyone was wondering.', 'Binned it.'],
	['Downstairs asked us to keep the noise down after eleven.', 'Fair, that was probably my film.'],
	['Side note: the hot tap in the bathroom is dripping again.', 'I’ll tell the agent with the other things.']
];
const plusOnes = ['Same here.', 'I noticed that too.', 'Saw the same yesterday.', 'Same this morning.', 'Can confirm.', '+1', 'Yes, I saw this as well, meant to say something.'];
const lookIntros = ['', '', '', 'Had a look this evening.', 'Looked into it.', 'Had a proper look.', 'Checked from my laptop.', 'Sorry, only just got to this.', 'Right, I think I have it.', 'Got home and had a look.'];
/** Checks that rule a cause out, said before the cause is found. */
const probes: Record<string, { by?: Who; text: string[]; paste: string }> = {
	up: {
		text: [
			'The Pi itself is up, and [[not struggling|not busy|fine]]. [[Hardly any load and plenty of memory|The load is next to nothing and most of the memory is free|Nothing is hogging it]], so it isn’t the Pi [[falling over|running out of anything|that’s the problem]].',
			'Nothing wrong with the Pi itself[[| as far as I can see| that I can find]]: it has been up for a while and it’s barely doing anything.',
			'[[Checked the Pi.|Logged into the Pi.|The Pi first.]] It’s up, it hasn’t restarted lately, and [[nothing odd about the load or the memory|the load and the memory look normal|it isn’t short of anything]].',
			'The Pi is fine in itself: up for a while, not busy, lots of free memory. [[So not that.|So it isn’t the Pi.|One thing ruled out.]]'
		],
		paste: 'uptime'
	},
	running: {
		text: ['[[Hearth itself is running|Hearth is up|The Hearth service is running]] and hasn’t restarted since the Pi last booted, so it isn’t [[crashing|falling over|dying and coming back]].', 'Hearth’s service is up and steady: no restarts since the last boot, nothing in its status that worries me.'],
		paste: 'status:running'
	},
	disk: {
		text: ['[[Plenty of room on the card|The card is less than half full|Lots of free space]], so it isn’t the card filling up[[ again| this time|]].', 'Not the card filling up this time: there’s lots of space, and the logs are as small as they should be.'],
		paste: 'dfok'
	},
	net: {
		text: ['The Pi can reach the router [[without any trouble|fine|perfectly well]], [[no lost replies and quick answers|every reply back within a few milliseconds|nothing lost]], so the network from the cupboard [[is fine|isn’t the problem|is OK]].', 'The network from the cupboard looks fine [[tonight|today|at the moment]]: every ping answered, and quickly.'],
		paste: 'pingrouter'
	},
	sky: {
		text: ['[[Skycast’s status page says everything is working|Skycast say all is well on their status page|Skycast is fine according to its status page]], and there’s nothing on their incidents list either.', 'Nothing on Skycast’s status page, all green, and the Ashford station reported a few minutes ago.'],
		paste: 'skyok'
	},
	tablet: {
		by: 't',
		text: ['[[The tablet end looks fine|Nothing wrong on the tablet|The tablet is fine]]: the browser has been up for days, it reloads the page on the hour, and the battery is [[full|nearly full|fine]].', 'Checked the tablet. The kiosk browser is running, reloaded the page a little while ago, and it’s on the charger.'],
		paste: 'kiosk'
	},
	heat: {
		text: ['It isn’t overheating either; I watched the temperature for [[five minutes|a few minutes|a while]] and it stayed well clear of [[where the Pi starts slowing down|the point where it throttles|anything worrying]].', 'The temperature in the cupboard is fine today, nowhere near the point where the Pi slows itself down.'],
		paste: 'measuretemp'
	},
	volts: {
		text: ['No power warnings since the last boot, so [[the power supply isn’t the problem this time|it isn’t the power supply|we can forget the power supply]].', 'The power supply is behaving: not a single undervoltage warning, and the voltage is where it should be.'],
		paste: 'throttledok'
	},
	boots: {
		text: ['The Pi hasn’t restarted [[unexpectedly|by itself|without me]]; the list of boots is boring, which is what we want.', 'No surprise reboots this week, the only restarts are the ones I did.'],
		paste: 'boots:calm'
	},
	router: {
		text: ['The router is [[happy too|fine as well|not the problem either]]: up for weeks, broadband connected, nothing interesting in its log.', 'Nothing wrong with the router as far as I can see. It hasn’t restarted, and every device is where it should be.'],
		paste: 'router'
	},
	readings: {
		text: ['Hearth is writing a reading every minute, as it should, and the numbers look [[sensible|normal|right]].', 'Hearth’s own log looks normal: one reading a minute, nothing missing, nothing strange in the numbers.'],
		paste: 'states'
	}
};

// Pasted output.
const seasonal = [5, 6, 8, 11, 14, 17, 19, 19, 16, 12, 8, 6];
const tempAt = (r: Rand, m: number) => Math.round((seasonal[at(m).getUTCMonth()]! + (r() - 0.5) * 6) * 10) / 10;
const pid = (r: Rand) => int(r, 420, 2900);

const states = (r: Rand, t: number, temp: number, frozen: boolean) => {
	const count = int(r, 12, 22);
	const light = t >= LUMEN ? pick(r, ['on', 'off']) : undefined;
	const process = pid(r);
	const lines = [`$ journalctl -u hearth -n ${count} -o short`];
	let m = t - count - int(r, 0, 2);
	let s = int(r, 0, 50);
	let value = temp;
	for (let i = 0; i < count; i++) {
		if (!frozen && chance(r, 0.2)) value = Math.round((value + (chance(r, 0.5) ? 0.1 : -0.1) * int(r, 1, 3)) * 10) / 10;
		const body = light === undefined ? `{"weather.temperature": ${one(value)}}` : `{"weather.temperature": ${one(value)}, "lumen.kitchen": "${light}"}`;
		lines.push(`${jstamp(m, s)} hearth-pi python[${process}]: ${body}`);
		m += 1;
		if (chance(r, 0.3)) s += 1;
		if (s > 59) {
			s -= 60;
			m += 1;
		}
	}
	return lines.join('\n');
};

const crash = (r: Rand, t: number, kind: string) => {
	const since = t - int(r, 40, 120);
	const error = kind === 'route' ? '<urlopen error [Errno 113] No route to host>' : '<urlopen error timed out>';
	const lines = [`$ journalctl -u hearth --since "${clock(since)}" | grep -E "Error|restart counter"`];
	let process = int(r, 1200, 9000);
	let counter = int(r, 300, 1900);
	let m = since;
	let s = int(r, 0, 20);
	const step = (seconds: number) => {
		s += seconds;
		while (s > 59) {
			s -= 60;
			m += 1;
		}
	};
	for (let i = int(r, 8, 13); i > 0; i--) {
		lines.push(`${jstamp(m, s)} hearth-pi python[${process}]: urllib.error.URLError: ${error}`);
		step(10);
		lines.push(`${jstamp(m, s)} hearth-pi systemd[1]: hearth.service: Scheduled restart job, restart counter is at ${counter}.`);
		counter += 1;
		process += int(r, 5, 9);
		step(kind === 'route' ? int(r, 3, 4) : int(r, 10, 11));
	}
	return lines.join('\n');
};

const df = (r: Rand, kind: string) => {
	const size = pick(r, [15, 29]);
	const used = kind === 'ok' ? Math.round(size * (0.3 + r() * 0.2)) : size;
	const journal = kind === 'journal' ? one(size * (0.35 + r() * 0.2)) : one(0.1 + r() * 0.1);
	const dumps = kind === 'dumps' ? one(size * (0.4 + r() * 0.2)) : one(0.2 + r() * 0.4);
	return [
		'$ df -h /',
		'Filesystem      Size  Used Avail Use% Mounted on',
		`/dev/root        ${size}G   ${String(used).padStart(2)}G  ${String(size - used).padStart(3)}G ${String(Math.round((used / size) * 100)).padStart(3)}% /`,
		'$ sudo du -xsh /var/log/journal /home/git/gitea/dumps /var/cache/apt /home/nell 2>/dev/null',
		`${journal}G\t/var/log/journal`,
		`${dumps}G\t/home/git/gitea/dumps`,
		`${int(r, 120, 480)}M\t/var/cache/apt`,
		`${one(0.6 + r() * 1.4)}G\t/home/nell`
	].join('\n');
};

const skystatus = (r: Rand, t: number) => {
	const since = t - int(r, 6, 30) * 60;
	return [
		`Skycast service status, ${shortDay(t)} ${clock(t)}`,
		'',
		'Current conditions: Degraded',
		`  Ashford (station AFD-${int(r, 1, 4)}): no new observations since ${iso(since)} ${clock(since)} UTC.`,
		'    The last observation is repeated until the station reports again.',
		`  ${int(r, 2, 6)} other stations in the south-east: Operational`,
		'Forecasts: Operational',
		'Account pages: Operational'
	].join('\n');
};

const compare = (r: Rand, t: number, kind: string) => {
	const other = kind === 'car' ? 'Car' : 'Back door';
	const lines = [`| When | Tablet | ${other} |`, '| --- | --- | --- |'];
	const count = int(r, 7, 10);
	const times: number[] = [];
	for (let d = 4; d >= 1; d--) {
		times.push(startOfDay(t) - d * 1440 + int(r, 390, 510));
		times.push(startOfDay(t) - d * 1440 + int(r, 780, 1080));
		if (chance(r, 0.4)) times.push(startOfDay(t) - d * 1440 + int(r, 1110, 1290));
	}
	for (const when of times.slice(-count)) {
		const morning = minuteOfDay(when) < 600;
		const real = tempAt(r, when) - (morning ? 3 : 0);
		let tablet = real + (r() - 0.5) * 0.6;
		let theirs = real;
		if (kind === 'wrong') tablet = real + 1.8 + r() * 2;
		if (kind === 'morning') tablet = real + (morning ? 2 + r() * 1.5 : (r() - 0.5) * 0.6);
		if (kind === 'car') theirs = real + (morning ? (r() - 0.5) * 1.5 : 2.5 + r() * 3);
		lines.push(`| ${shortDay(when)}, ${clock(when)} | ${one(tablet)} °C | ${kind === 'car' ? one(theirs) : Math.round(theirs)} °C |`);
	}
	return lines.join('\n');
};

const lumenlog = (r: Rand, t: number, kind: string, phones: string[]) => {
	const lines = ['Lumen app, Kitchen strip, History', '', '| When | What | By |', '| --- | --- | --- |'];
	for (let d = 6; d >= 1; d--) {
		const base = startOfDay(t) - d * 1440;
		const events: [number, string, string][] = [
			[base + int(r, 1080, 1170), `On, ${int(r, 5, 10) * 10} %`, `${pick(r, phones)}’s phone`],
			[base + int(r, 1320, 1420), 'Off', `${pick(r, phones)}’s phone`]
		];
		if (kind === 'schedule' && at(base).getUTCDay() % 6 !== 0) events.push([base + 390, 'On, 100 %', 'Schedule “Wake up”']);
		if (kind === 'power' && chance(r, 0.5)) events.push([base + int(r, 60, 240), 'On, 100 %', 'Power restored']);
		if (kind === 'phone' && chance(r, 0.5)) events.push([base + int(r, 120, 240), 'On, 80 %', 'Mei’s phone (arrive home)']);
		if (chance(r, 0.4)) events.push([base + int(r, 420, 540), 'Off', `${pick(r, phones)}’s phone`]);
		for (const [when, what, by] of events.sort((a, b) => a[0] - b[0])) lines.push(`| ${weekday(when).slice(0, 3)} ${clock(when)} | ${what} | ${by} |`);
	}
	return lines.join('\n');
};

const boots = (r: Rand, t: number, kind: string, boot: number) => {
	const lines = ['$ journalctl --list-boots | tail -n 6', 'IDX BOOT ID                          FIRST ENTRY                 LAST ENTRY'];
	if (kind === 'calm') {
		const starts = [boot];
		for (let i = 0; i < 5; i++) starts.unshift(starts[0]! - int(r, 5, 30) * 1440 - int(r, 0, 900));
		starts.forEach((start, i) => {
			const end = i === 5 ? t : starts[i + 1]! - int(r, 1, 3);
			lines.push(`${String(i - 5).padStart(3)} ${hex(r, 32)} ${weekday(start).slice(0, 3)} ${iso(start)} ${clock(start)}:${pad(int(r, 0, 59))} ${zone(start)} ${weekday(end).slice(0, 3)} ${iso(end)} ${clock(end)}:${pad(int(r, 0, 59))} ${zone(end)}`);
		});
		return lines.join('\n');
	}
	let start = t - int(r, 5, 8) * 1440 - int(r, 200, 900);
	for (let i = 0; i < 6; i++) {
		const end = i === 5 ? t : start + int(r, 400, 2400);
		const first = `${weekday(start).slice(0, 3)} ${iso(start)} ${clock(start)}:${pad(int(r, 0, 59))} ${zone(start)}`;
		const last = `${weekday(end).slice(0, 3)} ${iso(end)} ${clock(end)}:${pad(int(r, 0, 59))} ${zone(end)}`;
		lines.push(`${String(i - 5).padStart(3)} ${hex(r, 32)} ${first} ${last}`);
		start = end + (kind === 'power' ? int(r, 1, 25) : int(r, 1, 2));
	}
	return lines.join('\n');
};

const leases = (r: Rand, t: number, kind: string) => {
	const rows: [string, string][] = [
		['hearth-pi', '20'],
		['kitchen-tablet', '23'],
		['Nell-Pixel', String(int(r, 100, 120))],
		['Tariqs-iPhone', String(int(r, 121, 140))],
		['Sofie-Galaxy', String(int(r, 141, 160))],
		[fourthAt(t) === 'callum' ? 'CALLUM-PC' : 'Jonahs-iPhone', String(int(r, 161, 180))],
		['printer-hall', '45'],
		['tv-box', '48']
	];
	if (t >= STRIP) rows.push([`LUMEN-${hex(r, 4).toUpperCase()}`, kind === 'strip' ? String(int(r, 50, 99)) : '31']);
	if (t >= PURIFIER) rows.push([`Aerona-${hex(r, 4).toUpperCase()}`, String(int(r, 181, 199))]);
	if (chance(r, 0.5)) rows.push(['Meis-Pixel', String(int(r, 200, 220))]);
	if (kind === 'swap') for (const row of rows) row[1] = String(int(r, 2, 254));
	const all = kind === 'fixed';
	const lines = ['| Device | IP address | MAC address | Connection | Address |', '| --- | --- | --- | --- | --- |'];
	for (const [name, last] of rows) {
		const reserved = all || (kind !== 'swap' && ['hearth-pi', 'kitchen-tablet', 'printer-hall', 'tv-box'].includes(name));
		const mac = `${name === 'hearth-pi' ? 'dc:a6:32' : `${hex(r, 2)}:${hex(r, 2)}:${hex(r, 2)}`}:${hex(r, 2)}:${hex(r, 2)}:${hex(r, 2)}`;
		const link = name === 'hearth-pi' && chance(r, 0.3) ? 'Ethernet' : name.startsWith('LUMEN') ? 'Wi-Fi 2.4 GHz' : pick(r, ['Wi-Fi 5 GHz', 'Wi-Fi 2.4 GHz']);
		lines.push(`| ${name} | 192.168.1.${last} | ${mac} | ${link} | ${reserved ? 'Reserved' : `Lease, ${int(r, 1, 23)} h left`} |`);
	}
	return lines.join('\n');
};

const ping = (r: Rand, host: string, kind: string) => {
	const lines = [`$ ping -c 20 ${host}`, `PING ${host} (${host}) 56(84) bytes of data.`];
	let errors = 0;
	const times: number[] = [];
	for (let i = 1; i <= 20; i++) {
		if (kind === 'microwave' ? i > 10 && chance(r, 0.6) : chance(r, 0.2)) {
			if (chance(r, 0.5)) {
				lines.push(`From 192.168.1.20 icmp_seq=${i} Destination Host Unreachable`);
				errors++;
			}
			continue;
		}
		const time = i > 10 && kind === 'microwave' ? 40 + r() * 400 : 2 + r() * 9;
		times.push(time);
		lines.push(`64 bytes from ${host}: icmp_seq=${i} ttl=255 time=${time.toFixed(time < 10 ? 2 : 1)} ms`);
	}
	const min = Math.min(...times);
	const max = Math.max(...times);
	const avg = times.reduce((a, b) => a + b, 0) / times.length;
	lines.push('', `--- ${host} ping statistics ---`);
	lines.push(`20 packets transmitted, ${times.length} received,${errors ? ` +${errors} errors,` : ''} ${Math.round(((20 - times.length) / 20) * 100)}% packet loss, time ${int(r, 19010, 19090)}ms`);
	lines.push(`rtt min/avg/max/mdev = ${min.toFixed(3)}/${avg.toFixed(3)}/${max.toFixed(3)}/${((max - min) / 3).toFixed(3)} ms`);
	return lines.join('\n');
};

const battery = (r: Rand) =>
	['Settings > Battery > Battery health', '', '  Health: Poor, replacement recommended', `  Capacity: ${int(r, 52, 68)} % of design capacity`, `  Charge cycles: ${thousands(int(r, 900, 1600))}`, `  Temperature: ${one(36 + r() * 6)} °C`, '  Status: Charging slowly', `  Last full charge: ${int(r, 4, 19)} days ago`].join('\n');

const throttled = (r: Rand, t: number) => {
	const lines = ['$ vcgencmd get_throttled', `throttled=0x${pick(r, ['50005', '50000', '50005', '20002'])}`, '$ journalctl -k -b -1 | grep -i voltage'];
	let m = t - 1440 + int(r, 0, 600);
	for (let i = int(r, 5, 9); i > 0; i--) {
		const s = int(r, 0, 50);
		lines.push(`${jstamp(m, s)} hearth-pi kernel: hwmon hwmon1: Undervoltage detected!`);
		if (chance(r, 0.7)) lines.push(`${jstamp(m, s + int(r, 2, 9))} hearth-pi kernel: hwmon hwmon1: Voltage normalised`);
		m += int(r, 20, 140);
	}
	return lines.join('\n');
};

const temps = (r: Rand, t: number) => {
	const lines = ['| Time | Pi °C | Cupboard °C | Boiler |', '| --- | --- | --- | --- |'];
	let m = startOfDay(t) - 1440 + 17 * 60;
	let pi = 52 + r() * 4;
	// The boiler runs from the third reading to the eighth, and the Pi passes 80 °C before it stops.
	for (let i = 0; i < int(r, 9, 12); i++) {
		const on = i >= 2 && i <= 7;
		pi = Math.min(86, Math.max(48, pi + (on ? 5 + r() * 2.5 : -(3 + r() * 5))));
		lines.push(`| ${clock(m)} | ${one(pi)} | ${one(pi - 24 - r() * 4)} | ${on ? 'on' : 'off'} |`);
		m += 30;
	}
	return lines.join('\n');
};

const dmesg = (r: Rand) => {
	let s = int(r, 40000, 900000) * 1e6;
	const stamp = () => {
		s += int(r, 900, 400000);
		return `[${String(Math.floor(s / 1e6)).padStart(6)}.${String(s % 1e6).padStart(6, '0')}]`;
	};
	const sector = int(r, 400000, 9000000);
	const lines = ['$ dmesg | grep -iE "mmc|ext4|i/o error" | tail -n 9'];
	lines.push(`${stamp()} mmc0: timeout waiting for hardware interrupt.`, `${stamp()} mmcblk0: recovery failed!`);
	lines.push(`${stamp()} I/O error, dev mmcblk0, sector ${sector} op 0x1:(WRITE) flags 0x800 phys_seg ${int(r, 1, 8)} prio class 2`);
	s += int(r, 0, 2) * 1e6;
	lines.push(`${stamp()} EXT4-fs warning (device mmcblk0p2): ext4_end_bio:343: I/O error 10 writing to inode ${int(r, 130000, 520000)} starting block ${Math.floor(sector / 8)})`);
	lines.push(`${stamp()} Buffer I/O error on device mmcblk0p2, logical block ${Math.floor(sector / 8) - int(r, 1000, 9000)}`);
	s += int(r, 0, 3) * 1e6;
	lines.push(`${stamp()} mmc0: timeout waiting for hardware interrupt.`);
	lines.push(`${stamp()} EXT4-fs error (device mmcblk0p2): ext4_journal_check_start:83: comm ${pick(r, ['python', 'gitea', 'systemd-journal'])}: Detected aborted journal`);
	lines.push(`${stamp()} EXT4-fs (mmcblk0p2): Remounting filesystem read-only`);
	lines.push(`${stamp()} EXT4-fs error (device mmcblk0p2): ext4_find_entry:1683: inode #${int(r, 2000, 99000)}: comm sshd: reading directory lblock 0`);
	return lines.join('\n');
};

/** systemd's way of saying how long ago. */
const ago = (minutes: number) => {
	const days = Math.floor(minutes / 1440);
	if (days >= 7) return `${Math.floor(days / 7)} week${days >= 14 ? 's' : ''}${days % 7 ? ` ${days % 7} day${days % 7 > 1 ? 's' : ''}` : ''} ago`;
	if (days >= 1) return `${days} day${days > 1 ? 's' : ''} ${Math.floor((minutes % 1440) / 60)}h ago`;
	return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}min ago` : `${minutes}min ago`;
};
const status = (r: Rand, t: number, kind: string, boot: number) => {
	const since = kind === 'running' || kind === 'failed' ? boot + int(r, 1, 3) : t - int(r, 1, 9);
	const process = int(r, 400, 900);
	const when = `${weekday(since).slice(0, 3)} ${iso(since)} ${clock(since)}:${pad(int(r, 0, 59))} ${zone(since)}`;
	const failed = kind === 'failed';
	return [
		'$ systemctl status hearth',
		`${failed ? '×' : '●'} hearth.service - Hearth home hub`,
		'     Loaded: loaded (/etc/systemd/system/hearth.service; enabled; preset: enabled)',
		failed ? `     Active: failed (Result: start-limit-hit) since ${when}; ${ago(t - since)}` : `     Active: active (running) since ${when}; ${ago(t - since)}`,
		failed ? `   Duration: ${one(1 + r() * 3)}s` : `   Main PID: ${process} (python)`,
		failed ? `    Process: ${process} ExecStart=/home/nell/hearth/.venv/bin/python -m hearth.app /home/nell/hearth/config.json (code=exited, status=1/FAILURE)` : `      Tasks: ${int(r, 2, 4)} (limit: 3913)`,
		failed ? `   Main PID: ${process} (code=exited, status=1/FAILURE)` : `     Memory: ${one(18 + r() * 9)}M`,
		`        CPU: ${one(1 + r() * 3)}s`
	].join('\n');
};

const timedate = (r: Rand, t: number) => {
	const stale = t - int(r, 40, 160);
	return [
		'$ timedatectl',
		`               Local time: ${weekday(stale).slice(0, 3)} ${iso(stale)} ${clock(stale)}:${pad(int(r, 0, 59))} ${zone(stale)}`,
		`           Universal time: ${weekday(stale).slice(0, 3)} ${iso(stale)} ${clock(stale - (summer(stale) ? 60 : 0))}:${pad(int(r, 0, 59))} UTC`,
		'                 RTC time: n/a',
		`                Time zone: Europe/London (${zone(stale)}, ${summer(stale) ? '+0100' : '+0000'})`,
		'System clock synchronized: no',
		'              NTP service: active',
		'          RTC in local TZ: no'
	].join('\n');
};

const usage = (r: Rand, t: number, kind: string) => {
	const allowance = kind === 'script' || kind === 'fixed' ? 5000 : 1000;
	const lines = [`Skycast, account usage, plan: ${allowance === 5000 ? 'Starter, 5,000' : 'Free, 1,000'} calls a day`, '', '| Day | Calls | Refused |', '| --- | --- | --- |'];
	const days = int(r, 9, 13);
	for (let i = days; i >= 1; i--) {
		const wanted = kind === 'script' ? 1440 + int(r, 3000, 6200) : kind === 'fixed' ? (i > 3 ? 1440 + int(r, 3000, 6200) : 1440) : 1440;
		const limit = kind === 'cut' && i > days / 2 ? 2000 : allowance;
		const day = startOfDay(t) - i * 1440;
		if (day < WEATHER) continue;
		lines.push(`| ${iso(day)} | ${thousands(Math.min(wanted, limit))} | ${thousands(Math.max(0, wanted - limit))} |`);
	}
	return lines.join('\n');
};

const iwLink = (r: Rand) =>
	[
		'$ iw dev wlan0 link',
		`Connected to 9c:53:22:${hex(r, 2)}:${hex(r, 2)}:${hex(r, 2)} (on wlan0)`,
		'\tSSID: Brookside',
		`\tfreq: ${pick(r, [2412, 2437, 2462])}`,
		`\tRX: ${int(r, 9000000, 90000000)} bytes (${int(r, 40000, 200000)} packets)`,
		`\tTX: ${int(r, 900000, 9000000)} bytes (${int(r, 9000, 60000)} packets)`,
		`\tsignal: -${int(r, 78, 88)} dBm`,
		`\trx bitrate: ${pick(r, ['6.5', '13.0', '1.0', '2.0'])} MBit/s`,
		`\ttx bitrate: ${pick(r, ['1.0', '6.5', '5.5'])} MBit/s`,
		'$ ping -c 30 -q 192.168.1.1',
		'PING 192.168.1.1 (192.168.1.1) 56(84) bytes of data.',
		'',
		'--- 192.168.1.1 ping statistics ---',
		`30 packets transmitted, ${int(r, 14, 25)} received, ${int(r, 17, 53)}% packet loss, time ${int(r, 29040, 29400)}ms`,
		`rtt min/avg/max/mdev = ${(2 + r() * 2).toFixed(3)}/${(60 + r() * 200).toFixed(3)}/${(900 + r() * 2400).toFixed(3)}/${(200 + r() * 500).toFixed(3)} ms`
	].join('\n');

const pip = (r: Rand) =>
	[
		'$ python3 --version',
		'Python 3.9.2',
		'$ python3 -m venv .venv && .venv/bin/pip install -e .',
		'Obtaining file:///home/nell/hearth',
		'  Installing build dependencies ... done',
		'  Checking if build backend supports build_editable ... done',
		'  Getting requirements to build editable ... done',
		'  Preparing editable metadata (pyproject.toml) ... done',
		"ERROR: Package 'hearth' requires a different Python: 3.9.2 not in '>=3.11'",
		'$ cat /etc/debian_version',
		pick(r, ['11.11', '11.9', '11.8'])
	].join('\n');

const meter = (r: Rand, kind: string, fourth: string) => {
	const rows: [string, string, string][] = [
		['Pi and its drive (cupboard)', `${one(3.4 + r())} W`, `${(0.08 + r() * 0.03).toFixed(2)} kWh`],
		['Kitchen tablet', `${one(2 + r())} W`, `${(0.05 + r() * 0.02).toFixed(2)} kWh`],
		['Router', `${one(8 + r() * 3)} W`, `${(0.2 + r() * 0.06).toFixed(2)} kWh`],
		['Fridge freezer', `${kind === 'fridge' ? int(r, 160, 240) : int(r, 70, 110)} W when running`, `${kind === 'fridge' ? (2.6 + r() * 1.2).toFixed(1) : (0.7 + r() * 0.3).toFixed(1)} kWh`],
		['Washing machine', 'up to 2,100 W', `${(0.6 + r() * 0.5).toFixed(1)} kWh a wash`],
		['TV and TV box', `${int(r, 60, 95)} W`, `${(0.3 + r() * 0.3).toFixed(1)} kWh`]
	];
	if (kind === 'heater') rows.push([`Oil heater (${fourth}’s room)`, `${thousands(int(r, 13, 20) * 100)} W on high`, `${(6 + r() * 5).toFixed(1)} kWh`]);
	if (kind === 'dryer') rows.push(['Tumble dryer', `${thousands(int(r, 22, 26) * 100)} W`, `${(2.5 + r() * 1.5).toFixed(1)} kWh a load, ${int(r, 4, 7)} loads a week`]);
	return ['| What | Draws | Per day |', '| --- | --- | --- |', ...shuffle(r, rows).map(([a, b, c]) => `| ${a} | ${b} | ${c} |`)].join('\n');
};

const bill = (r: Rand, t: number) => {
	const year = at(t).getUTCFullYear();
	const rows: [string, number, number][] = [
		[`Oct to Dec ${year - 1}`, int(r, 820, 980), 24.5 + r() * 2],
		[`Jan to Mar ${year}`, int(r, 900, 1100), 24.5 + r() * 2],
		[`Apr to Jun ${year}`, int(r, 600, 760), 26 + r() * 2],
		[`Jul to Sep ${year}`, int(r, 640, 900), 26 + r() * 2]
	];
	return ['| Quarter | kWh | Price per kWh | Total |', '| --- | --- | --- | --- |', ...rows.map(([label, kwh, price]) => `| ${label} | ${kwh} | ${price.toFixed(2)}p | £${((kwh * price) / 100 + 45).toFixed(2)} |`)].join('\n');
};

const uptime = (r: Rand, t: number, boot: number) => {
	const days = Math.floor((t - boot) / 1440);
	const rest = (t - boot) % 1440;
	return [`$ uptime`, ` ${clock(t)}:${pad(int(r, 0, 59))} up ${days ? `${days} day${days === 1 ? '' : 's'}, ` : ' '}${String(Math.floor(rest / 60)).padStart(2)}:${pad(rest % 60)},  1 user,  load average: ${(r() * 0.3).toFixed(2)}, ${(r() * 0.3).toFixed(2)}, ${(r() * 0.3).toFixed(2)}`, '$ free -h', '               total        used        free      shared  buff/cache   available', `Mem:           3.7Gi       ${int(r, 380, 720)}Mi       ${one(1.6 + r())}Gi        ${int(r, 8, 40)}Mi       ${one(0.9 + r())}Gi       ${one(2.8 + r() * 0.6)}Gi`, `Swap:          199Mi          0B       199Mi`].join('\n');
};
const pingRouter = (r: Rand) => {
	const times = Array.from({ length: 10 }, () => 1 + r() * 4);
	return ['$ ping -c 10 192.168.1.1', 'PING 192.168.1.1 (192.168.1.1) 56(84) bytes of data.', ...times.map((time, i) => `64 bytes from 192.168.1.1: icmp_seq=${i + 1} ttl=64 time=${time.toFixed(2)} ms`), '', '--- 192.168.1.1 ping statistics ---', `10 packets transmitted, 10 received, 0% packet loss, time ${int(r, 9010, 9030)}ms`, `rtt min/avg/max/mdev = ${Math.min(...times).toFixed(3)}/${(times.reduce((a, b) => a + b, 0) / 10).toFixed(3)}/${Math.max(...times).toFixed(3)}/${(r()).toFixed(3)} ms`].join('\n');
};
const skyok = (r: Rand, t: number) => [`Skycast service status, ${shortDay(t)} ${clock(t)}`, '', 'Current conditions: Operational', `  Ashford (station AFD-${int(r, 1, 4)}): Operational, last observation ${int(r, 2, 14)} minutes ago`, 'Forecasts: Operational', 'Account pages: Operational', `No incidents in the last ${pick(r, ['7', '14', '30'])} days.`].join('\n');
const kiosk = (r: Rand, t: number) => {
	const reload = t - int(r, 5, 55);
	return ['Kiosk browser > Status', '', '  Start page: Hearth page on hearth-pi', `  Running since: ${shortDay(t - int(r, 1, 6) * 1440)}, ${clock(t - int(r, 60, 600))}`, `  Last page reload: ${clock(reload)} (every 60 min)`, '  Screen: on, brightness 60 %', `  Battery: ${int(r, 78, 100)} %, charging`, `  Wi-Fi: Brookside, signal ${pick(r, ['good', 'very good', 'excellent'])}`, `  Free memory: ${int(r, 600, 1400)} MB`].join('\n');
};
const measureTemp = (r: Rand) => {
	const lines = ['$ for i in 1 2 3 4 5; do vcgencmd measure_temp; sleep 60; done'];
	let value = 44 + r() * 8;
	for (let i = 0; i < 5; i++) {
		value += (r() - 0.5) * 1.5;
		lines.push(`temp=${one(value)}'C`);
	}
	return lines.join('\n');
};
const throttledOk = (r: Rand) => ['$ vcgencmd get_throttled', 'throttled=0x0', '$ journalctl -k -b | grep -ci voltage', '0', '$ vcgencmd measure_volts core', `volt=${(0.85 + r() * 0.05).toFixed(4)}V`].join('\n');
const bins = (r: Rand, t: number) => {
	const lines = ['Collections for 14 Brookside Road', '', '| Date | Collection |', '| --- | --- |'];
	let m = startOfDay(t) + 1440;
	while (at(m).getUTCDay() !== 2) m += 1440;
	let general = chance(r, 0.5);
	for (let i = 0; i < int(r, 5, 7); i++) {
		const garden = i % 2 === 1 && summer(m) ? ', garden waste' : '';
		lines.push(`| ${weekday(m)} ${at(m).getUTCDate()} ${MONTHS[at(m).getUTCMonth()]} | ${general ? 'General waste' : 'Recycling and glass'}${garden} |`);
		general = !general;
		m = startOfDay(m) + 7 * 1440;
		while (at(m).getUTCDay() !== 2) m -= 1440;
		if (chance(r, 0.15)) m += 1440;
	}
	return lines.join('\n');
};
const pm25 = (r: Rand, t: number) => {
	const lines = ['Aerona app, Living room, yesterday', '', '| Time | PM2.5 µg/m³ | Fan |', '| --- | --- | --- |'];
	const cook = int(r, 36, 39);
	for (let half = 34; half <= 46; half++) {
		const spike = half >= cook && half <= cook + 2;
		const value = spike ? 35 + r() * 60 : 4 + r() * 8;
		lines.push(`| ${pad(Math.floor(half / 2))}:${half % 2 ? '30' : '00'} | ${one(value)} | ${spike ? int(r, 3, 4) : int(r, 1, 2)} of 4 |`);
	}
	return lines.join('\n');
};
const forecast = (r: Rand, t: number) => {
	const lines = ['Skycast forecast for Ashford', '', '| Time | Temperature | Rain | Wind |', '| --- | --- | --- | --- |'];
	let m = startOfDay(t) + int(r, 6, 8) * 60;
	let value = tempAt(r, m) - 3;
	for (let i = 0; i < 6; i++) {
		value += (r() - 0.3) * 1.2;
		lines.push(`| ${clock(m)} | ${Math.round(value)} °C | ${int(r, 0, 9) * 10} % | ${int(r, 2, 12)} m/s |`);
		m += 60;
	}
	return lines.join('\n');
};
const printer = (r: Rand, t: number) => ['Printer status page', '', `  Status: ${pick(r, ['Ready', 'Ready', 'Sleep'])}`, `  Toner: ${pick(r, ['Black 12 %', 'Black 4 %, replace soon', 'Black 61 %'])}`, '  Tray 1: Plain paper, A4, OK', `  Network: Wi-Fi, 192.168.1.${pick(r, ['45', String(int(r, 60, 99))])}`, `  Pages printed: ${thousands(int(r, 4000, 16000))}`, `  Last job: ${shortDay(t - int(r, 1, 30) * 1440)}`].join('\n');
const speed = (r: Rand, t: number) => {
	const lines = ['| When | Download | Upload | Ping |', '| --- | --- | --- | --- |'];
	for (let i = 0; i < int(r, 5, 7); i++) {
		const after = i >= 3;
		lines.push(`| ${clock(t - (6 - i) * 7)} | ${one(after ? 55 + r() * 15 : 2 + r() * 9)} Mbit/s | ${one(after ? 9 + r() * 3 : 0.5 + r() * 2)} Mbit/s | ${after ? int(r, 12, 20) : int(r, 60, 400)} ms |`);
	}
	return lines.join('\n');
};
const indoor = (r: Rand, t: number) => {
	const lines = ['| Time | Living room | Outside (tablet) |', '| --- | --- | --- |'];
	let m = startOfDay(t) + 7 * 60;
	const outside = tempAt(r, m);
	for (let i = 0; i < int(r, 7, 9); i++) {
		const heating = (i >= 0 && i <= 1) || i >= 6;
		lines.push(`| ${clock(m)} | ${one(16 + (heating ? 3 + r() * 2 : r() * 1.5))} °C | ${one(outside + (r() - 0.3) * 3)} °C |`);
		m += 120;
	}
	return lines.join('\n');
};
const wash = (r: Rand) => {
	const lines = ['| Minute | Watts | What it was doing |', '| --- | --- | --- |'];
	const steps: [number, number, string][] = [[0, 12, 'filling'], [4, 2050, 'heating'], [22, 240, 'washing'], [52, 180, 'rinsing'], [68, 460, 'spinning'], [78, 2, 'finished, door locked'], [80, 0.6, 'finished']];
	for (const [minute, watts, what] of steps) lines.push(`| ${minute + int(r, 0, 3)} | ${watts >= 1000 ? thousands(Math.round(watts + (r() - 0.5) * 100)) : one(watts * (0.9 + r() * 0.2))} | ${what} |`);
	return lines.join('\n');
};
const schedule = (r: Rand, kind: string) =>
	kind === 'motion'
		? ['Kiosk browser > Screen', '', '  Screen off after: 2 minutes without motion', `  Wake on motion: on, camera, sensitivity ${int(r, 4, 7)} of 10`, '  Keep screen on while charging: off', '  Night schedule: none'].join('\n')
		: ['Kiosk browser > Screen', '', '  Daytime brightness: 60 %', '  Night brightness: 5 %', '  Night from 23:00 to 07:00', '  Night theme for the start page: on (dark background)', `  Screen off after: never`].join('\n');

const router = (r: Rand, t: number) => ['Router > Status', '', `  Up for: ${int(r, 6, 80)} days, ${int(r, 0, 23)} hours`, `  Broadband: connected, ${int(r, 62, 74)} Mbit/s down, ${int(r, 14, 19)} Mbit/s up`, `  Wi-Fi: Brookside (2.4 and 5 GHz), Brookside-Guest`, `  Devices connected: ${int(r, 9, 15)}`, `  Last event: ${shortDay(t - int(r, 2, 20) * 1440)}, ${pick(r, ['firmware check, no update', 'DHCP lease renewed for tv-box', 'Wi-Fi channel changed to 6', 'Wi-Fi channel changed to 11'])}`].join('\n');
const apt = (r: Rand, t: number) => {
	const lines = ['$ grep -hE "upgraded:|reboot" /var/log/unattended-upgrades/unattended-upgrades.log | tail -n 6'];
	let m = startOfDay(t) - 14 * 1440;
	while (at(m).getUTCDay() !== 0) m += 1440;
	const packages = ['libssl3 openssl', 'raspi-firmware linux-image-rpi-v8', 'python3.11 python3.11-minimal libpython3.11-stdlib', 'tzdata', 'curl libcurl4', 'openssh-client openssh-server', 'libc6 libc-bin', 'git git-man'];
	for (let week = 0; week < 3 && m <= t; week++) {
		const reboot = week === 2 || chance(r, 0.6);
		lines.push(`${iso(m)} 06:00:${pad(int(r, 10, 59))},${int(r, 100, 999)} INFO Packages that will be upgraded: ${pick(r, packages)}`);
		if (reboot) lines.push(`${iso(m)} 06:0${int(r, 2, 6)}:${pad(int(r, 10, 59))},${int(r, 100, 999)} WARNING Found /var/run/reboot-required, rebooting`);
		m += 7 * 1440;
	}
	return lines.join('\n');
};

interface Ctx {
	r: Rand;
	t: number;
	/** When the Pi last booted, the same for every paste of one issue. */
	boot: number;
	temp: number;
	phones: string[];
	fourth: string;
}
const paste = (spec: string, c: Ctx): string => {
	const parts = spec.split('+').map((part) => {
		const [name, kind = ''] = part.split(':');
		switch (name) {
			case 'states':
				return states(c.r, c.t, c.temp, false);
			case 'frozen':
				return states(c.r, c.t, c.temp, true);
			case 'crash':
				return crash(c.r, c.t, kind);
			case 'df':
				return df(c.r, kind);
			case 'dfok':
				return df(c.r, 'ok');
			case 'skystatus':
				return skystatus(c.r, c.t);
			case 'compare':
				return compare(c.r, c.t, kind);
			case 'lumenlog':
				return lumenlog(c.r, c.t, kind, c.phones);
			case 'boots':
				return boots(c.r, c.t, kind, c.boot);
			case 'leases':
				return leases(c.r, c.t, kind);
			case 'ping':
				return ping(c.r, '192.168.1.31', kind);
			case 'battery':
				return battery(c.r);
			case 'throttled':
				return throttled(c.r, c.t);
			case 'temps':
				return temps(c.r, c.t);
			case 'dmesg':
				return dmesg(c.r);
			case 'status':
				return status(c.r, c.t, kind, c.boot);
			case 'timedate':
				return timedate(c.r, c.t);
			case 'usage':
				return usage(c.r, c.t, kind);
			case 'iw':
				return iwLink(c.r);
			case 'pip':
				return pip(c.r);
			case 'meter':
				return meter(c.r, kind, c.fourth);
			case 'bill':
				return bill(c.r, c.t);
			case 'uptime':
				return uptime(c.r, c.t, c.boot);
			case 'pingrouter':
				return pingRouter(c.r);
			case 'skyok':
				return skyok(c.r, c.t);
			case 'kiosk':
				return kiosk(c.r, c.t);
			case 'measuretemp':
				return measureTemp(c.r);
			case 'throttledok':
				return throttledOk(c.r);
			case 'bins':
				return bins(c.r, c.t);
			case 'pm25':
				return pm25(c.r, c.t);
			case 'forecast':
				return forecast(c.r, c.t);
			case 'printer':
				return printer(c.r, c.t);
			case 'speed':
				return speed(c.r, c.t);
			case 'indoor':
				return indoor(c.r, c.t);
			case 'wash':
				return wash(c.r);
			case 'router':
				return router(c.r, c.t);
			case 'timer':
				return ['$ systemctl cat apt-daily-upgrade.timer | grep OnCalendar', 'OnCalendar=Tue *-*-* 03:00', '$ systemctl list-timers apt-daily-upgrade.timer | head -n 2', 'NEXT                        LEFT     LAST                        PASSED  UNIT                    ACTIVATES', `${weekday(c.t + 2 * 1440).slice(0, 3)} ${iso(c.t + 2 * 1440)} 03:00:00 ${zone(c.t)} ${int(c.r, 1, 2)} days ${shortDay(c.t - 5 * 1440)} 06:00:12 ${zone(c.t)} 5 days ago apt-daily-upgrade.timer apt-daily-upgrade.service`].join('\n');
			case 'twins': {
				const a = int(c.r, 600, 1400);
				const stray = c.t - int(c.r, 2, 4) * 1440 - int(c.r, 0, 300);
				const started = (m: number) => `${weekday(m).slice(0, 3)} ${mon(m)} ${at(m).getUTCDate()} ${clock(m)}:${pad(int(c.r, 0, 59))} ${at(m).getUTCFullYear()}`;
				return ['$ ps -eo pid,lstart,args | grep "[h]earth.app"', `  ${a} ${started(c.boot + 1)} /home/nell/hearth/.venv/bin/python -m hearth.app /home/nell/hearth/config.json`, `  ${a + int(c.r, 300, 9000)} ${started(stray)} python -m hearth.app /home/nell/test-config.json`].join('\n');
			}
			case 'flip': {
				const lines = [`$ journalctl -u hearth -n 12 -o short`];
				const low = one(c.temp - 0.8 - c.r() * 0.6);
				for (let i = 0; i < 12; i++) lines.push(`${jstamp(c.t - 12 + i, 7)} hearth-pi python[${pid(c.r)}]: {"weather.temperature": ${i % 2 || chance(c.r, 0.2) ? low : one(c.temp)}${c.t >= LUMEN ? ', "lumen.kitchen": "off"' : ''}}`);
				return lines.join('\n').replace(/python\[\d+\]/g, `python[${pid(c.r)}]`);
			}
			case 'apt':
				return apt(c.r, c.t);
			case 'schedule':
				return schedule(c.r, kind);
			default:
				throw new Error(`unknown paste ${name}`);
		}
	});
	return parts.map((text) => (text.includes('\n| --- ') || text.startsWith('|') ? text : `\`\`\`\n${text}\n\`\`\``)).join('\n\n');
};

// Which topic and path each issue follows: topics are dealt in rounds, each round in a new order, and the paths of a
// topic in turn, so that two issues on one topic end differently until its paths run out.
interface Plan {
	topic: Topic;
	path: Path;
	time: number;
	seed: number;
}
const order = mulberry32(20261120);
const plans: Plan[] = [];
const dealt = new Map<Topic, number>();
while (plans.length < ITEMS) {
	let added = 0;
	for (const topic of shuffle(order, topics.flatMap((topic) => Array<Topic>(topic.weight ?? 1).fill(topic)))) {
		if (plans.length >= ITEMS) break;
		const count = dealt.get(topic) ?? 0;
		if (topic.max !== undefined && count >= topic.max) continue;
		const path = topic.paths[count % topic.paths.length]!;
		dealt.set(topic, count + 1);
		const from = Math.max(OPENED, topic.since ?? OPENED, path.since ?? OPENED);
		const to = Math.min(LAST_OPEN, topic.until ?? LAST_OPEN, path.until ?? LAST_OPEN);
		if (from >= to) continue;
		let day = startOfDay(from + Math.floor(order() * (to - from)));
		for (let tries = 0; topic.winter && at(day).getUTCMonth() % 9 > 2 && tries < 40; tries++) day = startOfDay(from + Math.floor(order() * (to - from)));
		if (topic.after) day = topic.after[(count * 3 + 1) % topic.after.length]! + int(order, 1, 4) * 1440;
		const time = day + int(order, 7 * 60 + 10, 23 * 60 + 10);
		plans.push({ topic, path, time: Math.min(Math.max(time, from), LAST_OPEN), seed: plans.length });
		added++;
	}
	if (added === 0) break;
}
plans.sort((a, b) => a.time - b.time || a.seed - b.seed);

// One issue.
/** Fills {name} from `values` and picks one of each [[a|b|c]]. */
const fill = (r: Rand, text: string, values: Record<string, string>) =>
	text.replace(/\[\[([^\]]*)\]\]/g, (_, options: string) => pick(r, options.split('|'))).replace(/\{(\w+)\}/g, (whole, key: string) => values[key] ?? whole);
const fixed: Partial<Record<Who, Person>> = { n: 'nell', t: 'tariq', s: 'sofie', m: 'mei' };

const issue = (plan: Plan, number: number): string => {
	const r = mulberry32(7919 * (plan.seed + 1) + 104729);
	const { topic, path } = plan;
	const t0 = plan.time;
	const fourth = fourthAt(t0);
	const code = (who: Who): Person | undefined => (who === 'f' ? fourth : fixed[who]);
	const end = pick(r, path.ends);
	// Everyone the path names must be someone other than the author and the two other flatmates.
	const named = new Set<Person>([...end.map(([who]) => code(who)), code(path.lookBy ?? 'n'), code(topic.askBy ?? 'n')].filter((p): p is Person => p !== undefined));
	const choices = topic.by.map((who) => code(who) ?? fourth);
	const author = pick(r, choices.filter((p) => p === 'nell' || !named.has(p)).length ? choices.filter((p) => p === 'nell' || !named.has(p)) : choices);
	const free = flatmatesAt(t0).filter((p) => p !== author && !named.has(p));
	const rest = shuffle(r, free.length ? free : flatmatesAt(t0).filter((p) => p !== author));
	const o = rest[0]!;
	const x = rest[1] ?? (flatmatesAt(t0).find((p) => p !== author && p !== o) as Person);
	const person = (who: Who): Person => (who === 'a' ? author : who === 'o' ? o : who === 'x' ? x : code(who)!);
	const temp = tempAt(r, t0);
	const phones = ['Nell', 'Tariq', 'Sofie', ...(fourth === 'jonah' && t0 < JONAH_ARRIVES + 7 * 1440 ? [] : [display[fourth]])];
	const earlier = startOfDay(t0) + int(r, 360, Math.max(361, minuteOfDay(t0) - 90));
	const values = (m: number): Record<string, string> => ({
		author: display[author],
		other: display[o],
		other2: display[x],
		temp: one(temp),
		temp2: one(Math.round((temp - 2.5 - r() * 3) * 10) / 10),
		clock: clock(earlier),
		day: weekday(m + int(r, 2, 4) * 1440),
		wday: weekday(m - int(r, 1, 3) * 1440)
	});
	const boot = topic.freshBoot ? t0 - int(r, 20, 240) : t0 - int(r, 2, 40) * 1440 - int(r, 0, 1400);
	const ctx = (m: number): Ctx => ({ r, t: m, boot, temp, phones, fourth: display[fourth] });

	const lines: string[] = [];
	let t = t0;
	let quick = false;
	let looked = false;
	const advance = (text: string) => {
		const gap = quick ? int(r, 2, 25) : topic.freshBoot && !looked ? int(r, 5, 90) : /all week|for a week/.test(text) ? int(r, 6 * 1440, 9 * 1440) : text.startsWith('~~') ? int(r, 8 * 1440, 22 * 1440) : text.startsWith('~') ? int(r, 1440, 5 * 1440) : chance(r, 0.7) ? int(r, 12, 300) : int(r, 300, 1100);
		let m = t + gap;
		if (minuteOfDay(m) < 7 * 60) m = startOfDay(m) + int(r, 7 * 60, 8 * 60 + 40);
		if (m > LAST) m = Math.min(LAST, t + int(r, 20, 240));
		t = m > t ? m : t + int(r, 5, 30);
		return text.replace(/^~+/, '');
	};
	const comment = (who: Who, text: string, extra?: string) => {
		const body = advance(text);
		lines.push('---', '', `**${person(who)}** commented on ${stamp(t)}`, '', fill(r, body, values(t)));
		if (extra) lines.push('', paste(extra, ctx(t)));
		lines.push('');
	};
	const speakers = (msgs: Msg[]) => new Set(msgs.map(([who]) => person(who))).size === new Set(msgs.map(([who]) => who)).size;

	const cold = [10, 11, 0, 1, 2].includes(at(t0).getUTCMonth());
	const candidates = path.open ?? topic.open;
	const openings = candidates.filter((text) => cold || !text.startsWith('W|'));
	const opening = pick(r, openings.length ? openings : candidates).replace(/^W\|/, '');
	lines.push(`# ${fill(r, pick(r, topic.subjects), values(t0))}`, '', `**#${number}** opened by **${author}** on ${stamp(t0)}`, '', fill(r, opening, values(t0)));
	if (topic.more && chance(r, 0.6)) lines.push('', fill(r, pick(r, topic.more), values(t0)));
	if (topic.openPaste && (opening.endsWith(':') || chance(r, 0.5))) lines.push('', paste(topic.openPaste, ctx(t0)));
	lines.push('');

	if (author !== 'nell' && chance(r, 0.25)) comment('o', pick(r, plusOnes));
	if (topic.guess && chance(r, 0.5)) comment('o', pick(r, topic.guess));
	if (author !== 'nell' && topic.ask && path.detail && chance(r, 0.85)) {
		comment(topic.askBy ?? 'n', pick(r, topic.ask));
		comment('a', path.detail, path.detailPaste);
	}
	// Side matters are taken in turn from a place that moves with each issue, so that each comes up about as often.
	const turn = (plan.seed * 7) % sides.length;
	const usableSides = [...sides.slice(turn), ...sides.slice(0, turn)].filter((side) => (side.since ?? 0) <= t0 && speakers(side.msgs));
	const early = chance(r, 0.7) ? usableSides.slice(0, chance(r, 0.35) ? 2 : 1) : [];
	const late = chance(r, 0.45) ? usableSides.slice(5, 6) : [];
	for (const side of early) for (const [who, text] of side.msgs) comment(who, text);
	const gossip = (p: number) => {
		if (!chance(r, p)) return;
		const [said, reply] = pick(r, tangents);
		const speaker: Who = pick(r, ['o', 'x', 'a'] as Who[]);
		comment(speaker, said);
		comment(speaker === 'o' ? 'x' : 'o', reply);
	};
	gossip(0.4);
	const chat = topic.chat ? shuffle(r, topic.chat.filter(([who]) => who === 'o' || who === 'x' || ![author, o, x].includes(person(who)))).slice(0, int(r, 1, 2)) : [];
	const chatFirst = chance(r, 0.5);
	if (chatFirst) for (const [who, text] of chat) comment(who, text);
	const checks = shuffle(r, path.probes ?? []).slice(0, int(r, 2, 4));
	checks.forEach((name, i) => {
		const probe = probes[name]!;
		quick = i > 0 && (probe.by ?? 'n') === (probes[checks[i - 1]!]!.by ?? 'n');
		comment(probe.by ?? 'n', pick(r, probe.text), probe.paste);
	});
	quick = checks.length > 0 && (path.lookBy ?? 'n') === (probes[checks.at(-1)!]!.by ?? 'n');
	const lookBy = path.lookBy ?? 'n';
	const intro = lookBy === 'n' && author !== 'nell' && path.probes ? pick(r, lookIntros) : '';
	comment(lookBy, intro && !quick ? `${intro} ${path.look}` : path.look, path.lookPaste);
	quick = false;
	looked = true;
	const tail = end.length > 1 ? int(r, 1, end.length - 1) : 1;
	if (!chatFirst) for (const [who, text] of chat) comment(who, text);
	end.forEach(([who, text, extra], i) => {
		comment(who, text, extra);
		if (i === tail - 1) {
			for (const side of late) for (const [w, said] of side.msgs) comment(w, said);
			gossip(0.15);
		}
	});
	return lines.join('\n').trimEnd() + '\n';
};

const folder = join(root, 'docs', 'issues');
mkdirSync(folder, { recursive: true });
writeFileSync(
	join(folder, 'README.md'),
	'# Hearth issues\n\nThe issues of the tracker that ran in Gitea on hearth-pi from January 2025, exported on 20 November 2026, one file per\nissue, named by its number. The export kept each issue and its comments. Labels, assignees and whether an issue was\nclosed did not come across. Pull requests shared the numbering and were not exported, so some numbers are missing.\n'
);
let number = 0;
for (const plan of plans) {
	number += 1 + (chance(order, 0.3) ? int(order, 1, 3) : 0);
	writeFileSync(join(folder, `${number}.md`), issue(plan, number));
}
