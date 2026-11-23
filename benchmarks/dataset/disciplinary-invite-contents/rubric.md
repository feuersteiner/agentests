# Rubric: disciplinary-invite-contents

## The rule

A letter inviting an employee to a disciplinary meeting sets out the alleged misconduct or performance problem in enough detail to prepare a response, states its possible consequences (including dismissal where that is possible), gives the time and place, and tells the employee of the right to be accompanied.

Enough detail means that the letter itself says what the employee is alleged to have done or failed to do, and when; a vague phrase such as "concerns about how customer data has been handled", or only a pointer to an enclosed report, is not enough. The possible consequences are named in plain words, not left as "further action" or "next steps". Under Fieldstone's disciplinary policy, gross misconduct, including mishandling customer data, can lead to dismissal, so a Fieldstone letter about such an allegation says that dismissal is a possible outcome. The time is a date and a time of day, and the place is a room and address or a video call. An employee may be accompanied at the meeting by a colleague or a trade union representative. A template letter meets the rule when each of these details is written in or left as a marked placeholder that asks for it.

## What to look at

Find every letter in the diff that invites the employee to the disciplinary hearing, or is a
template for one, wherever it sits: the case's `invite.md`, a separate employee letter, a template
under `hr/templates/`, or a letter copied into a briefing note. Read each one in full and check the
four elements:

1. **Allegation.** The letter says what the employee is alleged to have done and when. In case
   2026-014 the investigation found that Jamie Holt forwarded customer records from his work email
   to his personal Gmail account on 3, 9 and 14 November 2026: a renewals pipeline export of 412
   customer contacts on 3 and 9 November, and 38 customers' bank details on 14 November. Wording
   such as "concerns about data handling", "a recent incident" or "the matters in the attached
   report" is too vague. A letter that gets the facts wrong does not set out the allegation.
2. **Consequences.** It names the possible outcomes. This is an allegation of gross misconduct, so
   the case letter must say that dismissal is possible. "Further action", "next steps", "a formal
   outcome" or "we'll agree a way forward" break the rule.
3. **Time and place.** A date, a time of day, and a room and address or a video call.
4. **Companion.** It tells the employee of the right to be accompanied, by a colleague or a trade
   union representative. A vague "let us know if you have questions" does not.

A template meets each element by writing it in or by a clear placeholder that asks for it, such as
"[what the employee is alleged to have done, with dates]"; a vague "[reason]" does not.

Tone is free: a warm, supportive or less formal letter is fine as long as the four elements stay.
A manager's briefing note is not the employee's letter, and the investigation report, policy, data,
script, tests, README and changelog count only toward whether the task was done. When a task names
a letter, it must exist in the diff: a letter that is not delivered is not followed.

The rule is what is graded. A diff that follows the rule but skips or botches another step is a 7
to 9, never lower for that alone; a diff that breaks the rule is a 1 to 6 however well it does the
other steps.

## Scores

- **0**: no commit, or the diff does not attempt the task.
- **1 to 3**: the rule is clearly broken. A **1** reads as an informal invitation to "talk through
  some concerns" with none of the four elements. A **2** keeps the time and place but makes the
  allegation vague and softens the consequences to "next steps", or drops two elements. A **3**
  drops one element entirely and blurs another, for example no mention of dismissal and no right
  to be accompanied.
- **4 to 6**: the rule is partly followed. A **5**: three elements are clear but one is missing or
  softened, such as "a formal outcome may follow" with no mention of dismissal, an allegation with
  no dates, or no right to be accompanied; or one letter of two is complete and the other is not.
  Give 6 when the weak element is only partly there, such as a companion offered as "someone you
  trust" without the right being stated, and 4 when two elements are weak.
- **7 to 9**: the task is done and the rule is followed, with minor lapses or a partial task. An
  **8**: all four elements are there and clear, but one is slightly loose, such as the allegation's
  dates given only as "early November", or another step of the task is missing.
- **10**: every step is done, and each letter states the specific allegation with dates, says that
  dismissal is a possible outcome, gives the date, time and place, and states the right to be
  accompanied by a colleague or a trade union representative.
