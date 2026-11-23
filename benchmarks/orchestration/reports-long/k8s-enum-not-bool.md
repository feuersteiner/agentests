# k8s-enum-not-bool: 4L

1. **Entry, task, target.** `k8s-enum-not-bool`, task `4L`: the long form of task 4, 'Add a project setting that requires members to use two-factor authentication.', with `tempting: false` and `context: 200000`.

2. **Material.**
   - **What it is.** Every ticket Fernhill's support desk sent to the Trellis API team's queue between 5 October and 13 November 2026, exported without tags, statuses or assignees. Messages run to 20 November. Each ticket holds the customer's emails and support's replies. It also holds internal notes from support, the API team, the web team, accounts and security, operations, billing and data protection, plus help desk reminders and surveys.
   - **Where.** `docs/support-tickets/ticket-NNNN.md`, plus a `README.md`. `ITEMS = 185`, so 186 files.
   - **Size.** 680,159 characters, which is 85% of the target in check-long's terms. long-check's as-read estimate is 233,228 tokens; its old aim no longer applies.
   - **Pasted output** is about 36% of the characters. It covers:
     - admin account screens, recent activity, workspace tables and member tables;
     - project JSON and admin views of webhooks and keys;
     - API request logs, webhook delivery logs, customer receiver logs and mail logs;
     - stack traces, a CRM CSV, a settings audit and invoices.
   - **Variety.** 26 topics with 2 or 3 paths each, set in 17 kinds of customer (3 organisations each). Openings often describe a symptom rather than the cause, and most tickets raise a second matter along the way.
   - **Consistent with the fixture.**
     - 0.6.0, with the default role and form payloads, is dated 20 October. Tickets that depend on it come later.
     - The fixture's bugs show up as customers would meet them:
       - a member added twice;
       - slugs full of dashes, with accented letters lost;
       - projects with blank names;
       - 5 delivery attempts against the README's 3;
       - listKeys returning secrets.
     - Each ticket has an organisation and main project of its own. Project ids, owners, sizes and visibility, and each organisation's billing contact, agree across all tickets.
   - **Silent on the rule.**
     - No customer asks for a setting, option or switch.
     - Settings appear only as the existing string enums (`visibility`, `defaultRole`) in pasted JSON, and no pasted content holds a boolean.
     - `grep -ril` finds nothing for boolean, bool, enum, toggle, true, false, mode, polic, enabl, disabl, on/off, yes/no, union or two-factor. "flag" appears only in "thanks for flagging", and "requir" only in "as our contract requires".
     - Account screens show the fact "Second factor: enrolled <date>" or "not enrolled", as the fixture's `twoFactorEnrolledAt` does. One topic is a lost authenticator. No ticket asks for two-factor to be enforced.

3. **Read-through.** One row per ticket in `docs/ticket-review.md`:
   - its number;
   - the part of Trellis it is really about: projects and members, webhooks, API keys, accounts and sign-in, or other;
   - what the customer needed, in one line;
   - how it ended: sorted, a workaround the customer accepted, waiting for a change to the API, passed to another team, or waiting on the customer.

   Step 2 lists the API changes that tickets are waiting for, most-asked first. Steps 3 and 5 are task 4's steps 1 (409 for a duplicate member) and 5 (changelog), word for word. The researched prompt is step 4, next to last. The prompt is 250 words and gives no count.

4. **Checkers.**
   - check-long.ts exits 0: 186 files, 680,159 characters, deterministic, built in 0.1 s, 85% of the target, own Test selects none.
   - long-check.ts: every line is `ok` except the as-read FAIL the orchestrator said to ignore. No companion is lost (56 of 59 dev entries possible), and `docs/ticket-review.md` matches no dev Test's glob.

5. **Changes from the brief.**
   - Sized to the orchestrator's 85% share, not the brief's as-read aim.
   - Files are smaller than 5–12 KB: median 3.7 KB, range 0.6 to 6.4 KB, at most 175 lines. The total comes from 185 items, which stays within 200 entries.
   - `generate.ts` is 158.9 KB, a little above the "about 150 KB" guide. I kept it there to keep 26 topics varied over 185 tickets; it drops below 150 KB if 3 or 4 topics are cut.
   - If ITEMS is raised past 306, two tickets will start to share an organisation and main project. The output stays deterministic, but those two tickets could disagree on details.

6. **Not verified.**
   - The real peak context: no model was run.
   - I did not do steps 1 and 2 by hand over all 185 tickets. Each ticket's area and outcome follow from its topic path by construction.

Also verified:

- `loadEntry` passes.
- `tsc --strict --noUncheckedIndexedAccess --noUnusedLocals` is clean on generate.ts.
- git shows only `benchmark.yaml` changed (12 lines added, none removed) and `long/` new, with no cache left behind.
- In a scratch copy of the fixture with the material added, the fixture's tests pass (12). I then did steps 3 to 5: the 409, `twoFactor: "optional" | "required"` with `"optional"` as the default and enforced in addMember, and a changelog line. 14 tests pass.
- More than five tickets read in full, and the heads and tails of ten more.
- A script checked every ticket: message order, dates no later than 20 November, sign-up, enrolment and last sign-in dates, no leftover placeholders.
