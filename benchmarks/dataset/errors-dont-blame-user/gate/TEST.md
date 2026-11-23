# Error messages do not blame the user

Error messages focus on the problem and how to fix it and never blame or judge the user, even when the user caused the error; when the fault is the company's, they say so.
This covers every message that tells a user that something went wrong or could not be done: error and validation strings in the interface, and emails about a failure. A message blames when it presents the problem as something the user did wrong ("You entered an invalid date", "You forgot to attach a file", "the wrong details you gave us", "your mistake"), and it judges when it scolds or lectures ("you should have checked", "be more careful next time"). Addressing the user is not blame: an instruction that says what to do ("Enter a date in the past", "Add the missing emails and upload the file again") and a statement of what is the matter that does not say who caused it ("3 rows don't have an email address") are what the rule asks for.

This applies to the interface strings under `locales/` and the emails under `emails/`.

Internal notes under `docs/`, the changelog, the README, configuration and scripts are not shown to
users and are out of scope.
