# Ledgerline content

The words Ledgerline sends to customers outside the app: emails, blog posts and the replies our
support team sends. Ledgerline is a payroll app for small UK employers: it runs their payroll and
pays their employees' salaries.

## Layout

- `emails/`: emails to employers, one Markdown file each, with the subject and preheader in the front matter. Placeholders are written `{{name}}`.
- `content/blog/`: posts for the Ledgerline blog, one Markdown file each.
- `docs/`: notes from the engineering, payments and compliance teams, the source of facts for anything we write. Internal, never shown to customers.
- `comms.config.json`: the sender, the emails with their triggers, the blog posts and the support macros.
- `scripts/`: small Node helpers run before anything is published.

## Checks

```sh
npm test          # unit tests of the scripts
npm run check     # lists the placeholders used in emails/ and support/macros/
```

Nothing needs installing: the scripts use Node 22 built-ins only.

## Support

Questions about this repository go to #content on Slack. Customers reach us at
support@ledgerline.example.
