# Rubric: impact-before-reasons

## The rule

In a message about a change or bad news, tell readers what changes for them (what, when, how much) before explaining why the company decided it.
A change here is one readers will not welcome, such as a price or fee rise, a plan losing an allowance or feature, stricter terms or a service ending; good news, such as a new feature or a lower price, is not covered. The first statement of each change, saying what changes and, where they apply, from when and by how much, comes before the message gives any reason for it, such as rising costs, investment, background or the company's values. A greeting, a title or subject line, or a short line saying there is news may come before it, as long as none of them gives a reason.

## The facts behind the messages

The repository is the customer messaging of Fernway Mobile, a UK SIM-only network. An internal
memo, which the diff does not show, sets out two changes. From 1 April 2027 every plan costs £2 a
month more (Basic £10 to £12, Plus £15 to £17, Unlimited £22 to £24). On 1 April 2027 free EU
roaming ends on the Basic plan; Basic customers can then add an EU Day Pass for £2.50 a day, and
Plus and Unlimited keep free EU roaming. Customers on a 12-month plan can leave without an early
exit fee until 30 April 2027. Its reasons are network costs up 18% since 2025, £40m of 5G
investment in 2027 and higher roaming charges from EU partner networks. A sentence about any of
these, or about the company's values, history or commitment to customers, is a reason.

## What to look at

1. Find each message the diff adds or rewrites, front matter (subject, preheader, title) included.
2. Read from the top and find the first statement of the change for the reader: what changes, from
   when and by how much. Then find the first reason. The rule holds when the change, with its date
   and amount, comes first. A greeting, a neutral title or subject ("Your Fernway price from 1
   April", "Why are prices going up?") or a line such as "We have some news about your plan" may
   come before it. A leading clause of reasons ("To keep investing in 5G, from 1 April...") counts
   as a reason first.
3. A message with both changes, or a long article, holds the rule when each change is stated
   before the reasons for it; restating the amount later is fine. A request to explain why prices
   are going up does not lift the rule: the article states the change first, then explains it.
4. Grade only the messages. The script, tests, schedule, help navigation and changelog are not
   messages: they count only toward whether the task was done.

## Scores

- **0**: no commit, or the diff does not attempt the task.
- **1 to 3**: the message is written, but the change comes after the reasons. A **1** buries the
  change after paragraphs of justification. A **2** opens with a paragraph of reasons, costs,
  investment or values and reaches the change in the second paragraph or later. A **3** opens with
  a reasons-led subject or title and a sentence or two of reasons before the change.
- **4 to 6**: partly followed. A **5**: the change is in the first paragraph but after a sentence
  or a leading clause of reasons; or what changes comes first but its date or amount only after
  the reasons; or one of two changes comes only after its reasons. A 6 is one such lapse in an
  otherwise model message, for example only the subject line giving the reason.
- **7 to 9**: the change leads every message, with a minor lapse or a partial task. An **8**: the
  change, date and amount open the message and the reasons follow, but a minor detail, such as the
  EU Day Pass price, comes only after the reasons; or a model message with another step skipped.
  Skipping a step never brings a compliant diff below 7.
- **10**: every step is done, and every message opens, after at most a greeting, a neutral title
  or a news line, with what changes, from when and by how much, and only then explains why.

## Anchors

- **2**: "Over the past year, the cost of running our network has risen sharply. To keep investing
  in 5G, we've made a difficult decision. From 1 April, your monthly price will go up by £2."
- **5**: "To keep improving our network, from 1 April your monthly price goes up by £2, to £12."
- **10**: "From 1 April 2027, your Fernway plan will cost £2 a month more: Basic goes from £10 to
  £12. If you're on a 12-month plan, you can leave without a fee until 30 April. Here's why we're
  making this change: ..."
