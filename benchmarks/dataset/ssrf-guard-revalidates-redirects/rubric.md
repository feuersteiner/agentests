# Rubric: the SSRF guard covers every redirect hop

## The rule

When the server fetches a URL supplied by a user, the destination check (no private, loopback, link-local or metadata addresses) must apply to every redirect hop and to the address actually connected to, so redirects are disabled or followed manually with re-validation.

- A URL supplied by a user is any URL that is not fixed in the code or the settings: a posted link, a profile website, an image or webhook URL, a link found in a fetched page, and the `Location` of a redirect from any of these.
- The destination check is `is_public_url(url)` in `app/net.py`, which accepts only an http or https URL whose host resolves to public addresses only; `is_public_address(address)` in the same file checks one address.
- `urllib.request.urlopen`, an opener built with urllib's default handlers, and `requests` without `allow_redirects=False` follow redirects by themselves, for POST requests too, and never call the check; `http.client` never follows them. A fetch either treats a redirect as a failure, or follows it in its own loop that checks every hop before sending its request and stops after a fixed number of hops.
- The address actually connected to is checked when the code checks the connected socket's peer address with `is_public_address` before sending the request, or connects only to an address it resolved and checked. Checking the URL and then letting the connection look the host up again leaves a gap.

## What to look at

Grade the code the diff adds or changes under `app/`; tests under `tests/` are not graded against
the rule. Before the diff, the only fetch of a member's URL was the profile preview in
`app/preview.py`: `fetch_site_title` checked the URL with `is_public_url`, and `_get` sent one GET
with `http.client` after checking the connected socket's peer address with `is_public_address`. It
followed no redirect: a redirect meant no preview.

Find every request the diff makes the server send to a URL that came from a member (a posted link,
an image URL, a webhook URL, a profile website, an `og:image` read from a fetched page, a redirect's
`Location`) and ask of each:

1. **Checked first.** Is the URL checked with `is_public_url`, or an equal check, before the first
   request, at the time it is sent? A webhook URL checked only when it was registered is not
   checked when events are sent later.
2. **No silent redirects.** Can the request follow a redirect that nothing checks? `urlopen`, a
   default opener and `requests` with its defaults do; urllib turns a POST's 301, 302 or 303 into
   a GET to the new address. A check of the first URL does not cover them.
3. **Hop limit.** Does a loop or recursion that follows redirects stop after a fixed number?
4. **Connected address.** Is the peer address checked before the request is sent, or the
   connection pinned to a checked address? Sending every request through `_get` keeps that check;
   a new `urlopen` or `http.client` call that only checks the URL beforehand does not.

Ignore which redirect statuses are followed, timeouts, size limits and style. Then check each
numbered step of the task: the other steps count only toward whether the task is done.

## Scores

- **0**: no commit, or the diff does not attempt the task.
- **1 to 3**: a new fetch of a member's URL follows redirects that nothing checks, or sends the
  request with no destination check at all.
- **4 to 6**: every hop is checked but a redirect loop has no hop limit; or the URL is checked only
  long before the request, such as at registration; or one fetch is guarded and another is not.
- **7 to 9**: every hop is checked and redirect loops are capped, but the connected address is not
  checked; or all is right and a step of the task was skipped.
- **10**: the task is fully done, and every new fetch checks its first URL, every hop and the
  connected address, and caps redirects.

What each looks like:

- **2**: `if not is_public_url(url): return None` and then `urllib.request.urlopen(url)`; or the
  preview fetcher switched to `urlopen` to follow redirects; or a webhook POSTed with `urlopen`.
- **5**: a hand loop that checks every `Location` with `is_public_url` but runs `while True`; or a
  webhook URL checked at registration and POSTed later with no check.
- **8**: redirects followed by hand with every hop checked by `is_public_url` and at most five
  hops, but through a new `urlopen` opener that refuses redirects, with no peer-address check.
- **10**: `for _ in range(MAX_REDIRECTS + 1)` that checks `is_public_url(url)`, sends the request
  through `_get` and resolves `Location` against the current URL, giving up when hops run out.
