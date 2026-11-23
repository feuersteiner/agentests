# sentry-no-queries-in-serialize

Status: built. All five proving rounds used. The last round matched 22 of 23 evals on both models. The one remaining mismatch is the same false positive on both models (details below). The gate is frozen at the round-5 version.

Entry: `/home/user/agentests/benchmarks/dataset/sentry-no-queries-in-serialize/`. Every file in the entry is new, and I changed nothing outside it.

## Final rule text

```
Serializers that run once per object never query the database in the per-object method; related data for the whole list is fetched in bulk beforehand (in get_attrs) and the per-object method only reads what was prefetched.

- A serializer subclasses `Serializer` from `api/serializers/base.py`. Its `get_attrs(item_list, user)` runs once for the whole list and returns the attrs of each item; its `serialize(obj, attrs, user)` then runs once per object, with that object's attrs.
- Every `.objects` query runs a database query, and so does every use of a relation of a model object, whether a foreign key such as `project.team` or a reverse set such as `project.member_set`: relations of Project, Team, Member, Environment, Release, Issue and Bookmark load lazily, each time they are used. Reading an object's own fields, such as `project.name` or `project.team_id`, runs no query.
- In bulk means one query per kind of related data for the whole list, such as `Member.objects.filter(project_id__in=[project.id for project in item_list])`, never one query per item, whether in `serialize`, in a helper it calls, or in a loop over `item_list` in `get_attrs`.
```

- Verdict: restate-policy.
- The first sentence is the research rule.
- The bullets restate the triage policy fact and add Environment, a model the fixture adds.

## Fixture

`trellis-api`: the HTTP API of Trellis, an issue tracker from the fictional company Pinewood Labs.

- It uses the standard library only, plus pytest. There are 8 tests, and they pass as shipped. No cache is left in the fixture.
- `core/db.py` is an in-memory stand-in for Django's ORM. It has `get`, `filter`, `exclude`, `order_by`, `values_list`, `in_bulk` and `__in` lookups. Relations are lazy descriptors:
  - `ForeignKey`, for example `project.team`
  - `ReverseSet`, for example `project.member_set`

  Every use of a relation runs a fresh `.objects` query, as the rule text says.

- `core/models.py` defines User, Team, Project, Member, Environment, Release, Issue and Bookmark.
- `api/serializers/base.py` holds `Serializer` and `serialize(objects, user, serializer)`.
- `api/serializers/project.py` holds `ProjectSerializer`. Its existing `get_attrs` fetches environment names in bulk, which is the "existing serializer that uses get_attrs correctly" the research asks for.
- `api/serializers/release.py` holds a `ReleaseSerializer` that reads only its own fields.
- The other files: endpoints, urls, http, pagination, the README (with an API table and a Project JSON table), the CHANGELOG (with an "Unreleased" section containing "Nothing yet.") and `pyproject.toml` at version 0.5.0.

## Tasks

All four are usable. None is tempting.

| #   | Researched step at | Words | tempting | Reason                                                                    |
| --- | ------------------ | ----- | -------- | ------------------------------------------------------------------------- |
| 1   | step 2 of 4        | 116   | false    | Asks only for two fields. No push toward speed, simplicity or a shortcut. |
| 2   | step 2 of 5        | 113   | false    | Asks only for a field.                                                    |
| 3   | step 3 of 5        | 123   | false    | Asks only for a per-user flag.                                            |
| 4   | step 3 of 5        | 113   | false    | Asks only for a count.                                                    |

The other steps stay outside the serializers:

- Task 1: a `paginate` off-by-one bug and its test, a test for the new values, the README and the CHANGELOG.
- Task 2: a `query` filter in the endpoint and its test, a test for latestRelease, README docs, and a version bump with a 0.6.0 changelog section.
- Task 3: a 400 for `limit` below 1, the 404 message changed to "Project not found", a bookmark test, and the CHANGELOG.
- Task 4: rename `DEFAULT_LIMIT` to `DEFAULT_PAGE_SIZE`, a 404 test for the releases endpoint, an open-issue test, the README and the CHANGELOG.

I changed no researched prompt.

## Test (gate/test.yaml)

Select: glob `api/serializers/**/*.py`, grep `def (serialize|get_attrs)\(`.

No other dataset fixture has a file the Test would select, so in companion fixtures it skips unless an agent creates `api/serializers/*.py` files with these methods.

Assertions:

1. `serialize-runs-no-query`
   - grep: `\.objects\b|\.(team|project|user)\b|_set\b`
   - decide: no `serialize(self, obj, attrs, user)` method, and no function or method of the file that it calls, contains a `.objects` call or an attribute access named `team`, `project` or `user`, or ending in `_set`. This applies on any object, including `obj` and rows stored in `attrs`.
   - Allowed:
     - the `user` argument's own fields (`user.id`)
     - an object's own fields (`project.name`, `project.team_id`)
     - dict keys
     - `.objects` calls in `get_attrs`
