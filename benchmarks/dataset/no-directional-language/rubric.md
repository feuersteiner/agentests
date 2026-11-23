# Rubric: no directional language

## The rule

Help articles, emails to users and interface text name the control, menu, tab, section or label the reader should find or use and never locate it by its position on the screen or page, its colour or the look of its icon ("in the right sidebar", "the button above", "the green icon at the top", "the gear icon"), even alongside its name.
This covers words such as left, right, top, bottom, corner, sidebar, above, below, next to and "scroll down", and a control's colour, shape or icon picture ("the pencil icon", "the three dots"). It does not cover a reference to a part of the text by its order ("the steps below", "the next section"), a control's own label that contains such a word ("select **Align left**"), or alt text that says what an image shows.

## What to look at

1. Grade only reader-facing text the diff adds or changes: help articles, emails to users
   (subject and preheader included) and interface strings, such as tooltip and tour text. The
   changelog, README, internal notes, configuration, scripts and tests are not graded, whatever
   words they use, and neither is text that was there before and is left unchanged.
2. In that text, find every place that sends the reader to a control, menu, tab, panel or section,
   or introduces one, as a tour step does: "select", "click", "open", "go to", "find", "use".
3. For each, check whether it locates the control by position (left, right, top, bottom, corner,
   sidebar, rail, above, below, next to, beside, "scroll down", "the button below" in an email) or
   by its look (a colour, a shape, an icon's picture such as a gear, pencil, eye, plus sign, trash
   can or three dots). A hint counts even beside the control's name: "select **Publish** in the
   top right corner" and "the green **Publish** button" both break the rule.
4. Do not count: a part of the text referred to by its order ("the steps below", "the table
   below", "see the next section"); a control's own label that contains such a word (**Align
   left**, **Back**); "this panel" or "here" in a tooltip that is attached to the thing it
   describes; alt text or a caption that says what an image shows; colours that do not locate a
   control (brand colours, a chart's lines); and the words in another sense ("right away", "the
   right plan", "top tips", "3 days left").
5. Weigh each break: an instruction that can only be followed by seeing the screen ("click the
   gear icon", "use the panel on the left") is worse than a hint beside a name.
6. Check the task: every numbered step was done, and the text asked for exists at the path given
   and is complete and usable by its reader. Steps that are not about reader-facing text count
   only toward whether the task is done.

## Scores

- **0**: no commit, or the diff does not attempt the task.
- **1 to 3**: the rule is clearly broken. A 1: the text can only be followed by seeing the screen;
  most instructions give a position, colour or icon and no name. A 2: several instructions rely on
  position or looks, some with no name at all. A 3: names are given, but most instructions also
  carry a position or a look, or one instruction relies on position or looks alone.
- **4 to 6**: partly followed. A 4: three or so hints beside named controls. A 5: two. A 6: one
  hint beside a named control in otherwise careful text, such as a single "in the top right
  corner", or "use the button below" in an email whose button label is also given.
- **7 to 9**: the rule is followed. Use 7 or 8 when a step of the task was skipped or the text is
  thin, or when one phrase is arguable under point 4; 9 when only a small part of the task is
  missing.
- **10**: every step is done, and every instruction names its control, menu, tab or section with
  no position, colour or icon picture.

## Anchors

- **2**: a help article whose steps read "Click the gear icon at the bottom of the left rail, then
  the Domains tab along the top" and "hit the blue button on the right of the row".
- **5**: an article that names every control, but says "**Publish**, the green button in the top
  right corner" once and "the **More** menu (three dots)" once.
- **8**: clean text with the changelog line the task asked for missing; or complete work in which
  one phrase, such as "the options below", could be read either way.
- **10**: the whole task done; tour steps, articles or emails send the reader to "**Settings** >
  **Domains**", "select **Add rule**", "open **More**, then **Remove**", and never say where on the
  screen anything is or what it looks like.
