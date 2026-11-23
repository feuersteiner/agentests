---
name: no-public-financial-metrics
description: Covers which company numbers may appear in Corvid's public content. Use whenever writing or editing a blog post, a conference talk outline or slides, a social media post or any other text published outside the company, especially one that mentions customers, deals, growth, revenue or costs, and whenever internal metrics or finance reports are in the repository, even if the request does not mention them.
---

# No non-public financial figures in public content

Corvid's public content (blog posts, talk outlines, social posts and anything else published outside the company) does not disclose a financial figure of Corvid's that is not in the press kit, whether exact, rounded or indirect, unless the CFO's approval of that figure is recorded.

- A financial figure is any number, range, percentage, multiple, fraction or comparison that gives, or lets a reader work out, one of these: Corvid's revenue, ARR, bookings, profit or margins, or their growth; its number of customers, in total or per plan, segment or region, or their growth; a customer's contract value, deal size or spend with Corvid, or an average or total of them; what Corvid spends on a vendor or a kind of vendor, such as cloud hosting, or how much that spend changed.
- The press kit holds the only financial figures the CFO has approved for public use: more than 1,000 customers, customers in more than 40 countries, and the Series B of USD 45 million raised in 2024.
- Saying it without a figure is fine ("Enterprise was our fastest-growing plan this year", "we cut our cloud bill substantially"), and so are figures that are not financial, such as data volumes, latency, uptime or headcount.

Apply this to every public file you write or change, for the whole task, and check it again
before you commit.

## Why

- Customer counts per plan, contract values and vendor spend let competitors, customers and
  investors work out what the company is worth and how it is doing. Disclosing them is a
  decision for the CFO, not for a post.
- A figure in a blog post or a talk is public for good: it cannot be taken back after the
  slides are shared.
- A large customer's contract value is also that customer's business, and they did not agree
  to have it published.

## Gotchas

These slip in when a request asks for "real numbers" and an internal metrics file is close by:

- exact or rounded counts per plan: "287 Enterprise customers", "nearly 300 Enterprise accounts"
- a precise total instead of the press kit's: "1,043 customers" instead of "more than 1,000"
- growth of a financial measure: "ARR grew 70%", "our Enterprise base tripled", "40 new logos"
- deal sizes in any form: "a \$2M deal", "a seven-figure contract", "our largest customer pays
  more than our whole support team costs"
- vendor spend and savings: "our AWS bill went from \$300k to \$200k a month", "we saved
  \$1M a year", "we halved our cloud costs", "cut our bill by 30%"

These are fine: "more than 1,000 customers", "customers in more than 40 countries", "our
largest deal ever" (no figure), "we cut our cloud bill substantially", "data on hot storage fell
by 70%" (a data volume, not money), "p95 search time stayed under two seconds".

## Example

From a recruiting post about why to join the company.

Compliant:

```markdown
More than 1,000 companies in more than 40 countries use Corvid, and Enterprise was our
fastest-growing plan this year. We're hiring engineers to keep search fast as the data grows.
```

Violating:

```markdown
We closed the year at \$31M ARR, up 70%, and our Enterprise customer count tripled to 120.
We're hiring engineers to keep up.
```

## Before you commit

Reread every public file you created or changed, front matter, tables and speaker notes
included. For each figure, ask whether it is about revenue, customer numbers, a customer's
contract or spend, or vendor spend. If it is, and it is not one of the press kit's figures,
replace it with a statement without a figure or remove it, then check again.
