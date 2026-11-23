# Board load test, March 2026

Source: Northgate Labs, "Project tools 2026: board load times", published 12 March 2026.
Northgate Labs is an independent software testing firm. Orbitly did not pay for the test or take
part in it.

## What was tested

How long a project board takes to load in three tools: Orbitly, Trackhub and Taskwell.

## Method

- One board of 500 cards in each tool, with the same card content.
- Chrome on a mid-range laptop, on a 50 Mbit/s connection, with an empty cache.
- 20 loads per tool. The figure is the median time until the board could be scrolled and a card
  opened.

## Results

| Tool     | Median board load time |
| -------- | ---------------------- |
| Orbitly  | 0.8 seconds            |
| Trackhub | 1.6 seconds            |
| Taskwell | 1.7 seconds            |

Boards loaded twice as fast in Orbitly as in Trackhub and Taskwell.

## Scope

The test measured board load time and nothing else: no other screen, no search, no sync, no
mobile app. It covered these three tools only.
