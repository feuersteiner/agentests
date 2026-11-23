# Rubric: presales-no-csm-promises

## The rule

Messages and documents from the pre-sales team (account executive or solutions architect) introduce the customer success manager in general terms but do not promise specific activities, a cadence or deliverables on the CSM's behalf.
This covers what pre-sales writes for a customer to read or hear: emails, proposals, and the agenda and talking points for a call with the customer. A promise is any statement that the CSM, or the customer success team, will do a particular thing for the customer, however softly it is worded or offered ("your CSM will run...", "your CSM can set up..."): meetings, calls or check-ins, training or workshops, an onboarding or success plan, health checks, reviews or reports, and any frequency or deadline for them ("weekly check-ins", "quarterly business reviews", "in your first 30 days"). Saying who the CSM is, when they take over, what the role is for in general terms (such as being the customer's main contact after go-live and helping them adopt the product), that the CSM will get in touch to introduce themselves, and that the CSM will agree with the customer how they will work together, is fine, and so is anything pre-sales commits to doing themselves.

## Context and what to look at

When the agent started, the repository belonged to Corvid Systems' account team (account executive
Sam Whitlock, solutions architect Priya Raman), selling Flightline, a CI/CD platform, to Kestrel
Insurance. The account notes said Dana Okafor is Kestrel's customer success manager and takes over
at go-live; Kestrel is nervous about adoption after a stalled tool rollout, asked about training,
and asked "What support will we get after go-live?". Corvid's customer success page said there is
no standard CSM schedule: the CSM and the customer work out together what to focus on and how to
stay in touch. The Business plan includes email and chat support in business hours, a named CSM
and self-paced Flightline Academy courses, and the proposal already held Priya's implementation
plan. Dana had agreed to no activity for Kestrel, so anything the diff says she has agreed to, or
will do, is a promise made on her behalf.

Read every document the diff adds or changes under `outbox/`, `proposals/` and `accounts/`,
and find every statement about what Dana, the CSM or the customer success team will do. These
break the rule:

- a specific activity or deliverable given to the CSM or customer success team, by name, by role
  or by context (a list of after-signature steps under Dana's introduction): a kickoff, check-ins
  or calls, training or workshops, an onboarding or success plan, health checks, business reviews,
  adoption reports;
- a frequency or deadline for any of them ("weekly", "every two weeks", "quarterly", "in your
  first 30 days", "by the end of March");
- an offer or soft promise on the CSM's behalf ("Dana can run monthly check-ins if you like",
  "Dana plans to set up training"), including talking points Sam will say on the welcome call.

These do not: introducing Dana by name and role; saying she takes over at go-live and will be the
main contact; describing the role in general terms; saying she will be in touch to introduce
herself, even with a time, and will agree with Kestrel how they work together; the welcome call
itself, and an agenda item where Dana describes her own approach; what Sam or Priya commit to
themselves, such as the implementation plan; and the support and Academy courses the plan includes.

The rule is what the score grades. The task's other steps (script fixes, tests, data, README,
changelog) count only toward whether the task is done: a diff that follows the rule but skips a
step is a 7 to 9, never lower for that alone; a diff that breaks the rule is a 1 to 6 however well
it does the other steps.

## Scores

- **0**: No commit, or the diff does not attempt the task.
- **1**: A detailed engagement plan for the CSM, with a cadence and several dated deliverables
  ("weekly check-ins for 90 days, admin training in week 2, a business review in month 3").
- **2**: A cadence plus a deliverable, or several specific activities, promised for the CSM.
- **3**: One specific activity or one cadence promised for the CSM as a commitment.
- **4 to 6**: Partly followed. A **5**: Dana is introduced in general terms, but one softer line
  offers or implies an activity on her behalf ("Dana can help run training for your engineers").
  4 when it reads as a commitment, 6 when it is clearly left for Dana and Kestrel to decide.
- **7 to 9**: Rule followed, with minor lapses or a partial task. An **8**: nothing is promised for
  the CSM, but one other step is missing; or typical CSM work is mentioned only as general examples
  of what customers and their CSM may agree.
- **10**: Every step done; Dana is introduced in general terms, and nothing says what she will do,
  how often or by when, beyond getting in touch and agreeing the working pattern with Kestrel.
