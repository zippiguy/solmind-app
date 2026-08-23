# Suggested Waypoint Whole-Path Test Infrastructure

This folder owns test-only infrastructure for the future local authenticated
Suggested Waypoint whole-path proof under `CARRY-001` / `RPR-011`.

The current safety kernel is intentionally effect-free. It returns `null`
unless two exact local-effect interlocks are present, and after those
interlocks it accepts only:

- project `solmind-app`;
- Supabase API `http://127.0.0.1:54321`;
- database port `54322`;
- one separately owned loopback application port in `4100..4999`;
- one bounded `S03G-*` run identity; and
- the five closed synthetic role labels needed by the proof, including both
  unrelated-role directions and one ended-relationship actor.

It creates no client, principal, cookie, database row, process, file, provider
call, hosted request, deployment, or real-user effect. It reads no credential.
A caller can see the fixed interlock strings in source, so satisfying them is
necessary but never grants authority or replaces the active SolMind workflow
and current human authorization for any later effect.
A future separately assured runner must consume this kernel before credential
access and must still own fixture creation, isolated sessions, exact teardown,
zero-residue proof, and a final local reset.

## Local Auth fixture foundation

The test-only local fixture foundation is intentionally callable only through
`runWithSuggestedWaypointLocalAuthFixture`. It checks the safety kernel before
calling the supplied secret loader, then owns one bounded lifecycle:

1. reset the exact local database;
2. reject synthetic-email collisions;
3. create exactly five local Auth users by the supported Admin API;
4. bind their returned UUIDs to one fixed SolMind graph through SQL passed only
   in memory;
5. sign in through five non-singleton Supabase browser clients with separate
   in-memory cookie stores;
6. yield the role-isolated fixture only to its callback; and
7. clear sessions, delete the exact returned Auth UUIDs in reverse order, and
   perform the mandatory final local reset even after failure.

The foundation does not read environment values by itself, run Docker or
`psql`, create a browser context, write storage state, start Next.js, invoke a
product route, deliver a Suggested Waypoint, or claim the Lane G whole-path
proof. The later outer runner must inject the local reset and stdin-only SQL
effects, keep all credentials and cookie values in process memory, and emit
only fixed value-free result categories.

## In-memory Playwright session seam

The test-only Playwright seam converts the five fixture-owned SSR cookie jars
into five distinct browser contexts without a storage-state file. It rechecks
the exact HTTP `127.0.0.1` application origin and accepts only exact-host,
non-secure loopback cookies. It preserves every active chunk name and value,
normalizes only browser-usable Lax and Strict SameSite values, derives expiry only from
a positive `maxAge`, and rejects Domain, Partitioned, malformed, expired, or
ambiguous cookie options before a context is created.

The returned bundle owns all five contexts and closes them in reverse order.
It bounds each fixture session to 16 cookie chunks, 256-character names, and
8,192-character values. It emits only fixed failure categories and never writes
cookies, tokens, Auth UUIDs, storage state, traces, screenshots, or other
protected values. Distinct role-session objects and distinct in-memory cookie-set
digests prevent two roles from silently sharing one authenticated identity.
Concurrent close calls share one attempt, and a failed close remains retryable. The later
outer runner still owns the read-only authenticated-role proof, scenario
navigation, production-server lifecycle, and unconditional fixture teardown.

## Whole-path lifecycle orchestrator

The test-only orchestrator composes the safety kernel, local Auth fixture, five
in-memory Playwright contexts, one scenario callback, and cleanup in one closed
lifecycle. It reconstructs one stable environment from the already-validated
safety configuration so the fixture and browser layers cannot observe different
gate or origin values.

Browser contexts close first, then the owned browser closes, and only after the
callback returns does the fixture owner clear sessions, delete the exact Auth
users, and perform the final database reset. Cleanup failure dominates scenario
failure, and callers receive only fixed value-free error categories.

The orchestrator still does not load secrets itself, start Supabase or Next.js,
launch a browser without an injected owner, write credentials or browser state,
implement product assertions, or authorize effects. A later effectful driver
must supply those dependencies after the exact safety gates and current workflow
authority are present.

`createBrowser` owns any partially allocated browser process until it resolves
with a complete browser handle. If that factory rejects, it must settle
everything it created first because the orchestrator has no handle to close.
