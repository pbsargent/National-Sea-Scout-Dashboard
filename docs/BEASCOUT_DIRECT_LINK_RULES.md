# Building unit-specific BeAScout links

Use these rules when building, refreshing, or publishing links to individual units on BeAScout. Verified with Capitol Area Council data on October 10, 2026.

## Required source data

Use an authoritative unit report such as my.Scouting's `PinDataReport.csv`. Relevant fields are:

- `unitid`: the numeric internal unit identifier, **not** the displayed unit number.
- `unitname`: program, unit number, and sometimes gender designation.
- `districtname`: helps distinguish units with the same program and number.
- `zipcode`: the unit's ZIP code; use the first five digits.
- `pinstatus`: context only; it does not prove whether a direct page is available.

Reports may use Windows-1252 encoding. Try UTF-8 with BOM support first, then Windows-1252 if decoding fails.

## Match the unit before building a link

Prefer an exact internal unit ID match when the destination has that identifier. Otherwise match program and numeric unit number, corroborated by council and district. Normalize leading zeros and spacing: `Pack146` and `Pack 0146` have the same program and number.

Use gender, organization, and location to resolve remaining ambiguity. Do not silently select the first candidate. A bare number such as `111` is insufficient without a known program. Leave unmatched or ambiguous destination rows unchanged and report them.

## Resolve the current direct URL

Build this resolver URL using the source values:

```text
https://beascout.scouting.org/list/?zip=ZIP5&unitID=NUMERIC_UNIT_ID
```

Follow its HTTP redirects. The current canonical unit page has this form:

```text
https://beascout.scouting.org/units/UUID
```

The UUID cannot be calculated from the displayed unit number or numeric unit ID. Obtain it from BeAScout's redirect; never invent it. The resolver worked without a program parameter during the October 10, 2026 update.

Example:

```text
Source: Pack 0002, unitid 25921, ZIP 78731
Resolver: https://beascout.scouting.org/list/?zip=78731&unitID=25921
Canonical: https://beascout.scouting.org/units/5d8f6736-4bd3-47ec-8d81-095707dc2dc2
```

One command to resolve a link:

```sh
curl -Ls --max-time 30 -o /dev/null \
  -w '%{url_effective}\n%{http_code}\n' \
  'https://beascout.scouting.org/list/?zip=78731&unitID=25921'
```

## Verification and failure handling

1. Require a successful HTTP response and a final URL on `beascout.scouting.org` whose path is `/units/UUID`.
2. Check the unit name, council, and location on the returned page where available. HTTP 200 alone does not establish the unit's identity.
3. If the result is the home page, a `/search` page, a timeout, or another non-unit URL, retry with lower concurrency. In the October 10 run, 20 initial non-unit results resolved correctly on a second pass with concurrency reduced from six to three. Treat this as an observed retry behavior, not a guarantee.
4. If a unit page still cannot be confirmed, leave the existing destination value unchanged and record the reason. Do not write a general search URL into a unit-specific link field.
5. Do not reject or accept a link solely because the report says `Active` or `Inactive`; verify the live URL.

Use modest concurrency and bounded retries. If BeAScout changes its routes or stops resolving numeric IDs, inspect its current public interface before making bulk updates.

## Writing links to a destination

Save the canonical `/units/UUID` URL once verified. This is the unit's information page; application links such as `/registration?unitId=UUID` serve a different purpose.

Before writing, inspect the destination's actual field type and identifier. For Monday.com, a text column takes a URL string, while a link column takes an object such as `{"url":"https://...","text":"BeAScout"}`. Column IDs are board-specific; never copy an ID from a different board.

Update only the requested link field. Keep an audit with destination item ID, unit identity, source numeric unit ID, previous link, new link, and outcome. Read the destination back and compare every updated value with the intended URL. Report successful updates and unresolved rows separately.

## Applying this rule in another project

Copy this file into that project's `docs` folder and add the following to its `AGENTS.md`:

> Before building or updating unit-specific BeAScout links, read `docs/BEASCOUT_DIRECT_LINK_RULES.md`. Use authoritative internal unit IDs, resolve and verify current canonical unit URLs, leave ambiguous or unresolved rows unchanged, and read back any written values.
