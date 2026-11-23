---
subject: Step through a failed request on your Cloudnest app
preheader: Trace replay in the Driftlog add-on, with 60 days of the Team plan free.
---

Hello {{ first_name }},

From 1 December the Driftlog add-on in the Cloudnest marketplace supports trace replay. When a
request to your Cloudnest app fails, you can open it in Driftlog and step through it span by
span, from the browser to the database.

- **What you see.** The timing, the request and response payloads, and the log lines at each
  span. The replay includes the Cloudnest router span, so you see the time a request spent in
  the router.
- **Which requests.** Those that end in a 5xx response or run longer than the latency threshold
  you set.
- **What it takes.** Install the add-on and it sets `DRIFTLOG_KEY` and forwards your logs. For
  traces and replays, add the Driftlog SDK to your app.

Cloudnest customers get 60 days of the Driftlog Team plan free with the code `CLOUDNEST60`, for
workspaces created by 31 January 2027. After 60 days the workspace moves to the Free plan unless
you add a payment method.

[Set up Driftlog on Cloudnest](https://driftlog.example/cloudnest)

The Cloudnest and Driftlog teams
