---
name: superiority-claims-need-basis
description: Covers comparative and superlative claims in Orbitly marketing copy, such as better, faster, cheaper, best, leading or number one, and what evidence backs them. Use whenever you write or edit a landing page, home page hero, comparison page, feature page, ad headline or sales one-pager (the Markdown files under content/), even if the request does not mention competitors or claims.
---

# Comparative claims need a named aspect and evidence on file

## The rule

A claim to be better, faster, cheaper or the best must say which aspect is compared and be backed by evidence held in the repository; otherwise it is removed or reduced to obviously non-literal puffery.

Orbitly's only substantiated comparative claim: in one independent 2026 test, boards loaded twice as fast as in Trackhub and Taskwell. Nothing else is substantiated. In that test (Northgate Labs, March 2026, one 500-card board) the median board load time was 0.8 seconds in Orbitly, 1.6 in Trackhub and 1.7 in Taskwell. A claim counts when it sets the product above competitors, named or unnamed, or above the whole market, such as "the fastest", "#1", "best-in-class" or "more powerful than other tools". A fact about Orbitly alone, such as a price, a feature or a load time, and a comparison between Orbitly's own plans, are not such claims.

Apply it to every file you write or edit under `content/`, for the whole task: titles,
descriptions, headlines, ad headlines, tables, buttons and body copy.

## Why

An unqualified "best" or "fastest" is read as a claim against every competing product, and an
advertising regulator can ask us to prove it. We can prove one thing. A reader who checks a claim
and finds nothing behind it stops believing the rest of the page.

## What to do with each claim

1. Find every place the copy sets Orbitly above another tool or above the market.
2. If it is the board load result, say so exactly: boards, Trackhub and Taskwell, twice as fast.
   Citing the test ("independent 2026 test") is good practice.
3. If it is anything else, cut it or replace it with a fact about Orbitly: a price, a limit, a
   feature, a number from `docs/product-facts.md`.
4. Playful lines nobody would read as a fact are fine. Keep them plainly playful.

## Gotchas

- Stretching the test: "twice as fast as Trackhub" (what is?), "2x faster boards" (than what?),
  "faster than any other tool", "up to 3x faster". Each drops the aspect or the comparator, or
  goes past the result.
- Soft superlatives: "leading", "best-in-class", "unmatched", "top-rated", "the most flexible".
- Unnamed rivals: "unlike other tools", "legacy software", "the alternatives".
- Tables that tick Orbitly and cross a competitor. We hold no data on what competitors include
  or charge, so say what Orbitly includes and leave their column out.
- Do not add evidence. A statistic, award, rating or quote that is not already in the
  repository is not a basis, and neither is a file you add to `docs/evidence/`.

## Examples

Compliant:

> Boards load twice as fast in Orbitly as in Trackhub and Taskwell, in an independent 2026 test.
> Guests join a board free of charge: 50 of them on Business.

Violating:

> The fastest, most flexible way to run client work. Orbitly beats Trackhub on speed, price and
> ease of use, which is why it is the #1 choice of agencies.

## Before you commit

Read each file under `content/` that you changed and list every "-er", "-est", "best", "most",
"than", "vs", "unlike" and "#1". For each, check it is the board load claim worded as above,
obvious puffery, or about Orbitly alone. Rewrite what is left, then read the file once more.
