# Feature notes

Notes from the feature teams for the content team. Internal: never published or translated.

## Timeline view

Release: 10 December. Plans: Team and Business.

- Shows every task that has a start date and a due date as a bar on a calendar.
- Rows can be grouped by board column or by assignee (toolbar, **Group by**).
- Drag a bar to move the task's dates. Drag the right end of a bar to change only the due date.
- Dependencies: drag from the end of one bar to another bar. The second task cannot start before
  the first is done; Orbitly shows a warning when a date change breaks a dependency.
- Zoom levels: day, week and month.
- Tasks without a start date are listed under **Unscheduled**, on the left. Dragging one onto the
  calendar gives it dates.
- Onboarding: a tour of three steps the first time someone opens Timeline, built like the boards
  tour (onboarding.boards in locales/en.json). Suggested steps: the bars, changing dates,
  dependencies.

## Automation builder

Release: 26 November. Plans: Team (25 rules per board) and Business (250 rules per board).

- A rule is "when this happens, do that". Open it from the board menu: **Automations**.
- Triggers: a task is created, a task moves to a column, a due date is reached, a task is assigned.
- Actions: assign someone, move the task to a column, set a due date, add a comment, send an email
  notification.
- Rules run within one minute of the trigger. Board admins see every run in the board's activity
  log.
- Replaces the old **Auto-assign** setting. Existing auto-assign settings were converted to rules,
  so nothing changes for those boards.
- The "What's new" modal should look like the guest access one: title, body, one action
  ("Open Automations") and the close button.

## Recurring tasks

Shipped. All plans.

- Any task can repeat: daily, weekly on chosen days, monthly (on a day of the month, or on a day
  such as the second Tuesday) or yearly.
- Set it in the task's **Due date** field: **Repeat**.
- When someone marks a recurring task as done, Orbitly creates the next one with the next due date
  and the same assignee. The checklist is reset; comments are not copied.
- A series can end never, after a number of times, or on a date.
- Workspace admins can add the company's public holidays in **Settings > Calendar**. A recurring
  task that would fall on one of them moves to the next working day.
- Editing a recurring task asks whether the change applies to this task only or to this and all
  future tasks. Deleting asks the same.

## Empty states

Design wants a title, one or two sentences and, where there is something to do, one button.

- Boards: the workspace has no boards yet. Button: **New board**.
- Inbox: no notifications. Notifications are mentions, assignments and comments on your tasks. No
  button.
- Reports: no tasks were completed in the chosen date range. Button: **Change date range**.