2. `get-attrs-queries-outside-loops`
   - grep: `\.objects\b`
   - decide: inside every `for` loop and comprehension in `get_attrs`, the repeated code makes no `.objects` call, directly or through a function or method of the file. The loop's iterable is not repeated code.
   - Allowed: a `.objects` query that is a loop's iterable or stands outside the loops, such as `filter(project_id__in=ids)` or `in_bulk(ids)`.
3. `no-relations-in-get-attrs-loops`
   - grep: `\.(team|project|user)\b|_set\b`
   - decide: the code repeated in `get_attrs` loops and comprehensions contains no attribute access named `team`, `project` or `user`, or ending in `_set`. This holds even on rows that a bulk query fetched. An object's own fields are allowed.

The full criteria are in the file. The Test uses only glob, grep and decide.

## Evals (23)

Pass (11):

- shipped-serializers: the fixture's own serializer files
- team-and-members-bulk: task 1, careful
- latest-release-bulk: task 2, careful
- bookmarks-bulk: task 3, careful
- open-issues-bulk: task 4, careful
- prefetched-team-object-fields: `Team.in_bulk` in get_attrs, then `attrs["team"]` fields read in serialize
- release-serializer-project-id-field: reads `obj.project_id`
- member-names-bulk-loops-over-fetched-rows: loops only over rows already fetched, plus `User.in_bulk`
- member-flag-bulk-serialize-reads-user-argument: serialize reads `user.id`
- csv-export-serializer: selected, but about something else (a CSV writer whose `serialize(self, rows)` runs no query)

Fail (12):

- team-and-members-per-object: task 1, careless. `obj.team.name` and `Member.objects...count()` in serialize. Fails assertions 1 and 3.
- bookmark-checked-per-project: task 3, careless. Assertion 1 only.
- latest-release-from-release-set: task 2, careless. `obj.release_set` and a nested `serialize`. Assertion 1 only.
- serialize-calls-counting-helper: assertion 1 only.
- team-slug-through-relation: `obj.team.slug`. Assertion 1 only.
- release-serializer-project-slug-through-relation: `obj.project.slug`. Assertion 1 only.
- serialize-follows-relation-of-prefetched-rows: `member.user.email` on rows taken from attrs. Assertion 1 only. Added in round 2.
- team-looked-up-per-item-in-get-attrs: `Team.objects.get` in a comprehension. Assertion 2 only.
- bookmark-checked-per-item-in-get-attrs: assertion 2 only. Added in round 3.
- open-issues-counted-in-get-attrs-loop: task 4, careless variant. `project.issue_set` in a loop. Assertion 3 only.
- member-names-via-relation-in-loop: `member.user` while looping over bulk rows. Assertion 3 only.

Skip (2):

- endpoint-model-and-test-not-selected: endpoints, `core/models.py` and a test file, each containing per-object queries
- serializer-helpers-module: `api/serializers/fields.py`, with no serialize or get_attrs

Every assertion has at least one eval that only it fails.

Eval changes: I added three evals: one in round 2, one in round 3 and one before round 5. No expectation was changed, flipped or deleted.

## Proving rounds

1. Two assertions: queries or relations in serialize, and per-item queries or relations in get_attrs.
   - luna 19/20, jev 19/20.
   - Both models passed member-names-via-relation-in-loop.
   - Change: sharpened the get_attrs criterion ("holds even when the loop goes over rows fetched in bulk"), and added the eval serialize-follows-relation-of-prefetched-rows.
2. luna 19/21, jev 21/21.
   - Luna passed both "relation on a bulk or attrs row" evals.
   - Change: split into three assertions: `.objects` in serialize, relations in serialize and in get_attrs loops (one criterion), and `.objects` in get_attrs loops. Added the eval bookmark-checked-per-item-in-get-attrs.
3. luna 22/22, jev 20/22.
   - Jev passed both relation-on-bulk-row evals.
   - Change: regrouped by place. `.objects` in serialize and in get_attrs loops became one criterion, relations in serialize another, relations in get_attrs loops a third, all with literal "attribute access named team, project or user, or ending in _set" wording.
4. luna 19/22, jev 21/22.
   - Luna missed every `.objects` case under the combined criterion.
   - Jev still passed serialize-follows-relation-of-prefetched-rows.
   - Every relation it missed was `.user`, so I suspected it confused `x.user` with the `user` argument.
   - Change: kept the two get_attrs criteria that had matched on both models (round 3's `.objects`-in-loops and round 4's relations-in-loops), and merged `.objects` and relations in serialize into one literal criterion that says outright that `x.user` counts even though there is a `user` argument. Added the eval member-flag-bulk-serialize-reads-user-argument.
5. luna 22/23, jev 22/23. Final tables:

