# Data inventory

Internal. Owner: Ilse Verbeek (privacy lead). Reviewed 2026-11-02.

Every kind of personal data Tessellate handles, where it comes from, what we use it for and what we
do not use it for. The public notices are written from this file. When a product team starts
using data in a new way, it adds a row here before the change ships.

## Web app and website (live)

| Data | Source | What we use it for | Not used for | Kept |
| --- | --- | --- | --- | --- |
| Name, email address, password hash | Sign-up form | Create the account, sign the user in, send password reset and security emails | Marketing emails | Life of the account plus 30 days |
| Workspace name, member list, roles | Workspace settings | Show members to each other, decide who can edit which board | Anything outside the workspace | Life of the workspace plus 30 days |
| Board content (sticky notes, documents, images, comments) | Users | Store and show boards to the people they are shared with; build the search index for the workspace | Advertising; staff do not open a board unless the user asks support to look at it | Until deleted, then 30 days in backups |
| Billing contact, company name, VAT number | Checkout | Issue invoices, charge the subscription through Stripe | Marketing | 7 years (Dutch tax law) |
| Card details | Stripe checkout | Stripe stores them and charges the card; we only see the brand and last four digits | Anything else | Held by Stripe |
| Support messages | Email to support@tessellate.example | Answer the user; once a month the support lead tags tickets to count the five most common problems | Training any model | 2 years after the ticket closes |
| IP address, browser and device type at sign-in | Sign-in | Email the user when their account signs in from a new country; lock the account for 15 minutes after 10 failed attempts | Advertising, location tracking | 90 days |
| Newsletter email address | Newsletter form (opt-in) | Send the monthly product newsletter | Anything else; removed on unsubscribe | Until unsubscribe |

## Cookies and analytics (from the cookie banner launch, December 2026)

| Data | Source | What we use it for | Not used for | Kept |
| --- | --- | --- | --- | --- |
| `tsl_session` cookie | Set at sign-in | Keep the user signed in | Analytics | 14 days |
| `tsl_csrf` cookie | Set on forms | Stop other sites from submitting forms in the user's name | Anything else | End of the browser session |
| `tsl_analytics_id` cookie, a random ID | Set only after "Accept analytics" on the banner | Link the pages and features one browser uses, so we can count how many people use each feature and see at which step people leave the sign-up form | Advertising; never shared outside Tessellate; no advertising or social media cookies are set | 13 months |
| Feature events (feature name, time, workspace plan) | Web app, only with the analytics cookie accepted | Decide which features to simplify or remove; the product team reviews the counts every quarter | Profiles of individual users | 13 months |

## Summaries (AI, from 2026-11-30)

Summaries writes a short summary of a board when someone in the workspace clicks "Summarise". It
is off until a workspace admin turns it on.

| Data | Source | What we use it for | Not used for | Kept |
| --- | --- | --- | --- | --- |
| Text of the board's sticky notes, documents and comments | The board, when "Summarise" is clicked | Sent to the summarisation model, which runs on our own servers in Frankfurt, to write the summary | Training the model; no outside AI provider receives it | Not kept by the model; the summary is stored with the board |
| Summaries and the thumbs up or down a user gives one | Users | Two engineers read the rated summaries every month and use them to change the instructions the model gets | Training the model | 12 months |
| Boards from workspaces that turned on "Help improve Summaries" | Opt-in, per workspace | Each month two engineers read 200 such boards with their summaries to check that the summaries are accurate (evaluation) | Training the model | The sample is deleted after the monthly check |

## Mobile app (iOS and Android, from 2026-12-01)

| Data | Source | What we use it for | Not used for | Kept |
| --- | --- | --- | --- | --- |
| Account and board data | As in the web app | As in the web app | As in the web app | As in the web app |
| Photos the user picks or takes with the camera | User adds to a board | Add the photo to that board | Anything else; the app reads only the photos the user picks | As board content |
| Push notification token | Device, after the user allows notifications | Send the notifications the user turned on (mentions, replies, board invitations) | Marketing | Until the user signs out or turns notifications off |
| Crash reports (device model, OS version, app version, the screen open, stack trace) | App, after a crash | Find and fix the crash | Linking to the user's identity beyond the account ID | 90 days |
| Screen recordings of the five onboarding screens | App, only for users who tap "Help us improve onboarding" | Find onboarding steps where people get confused, so we can change them | Advertising; recording stops after the last onboarding screen | 60 days |
