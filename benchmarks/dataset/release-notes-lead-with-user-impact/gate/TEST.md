# Release notes lead with user impact

Each release-note item starts by telling users how the change affects them ("You can now…", "You no longer need to…"), not by describing what the team did ("We've fixed…", "Fixed a bug where…", "Refactored…").
An item is each bullet, numbered point or short section that describes one change in release notes, a customer-facing changelog or a "What's new" email. Its first sentence, after any heading or short label naming the feature, says what the reader can now do, can no longer do or no longer needs to do, or what now works differently for them. It does not open with the team's work: "we" as the one acting ("We've added…"), a statement that work was done, in any voice ("Fixed…", "Improved…", "Resolved…", "Duplicate submissions fixed"), or a bare name for the work ("New file-upload field type", "Performance improvements", "Bug fixes"). What the team did and why may follow the effect. A change users would not notice, such as a refactor or a dependency upgrade, is left out. Titles, subject lines, headings over a group of items, version and date lines, an introduction and a sign-off are not items.

This applies to release notes, the customer-facing changelog and "What's new" emails, in Markdown
under `content/release-notes/`, in `content/changelog.md` and under `emails/`.

Not covered: other emails, such as a welcome email, a single feature announcement, a price change
or an incident notice; help pages; and the repository's own files, such as commit lists, data and
the README.
