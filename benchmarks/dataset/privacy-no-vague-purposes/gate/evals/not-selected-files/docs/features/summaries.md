# Summaries

Feature note from the boards team. Internal, never published.

Ships: Monday 30 November 2026, on the Team and Business plans.

## What it does

A "Summarise" button in the board toolbar writes a summary of the board in five to ten bullet
points: the main themes of the sticky notes, the decisions recorded in documents and comments, and
the open questions. The summary appears in a panel next to the board and is saved with it, so
everyone who can see the board sees the latest summary. Clicking "Summarise" again replaces it.

Website copy for the features list: "Summaries: turn a busy board into five to ten bullet points
of themes, decisions and open questions, with one click."

## How it works

- The model is an open-weights language model that we run on our own servers in AWS Frankfurt.
- Only the board being summarised is sent to it, and only its text: images are skipped.
- A workspace admin turns Summaries on in Workspace settings > Features. It is off by default.
- Users can rate a summary with a thumbs up or down.
- Workspaces can also turn on "Help improve Summaries" in the same settings page.

The privacy details are in privacy/data-inventory.md.
