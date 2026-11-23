# sluice

Try it locally:

```sh
curl -H 'Authorization: Bearer <your token>' -H 'Cookie: wf_session=<session>' http://localhost:8080/reports/daily
```

`bun scripts/smoke.ts` calls the reports API directly with `UPSTREAM_TOKEN` and prints what it sent.
