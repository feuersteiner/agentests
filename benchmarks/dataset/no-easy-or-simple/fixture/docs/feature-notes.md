# Feature notes

Internal notes from the feature teams. Facts here are checked; wording is not final.

## Publishing a form

- A new form starts as a draft. Drafts are only visible to workspace members.
- New form: Forms > New form, then pick a template or "Blank form". There are 14 templates.
- Fields are added from the left panel. A form needs at least one field before it can be published.
- Publish button is top right. On publish, Mapleforms asks who can respond: "Anyone with the link"
  or "People in my workspace".
- After publishing, the Share tab gives a link, a QR code and an embed snippet.
- Publishing again after an edit updates the live form; the link stays the same.
- Free plan: 3 published forms and 100 responses a month. Drafts are not counted.

## Webhooks

Available on the Team plan and above. Setup is six steps:

1. Open the form, then Settings > Integrations > Webhooks.
2. Click "Add endpoint" and enter the endpoint URL. It must be HTTPS and reachable from the public
   internet.
3. Choose the events to send: `response.created`, `response.updated`, `form.published`.
4. Copy the signing secret. It is shown once; if it is lost, the endpoint has to be rotated, which
   issues a new secret.
5. In the receiving server, verify each request: compute an HMAC-SHA256 of the raw request body
   with the signing secret and compare it with the `Mapleform-Signature` header.
6. Click "Send test event" and check the delivery log on the same page for a 2xx response.

Other facts:

- The endpoint must answer with a 2xx status within 10 seconds, or the delivery counts as failed.
- Failed deliveries are retried 5 times over 24 hours, then dropped. Mapleforms emails the
  workspace owner after the last failure.
- Up to 5 endpoints per form.
- Payloads are JSON. The delivery log keeps 30 days.

## Integrations page

- New top-level page at /integrations, for workspace owners and admins.
- Lists the workspace's connections across all forms: Slack, Google Sheets and webhooks at launch.
- Until a workspace has connected something the page is empty; the button on the empty page opens
  the "Add integration" dialog.
- Members without the admin role see the page but cannot add an integration.
- Slack and Google Sheets are on every plan; webhooks need the Team plan.

## Exports

- Responses export as CSV or XLSX from Responses > Export.
- Exports over 10,000 rows are emailed as a download link that expires after 7 days.
