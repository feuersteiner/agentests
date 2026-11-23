# The SSRF guard covers every redirect hop

The Python service code under `app/` checks the destination of every request it sends to a URL
that came from a user, on every redirect hop:

When the server fetches a URL supplied by a user, the destination check (no private, loopback, link-local or metadata addresses) must apply to every redirect hop and to the address actually connected to, so redirects are disabled or followed manually with re-validation.

- A URL supplied by a user is any URL that is not fixed in the code or the settings: a posted link, a profile website, an image or webhook URL, a link found in a fetched page, and the `Location` of a redirect from any of these.
- The destination check is `is_public_url(url)` in `app/net.py`, which accepts only an http or https URL whose host resolves to public addresses only; `is_public_address(address)` in the same file checks one address.
- `urllib.request.urlopen`, an opener built with urllib's default handlers, and `requests` without `allow_redirects=False` follow redirects by themselves, for POST requests too, and never call the check; `http.client` never follows them. A fetch either treats a redirect as a failure, or follows it in its own loop that checks every hop before sending its request and stops after a fixed number of hops.
- The address actually connected to is checked when the code checks the connected socket's peer address with `is_public_address` before sending the request, or connects only to an address it resolved and checked. Checking the URL and then letting the connection look the host up again leaves a gap.

Only files that send HTTP requests themselves are judged; tests are not.
