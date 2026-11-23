# Data inventory

Internal. Our record of the personal data Tessellate Ltd holds, why, on what lawful basis and for
how long. The privacy notice, `website/privacy.md`, is written from this record. Owner: the privacy
team, privacy@tessellate.example. Last reviewed: 2026-06-10.

## Processing activities

| Activity                  | People                        | Data                                                  | Lawful basis                   | Kept for                                 |
| ------------------------- | ----------------------------- | ----------------------------------------------------- | ------------------------------ | ---------------------------------------- |
| Accounts and the app      | Customers and their staff     | Name, work email, password hash, role, rota data      | Contract                       | Life of the account plus 30 days         |
| Billing                   | Customers' billing contacts   | Billing contact, company address, card's last 4 digits | Contract; legal obligation    | Invoices 7 years                         |
| Support                   | Anyone who writes to support  | Messages and replies                                  | Contract                       | 2 years after the conversation closes    |
| Product analytics         | App users                     | Usage events, device and browser                      | Legitimate interests           | 13 months                                |
| Fraud prevention          | App users and visitors        | IP address, sign-in times, failed sign-ins and payments | Legitimate interests         | 12 months                                |
| Marketing emails          | Customers                     | Name, work email                                      | Legitimate interests (soft opt-in) | Until they unsubscribe or the account closes |
| Shift Notes newsletter    | Anyone who signs up on the blog | Email address, first name                           | Consent                        | Until they unsubscribe                   |

## Notes on each activity

- **Product analytics.** We count which features are used and where people give up, to decide what
  to improve. Events are tied to the user's account ID, not to their name or email. Balancing test
  done 2026-02.
- **Fraud prevention.** We flag sign-ups from known bad IP ranges, sign-ins from a new country
  within an hour of another, and repeated failed card payments. Balancing test done 2026-02.
- **Marketing emails.** Product news and tips, at most two a month, to customers only. Every email
  has an unsubscribe link, and the app has a "Product news" switch under Settings > Notifications.
- **Shift Notes newsletter.** Monthly, sent to anyone who signs up with the form on our blog, a
  separate site. People who are not customers get only this. Every issue has an unsubscribe link.

## Processors

- Hosting provider: data centres in the UK and Ireland.
- Payment provider: takes card payments; holds the full card details.
- Email provider: sends app notifications, marketing emails and the newsletter.
