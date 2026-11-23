---
name: circuit-breaker-no-extension
description: Fieldstone's rule for a project that did not ship within its cycle or small batch. Use whenever you write or edit a cycle plan, betting table notes, a retrospective or a project update (the planning documents under cycles/), or say what happens next to unfinished work, even when the request is mostly about bets, capacity, next steps or recommendations.
---

# No extension for unfinished projects

## The rule

A cycle plan or project update does not give an unfinished project extra time by default; work that missed its time box stops, and if it is still worth doing it returns as a newly shaped pitch for a later betting decision instead of being carried over.

At Fieldstone this means:

- A project gets the time the betting table bet on it: one six-week cycle for a build team, or two weeks for the small batch. If it has not shipped when that time is up, it stops. It gets no extension, carry-over, spill-over, wrap-up or finishing time and no "phase 2", neither in cool-down nor in the next cycle, whatever it is called.
- If its remaining work is still worth doing, it is shaped into a new pitch during the next cycle and goes to the betting table after that cycle, beside the other pitches. Until that table bets on it, no plan or update schedules it or says it will be picked.
- This holds in every cycle plan, betting table note, retrospective and project update.

Apply it to every section of the document, for the whole task: bets, capacity, cool-down, risks,
options, questions for the table and recommendations.

## Why

The time box is what keeps a project from running on for months. A project that missed it usually
hit a problem the pitch did not see, and two more weeks rarely fix that. Stopping it makes us
reshape the problem with what we learned, and the betting table then weighs the new pitch against
everything else instead of handing the time over by default.

## Gotchas

- "Nearly done" and "two more weeks" are exactly the projects this rule is about.
- Extra time hides under other names: "finish up in the first two weeks", "polish sprint",
  "use cool-down to close it out", "the small batch can take the last scopes", "phase 2".
- Writing a new pitch and betting on it in the very next cycle is still a carry-over: the new
  pitch is shaped during that cycle and goes to the table after it.
- Do not write the new pitch's selection as settled ("it will be our first bet next cycle").

## Examples

Compliant:

> **Invoice export (Birch): not shipped.** CSV export works; the accounting integrations do not.
> The project stops here. Lucia will shape what is left into a new pitch during the coming cycle,
> for the betting table after it to weigh with the other pitches.

Violating:

> **Invoice export (Birch): not shipped.** Birch spends the first two weeks of the next cycle
> wrapping up the integrations, then starts its next project.

Also violating: "Option B for the table: give Invoice export a two-week small batch to finish."

## Before you commit

Reread every document you wrote or changed under `cycles/`. For each project that did not ship,
check that no section gives it more time in cool-down or the next cycle, under any name, or offers
that as an option, and that any new pitch goes to a later betting table with its selection left
open. Fix what fails before committing.
