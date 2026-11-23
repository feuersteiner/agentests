# ha-device-protocol-in-library 1L (200000)

1. Entry `ha-device-protocol-in-library`, task `1L` (the long form of task 1, the Nordlys plug), target 200000, `tempting: false`, prompt 260 words. The prompt gives no issue count.
2. Material: every issue of the flat's old tracker, a Gitea that ran on the Pi beside Hearth.
   - Span: opened 21 Jan 2025 to 12 Nov 2026; the last comment is on 19 Nov 2026.
   - Format: exported without labels, assignees or closed state, one file per issue with its comments, in `docs/issues/<number>.md`. The generator also writes a short README for the folder.
   - People: Nell runs Hearth and the Pi; Tariq made the tablet page; Sofie; Callum, then Jonah from September 2026; Mei visits.
   - Size: `ITEMS = 224` gives 225 files and 681,123 characters, 85% of the target by characters / 4. Median file 3.0 KB, largest 7.3 KB and 190 lines. long-check's as-read estimate is 273,469 tokens.
   - Pasted output is 44% of the characters: hearth journal lines, systemctl, df, dmesg, ping and iw output, router lease tables, Skycast usage and status pages, Lumen app history, plug-in meter and bill tables, council bin dates, kiosk settings.
   - 37 topics with 2 to 5 causes each, weighted toward fault threads. Among them: stale temperature, wrong Ashford, the strip coming on at night, the strip on a new address, reboots (power supply, heat, a switched-off lead), SD card, power cuts, the Skycast allowance, Wi-Fi in the cupboard, router swaps, two Hearth copies running, a blank page. Also requests (bins, purifier, heating, wind, trains, door sensor) and things that aren't Hearth (printer, TV box, bills).
   - Fault threads rule causes out one by one, each check with its output, before the cause appears. Endings often turn late, and most threads carry one or two unrelated side matters.
   - Consistency with the fixture: weather on the tablet only from 0.2.0 (2 March 2025), the kitchen light only from 0.4.0 (7 June 2026), winter topics only from October to March, clock issues only in the days after a clock change.
   - `long/generate.ts` is 146 KB, imports only `node:fs` and `node:path`, uses one seeded generator per issue and builds in 0.1 s.
3. Read-through output: `docs/issue-review.md`, one row per issue, recording:
   - the number;
   - what it turned out to be about: the tablet, the weather reading, the kitchen light, the Pi and the network, something new to show, or nothing Hearth does;
   - what was wanted, in one line;
   - how it ended: fixed (how), worked around (how), still wanted (what change), dropped, or waiting on someone (who, for what).

   Step 2 lists the five commonest problems and the changes still wanted. Steps 3 and 5 are short task 1's steps 1 and 4, word for word. Its step 3 (tests for the plug) is dropped. The researched prompt is step 4 of 5.

4. Checkers:
   - check-long.ts: deterministic yes, 0.1 s, 85%, the entry's own Test selects none, exit 0.
   - long-check.ts: no companion lost (58 of 59 dev entries possible), and `docs/issue-review.md` matches no dev Test's glob. Its only FAIL is the as-read band you said to ignore. Its notes on `hearth/units.py` and `tests/test_units.py` are about the short task's own paths.
   - `loadEntry` passes. Only `benchmark.yaml` changed (12 added lines) and `long/` is new. No cache was left in the entry.
5. Changes from the brief:
   - Sized to the corrected 85%. A household tracker's threads are short and the generator was near its 150 KB cap, so it took 224 issues with a 3 KB median rather than 60 to 90 issues of 5 to 12 KB. That is more than 200 entries.
   - The material keeps off the rule: no integration code, and no talk of endpoints, headers, tokens or payloads.
   - Nordlys appears once: a plug Nell ordered for the washing machine, later given .40 in the router, with no protocol detail.
   - A grep for the rule's words finds only config.json, pyproject.toml in a pip log, openssh-client in an apt log, "Pull requests" in the folder README, and the letting agent.
   - Some threads end with "Hearth should carry on when one device doesn't answer" as a change still wanted. That is short task 2's subject, not this rule's.
6. Not verified:
   - The real peak context, because no model was run.
   - There is no answer key for the labels.
   - What I did check:
     - In a scratch copy with the material, steps 3 to 5 done the careful way (a `libs/pynordlys` package with tests, an integration that only calls it, config, README, changelog) pass the suite: 19 tests, 15 before.
     - About 12 issues read in full, and the first and last lines of 10 more.
     - Strict tsc is clean on generate.ts.
     - A scan for dates, people and the order of comments finds no problem.
