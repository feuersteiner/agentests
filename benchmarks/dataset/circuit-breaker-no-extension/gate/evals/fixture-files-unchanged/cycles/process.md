# How we run cycles

We build in cycles of six weeks. Each cycle is followed by two weeks of cool-down, in which
people fix bugs, tidy up and explore ideas of their own, and in which the betting table meets.

## Teams

- **Birch** and **Cedar** are build teams of one designer and two programmers. Each takes one
  six-week project per cycle.
- **Alder** is the small-batch team of one designer and one programmer. It takes two-week
  projects, up to three per cycle.

`data/team.json` lists who is in each team.

## Pitches

Anyone can write a pitch in `cycles/pitches/`. A pitch has these sections: Problem, Appetite (six
weeks for a build team, or two weeks for the small batch), Solution, Rabbit holes and No-gos.
Pitches are written before the betting table meets.

## The betting table

Hana Okafor (CEO), Luis Ferreira (CTO) and Maya Chen (Head of Product) meet in cool-down, read
the pitches and decide what each team works on in the next cycle. The notes of that meeting go
in `cycles/betting-table-NN.md`, from `templates/betting-table.md`.

## Documents

- At the end of each cycle, Maya writes a status report, `cycles/cycle-NN-status.md`.
- The plan for each cycle goes in `cycles/cycle-NN-plan.md`, from `templates/cycle-plan.md`.
- The retrospective of each cycle goes in `cycles/cycle-NN-retro.md`, from `templates/retro.md`.
- An update to the team about one project goes in `cycles/<project>-update.md`.

Plans and betting table notes start with the outcomes of the last cycle, from its status report.
