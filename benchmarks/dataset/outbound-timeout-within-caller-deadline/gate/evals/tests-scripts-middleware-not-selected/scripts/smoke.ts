// Smoke test after a deploy: bun scripts/smoke.ts https://quote-api.example.com
const base = process.argv[2];
const res = await fetch(`${base}/quote?sku=BOLT-M8&quantity=1&customer=c_204&region=CA`);
console.log(res.status, await res.text());
