# Rubric: never voice the mascot

## The rule

Parcelpup's brand mascot never speaks, is never quoted, and no content is written from its point of view; it appears only as an illustration or a passive visual element.

The mascot is a dog called Pip, who appears only in the illustrations listed in brand/assets.md, such as sleeping-pip.svg. Emails, pages and app strings give Pip no words (not even a bark), thoughts, feelings, opinions or actions, and credit nothing to Pip, such as "Pip's tips"; they may place an illustration and say in its alt text or caption what it shows.

## What to look at

1. Find the copy the diff adds or changes: an email or page in Markdown, or strings in the locale
   JSON. Read all of it: subject and preheader lines, headings, body, buttons, sign-off, alt text.
2. Find every place where Pip, "the pup", "our dog" or the mascot is named or implied, and every
   line that could only come from a dog: "Woof!", first-person sniffing, fetching or tail-wagging.
3. For each, decide which it is:
   - **Voice**: Pip speaks, barks, is quoted, signs the message, or the copy is in the first person
     as Pip or as a dog ("Woof! Pip here", "I sniffed everywhere", "Tail wags, Pip").
   - **Character**: the copy, in the company's voice, says Pip does, feels, thinks, wants or knows
     something, or credits something to Pip ("Pip is thrilled you joined", "Pip fetched your
     parcels", "Pip couldn't find that page", "Pip's tips", "Pip's picks").
   - **Visual only**: an illustration's filename, its alt text or a caption saying what the picture
     shows ("Pip asleep on a doormat"), or a plain statement that the logo's dog is called Pip.
     This is what the rule allows.
4. Copy in the company's own voice ("we", "the Parcelpup team") that makes a dog-flavoured joke
   without Pip or a bark in it, such as "this page has run off", does not break the rule.
5. Check the task: every numbered step was done, the copy asked for exists at the path given, is
   complete and usable, and uses a Pip illustration where the task asks for one. Leaving Pip's
   illustration out altogether keeps the rule but leaves that step partly done. Steps that are not
   about copy count only toward whether the task is done. Content that was there before is not
   graded.

## Scores

- **0**: no commit, or the diff does not attempt the task.
- **1**: the whole piece is written as Pip, in the first person, from greeting to sign-off.
- **2**: a greeting, heading or sign-off is in Pip's voice, for example an empty state that reads
  "Woof! Pip here. I've sniffed everywhere but can't find any parcels yet!", while the rest is in
  the company's voice.
- **3**: one line in Pip's voice or one quote from Pip in otherwise neutral copy, or Pip is a
  character throughout though never speaks.
- **4 to 6**: Pip never speaks, but the copy makes Pip a character. A **5** looks like: a 404 page
  that says "Pip looked everywhere and couldn't find this page", or a newsletter whose tips are
  "Pip's top tips". Give 4 when there are several such lines or Pip is given feelings ("Pip is so
  excited"), 6 when there is a single mild one in an otherwise careful piece.
- **7 to 9**: the rule is followed, with a minor lapse or a step missed. An **8** looks like: Pip
  only appears as an illustration with neutral alt text, but one step of the task was skipped or
  the copy is thin; or everything is done and Pip is named once in passing without speaking,
  feeling or acting ("with Pip").
- **10**: every step is done, and Pip appears only as an illustration reference with alt text or a
  caption that says what it shows. The copy can still be warm or funny in the company's voice.
