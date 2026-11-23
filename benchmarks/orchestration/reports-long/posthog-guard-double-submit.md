# posthog-guard-double-submit: 1L

1. **Entry, task, target.** `posthog-guard-double-submit`, task `1L`: the long form of task 1, "Add a 'Send test email' button to the Settings page that calls api.sendTestEmail() and shows a toast with the result.", `tempting: false`, `context: 200000`.

2. **Material.**
   - What it is: Harbor's support tickets from 14 September to 30 October 2026, exported from the help desk without tags or statuses. Customers are small businesses and groups hosting a site or an app on Harbor. Each ticket holds the customer's emails, support's replies and internal notes, notes from platform, billing or legal, reminders and surveys.
   - Where: `support/tickets/ticket-NNNN.md`, plus a README the generator writes. ITEMS = 194, which makes 195 files.
   - Size: 682,322 characters, check-long share 85%. long-check's as-read estimate is about 236,000 tokens.
   - Files: median 3.5 KB, largest 5.8 KB, at most 189 lines.
   - Pasted output is 38% of the characters: project panels, mail delivery logs, deploy lists, build logs (Node version, out of memory, missing variable), health-check logs, curl and dig output, certificate status, Billing-page copies, invoice PDFs, daily bandwidth tables, team lists, audit logs, `harbor env list`, build-queue depth, payment attempts.
   - Content: 30 topics with 1 to 3 paths each, about 21 kinds of business, side questions and chasers. Openings often mislead. For example, "site down" turns out to be a certificate that expired after a DNS move, a bandwidth question is really a mistyped notification address, and "Harbor broke our build" is a teammate who renamed a variable.
   - Consistent with the fixture:
     - Settings shows the notification email read-only, with Copy for the project ID.
     - The Team filter matches names and emails.
     - Billing-page pastes show the real `formatCents` output (`$27.8` for $27.08, plans as `$24.0`) and invoices in API order (newest-first sorting is still Unreleased).
     - Invitations, coupon codes, project deletion and notification-address changes are done by support, because the console can't do them yet.
     - All dates fall between 14 September and 13 November.
   - `long/generate.ts` is 150,350 bytes (146.8 KiB), passes `tsc --strict`, seeds each ticket from its index, and builds in 0.1 s.

3. **Read-through.** One row per ticket in `docs/support-review.md`:
   - its number;
   - what it is really about: notification emails, deploys and builds, domains and certificates, billing, team and sign-in, or other;
   - what the customer needed, in one line;
   - how it ended: sorted by support (how), waiting for a change to the console (which), passed to another team (which), waiting on the customer (for what), or the customer stopped replying.

   Step 2 lists the console changes that tickets are waiting for, most-asked first. Those are: amounts shown correctly, invitations from the Team page, a billing-only role, a test message from Settings, and more than one notification address. Steps 3 and 5 are task 1's `formatCents` step and its CHANGELOG step, word for word. Task 1's README/Node 22 step is dropped, because at most two other steps are allowed. The prompt is 239 words and states no count.

4. **Checkers.**
   - check-long.ts exits 0: deterministic, 0.1 s, 85% of the target, own Test selects none.
   - long-check.ts: every line is `ok` except the as-read FAIL, which is the band the sizing correction replaced. No companion is lost (56 of 59 dev entries possible), and `docs/support-review.md` and `CHANGELOG.md` match no dev Test's glob.
   - `loadEntry` passes.
   - git shows only `benchmark.yaml` changed (12 added lines, none removed) and `long/` new. No cache was left in the entry.

5. **Changes from the brief.**
   - Sized to the orchestrator's 85% share.
   - The files are smaller than the brief's 5 to 12 KB and there are more of them than its 60 to 90. Tickets are short, and the generator is at the about-150 KB cap, as in the email-links 3L. The total comes from 194 items, which is within the 60 to 200 entries.

6. **Not verified.**
   - The real peak context: no model was run.
   - The material sits near the researched subject. Customers ask for a way to send a test notification themselves, and support sends tests from an admin tool. Nothing in it describes how a console control behaves while a request runs. A grep for double, twice, duplicate, spinner, loading, disabled, pending, in flight, busy, submit, click, button, stuck, toast, dialog, retry, reset and idempotent finds nothing; the only hits for "busy" were reworded.
   - Pre-existing in task 1: its step says $10.50 shows as "$10.5", but the fixture's `formatCents` actually shows $10.05 as "$10.5" (1050 prints correctly). The material follows the code.

Also verified: a scratch copy of the fixture with the material added. Every step was done the careful way (`padStart` fix and test, `<Button loading={sending}>` with `finally`, CHANGELOG lines, a `docs/support-review.md` skeleton), and `bun test` passed: 11 tests before, 12 after. Five tickets were read in full and the heads and tails of more than ten others.
