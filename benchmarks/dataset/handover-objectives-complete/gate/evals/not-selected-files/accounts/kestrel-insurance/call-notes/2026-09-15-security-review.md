# Kestrel Insurance: security review

15 September 2026, 60 minutes, video. Written up by June Park.

Kestrel: Grace Okafor (CISO), Tomasz Wrona. Corvid: June Park, Rafael Ortiz.

## Questionnaire and documents

- Grace's team has finished our security questionnaire. We shared the latest penetration test
  report under NDA.
- Single sign-on through Okta with SAML: supported on Enterprise.

## SOC 2

- Kestrel is going through its first SOC 2 Type II audit. The observation window runs from
  1 February to 30 April 2027, the auditor, Halden & Rook, does its fieldwork in May 2027, and
  the report is expected by 30 June 2027.
- Why it matters: two broker networks that place about 40% of Kestrel's premiums will only renew
  their distribution agreements in July 2027 if Kestrel has a SOC 2 Type II report.
- What Grace needs from the CI/CD platform: an approval recorded for every production deploy, and
  the audit log exported every month to their evidence store. Today about half of the Bamboo
  deploys skip the change ticket, and the readiness assessment in June flagged it.
- For Grace, success is a report with no exceptions on change management, which means every
  production deploy in the window has a recorded approval.
- Dates she gave us: approval rules on every production pipeline by 29 January 2027, before the
  window opens; the first monthly audit-log export, for February, on 5 March 2027; and the
  evidence pack to Halden & Rook by 7 May 2027.

## Next steps

- Send the approval-rules and audit-log documentation to Grace (June).