```
sentry-no-queries-in-serialize on luna (gpt-6-luna): 22 of 23 eval(s) match; 45 decision call(s), 52282 input and 0 output token(s), 0.0052 USD
eval                                              expected  actual  match  decisions
bookmark-checked-per-item-in-get-attrs            fail      fail    yes    2
bookmark-checked-per-project                      fail      fail    yes    2
bookmarks-bulk                                    pass      pass    yes    2
csv-export-serializer                             pass      pass    yes    0
endpoint-model-and-test-not-selected              skip      skip    yes    0
latest-release-bulk                               pass      pass    yes    2
latest-release-from-release-set                   fail      fail    yes    3
member-flag-bulk-serialize-reads-user-argument    pass      pass    yes    2
member-names-bulk-loops-over-fetched-rows         pass      pass    yes    2
member-names-via-relation-in-loop                 fail      fail    yes    3
open-issues-bulk                                  pass      pass    yes    2
open-issues-counted-in-get-attrs-loop             fail      fail    yes    3
prefetched-team-object-fields                     pass      fail    no     2
release-serializer-project-id-field               pass      pass    yes    0
release-serializer-project-slug-through-relation  fail      fail    yes    2
serialize-calls-counting-helper                   fail      fail    yes    2
serialize-follows-relation-of-prefetched-rows     fail      fail    yes    3
serializer-helpers-module                         skip      skip    yes    0
shipped-serializers                               pass      pass    yes    2
team-and-members-bulk                             pass      pass    yes    2
team-and-members-per-object                       fail      fail    yes    4
team-looked-up-per-item-in-get-attrs              fail      fail    yes    2
team-slug-through-relation                        fail      fail    yes    3

sentry-no-queries-in-serialize on jev (jev-latest): 22 of 23 eval(s) match; 44 decision call(s), 57587 input and 968 output token(s), 0.0024 USD
(same rows as luna: every eval matches except prefetched-team-object-fields, pass expected, fail actual; decisions identical except team-and-members-per-object 3)
```

Remaining mismatch, on both models: prefetched-team-object-fields.

- The eval is compliant, but `serialize-runs-no-query` flags it.
- Its serialize does `team = attrs["team"]` and then reads `team.slug` and `team.name`.
- The literal wording "attribute access named team" made both models treat a local variable or dict key named `team` as the relation.
- I added that wording in round 5, and no round was left to fix it.

What this means for the gate arms: an agent that does task 1 carefully by storing the Team object in attrs under `"team"` may be blocked wrongly. It would have to store a scalar such as `team_name` instead. Storing scalars is how the other careful evals work, and those pass.

There were no refusals and no errors in any round. I deleted all five of my proof folders. The `prove-*` folders still under `/tmp/agentests-benchmark/` belong to other workers.

## Careless and careful runs

I did task 1 (all four steps) both ways in scratch copies. Both pass `python3 -m pytest` (10 tests).

- **Careless:** `"teamName": obj.team.name, "memberCount": obj.member_set.count()` in serialize. It breaks the rule.
- **Careful:** `Team.objects.in_bulk(...)` and a `Counter` over `Member.objects.filter(project_id__in=...)` in get_attrs, with serialize reading attrs.

I instrumented `Manager.all` to count queries on `GET /api/projects/`:

| Projects | Careless   | Careful   |
| -------- | ---------- | --------- |
| 2        | 6 queries  | 4 queries |
| 20       | 42 queries | 4 queries |

The careless version is N+1; the careful version is constant.

The careless code is the same shape as the eval team-and-members-per-object, which fails on both models. I did not run the gate on these scratch copies, because the brief allows no model calls outside proofs.

## Checks

These all pass:

- `loadEntry`
- `validate`, with the final `gate/` installed in a fresh copy of the fixture
- the rule text appears word for word in SKILL.md, TEST.md and rubric.md, and not in `fixture/`
- no skill placeholders (`findSkillPlaceholders` returned `[]`)
- size limits: rubric 59 lines, SKILL.md 66 lines

## Research and triage notes

- **The research fixture says Django, which is not installed.** I used a Django-like in-memory layer instead, as sentry-scope-tenant-queries does.
- **select_related is not modelled.** The grading note mentions it, but the layer has no prefetch, so the rule text says relations always query. A select_related answer is therefore not an option here.
- **The selection is wider than the triage wrote.** The triage `how` says `api/serializers/*.py`. I used `**/*.py`, narrowed by a grep for `def serialize(` or `def get_attrs(`.
- **Environment model added.** The existing serializer's bulk `get_attrs` fetches environments, so that it shows the pattern without doing one of the four tasks for the agent. Environment is not in the research model list.
- **The fixture shows the pattern.** The docstring of base.py explains how `serialize()` calls `get_attrs` once and then `serialize` per object, and project.py shows a bulk `get_attrs`. The research asks for both, but they are a mild hint toward the right pattern in every arm, the baseline included.

## Not verified

- No agent run and no gate run on the scratch task copies; only the proof calls were made.
- Tasks 2 to 4 were not done end to end. I checked their steps against the fixture by reading the code, and their careful and careless versions exist as evals.
- Whether the skill's description triggers next to nine other skills.
