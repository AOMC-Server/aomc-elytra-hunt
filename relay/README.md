# Relay

A small Cloudflare Worker (the free plan is enough) that does two jobs:

- **Looted-city submissions.** Lets players submit their looted cities from the
  app without a GitHub account. The app sends the list here; the relay files it
  as an issue on the repository.
- **Hourly webmap update.** Once an hour it starts the repository's "Update
  webmap data" workflow. GitHub's own timer for scheduled workflows often runs
  late or skips runs; Cloudflare's is punctual.

Nothing a player submits reaches the shared list by itself. Each submission is
an issue for a maintainer to review and merge.

## One-time setup

1. **Make a GitHub token.** On GitHub: Settings → Developer settings →
   Personal access tokens → Fine-grained tokens → Generate new token.
   - Repository access: *Only select repositories* → `aomc-elytra-hunt`.
   - Permissions → Repository permissions → **Issues: Read and write** (to
     file submissions) and **Actions: Read and write** (to start the webmap
     update).
   - Nothing else. Copy the token.
2. **Deploy the relay.** With a Cloudflare account:
   ```
   cd relay
   npx wrangler login
   npx wrangler deploy
   npx wrangler secret put GITHUB_TOKEN    # paste the token when asked
   ```
   `deploy` prints the relay's address, like
   `https://aomc-looted-relay.<your-subdomain>.workers.dev`.
3. **Point the app at it.** Put that address in `SUBMIT_URL` near the top of
   `src/main.ts`, then commit and push. The "Submit looted" button appears once
   it is set.

## Deploying from GitHub

Once set up, the relay is published for you: whenever relay code changes on
`main`, and whenever you press **Run workflow** on "Deploy the relay" in the
repository's Actions tab. No terminal needed.

One-time setup, so GitHub is allowed to publish to your Cloudflare account:

1. In the Cloudflare dashboard: My Profile → API Tokens → Create Token → use the
   **Edit Cloudflare Workers** template → create it, and copy the token.
2. Find your **Account ID** on the Workers & Pages overview page in the
   Cloudflare dashboard.
3. In the GitHub repository: Settings → Secrets and variables → Actions → New
   repository secret. Add `CLOUDFLARE_API_TOKEN` (the token) and
   `CLOUDFLARE_ACCOUNT_ID` (the ID).

`npx wrangler deploy` from `relay/` still works as before.

## Getting notified

Issues filed by the relay are created with your token, so GitHub counts them as
your own activity and does not notify you about them. The workflow in
`.github/workflows/notify-submission.yml` gets round that: when an issue with
the `map-submission` label is opened, the Actions bot comments on it and
mentions the repository owner, which does send a notification.

## Handling a submission

Reply to the issue with a comment that starts with `/merge`. The workflow in
`.github/workflows/accept-submission.yml` then adds the cities to
`public/looted.json`, commits it as `add looted from #<number>`, republishes the
site, and closes the issue with a note of how many cities were new. It only
acts on comments from the repository owner or a collaborator, and only on
issues carrying the `map-submission` label.

To reject a submission, just close the issue.

By hand, the same thing is:

```
npm run looted -- --issue 12    # merge issue #12 into public/looted.json
git commit -am "add looted from #12" && git push
```

## Ship reports

Players can also report, from a city's right-click menu, that its ship was
there, that the city had no ship, or that there was no End City at all. The relay files each report as an issue with the
`ship-report` label. Replying `/merge` records it in
`public/ship-reports.json`: "no ship" and "no End City" reports remove the city from the routes
for everyone (they are stored separately), and a "ship found" report clears its
"ship uncertain" mark. By
hand, the same thing is `npm run ship-report -- --issue 12`, or
`npm run ship-report -- missing -554792,8712`.

After changing the relay's code, run `npx wrangler deploy` from `relay/`.

## Hourly webmap update

`wrangler.toml` has a timer (`[triggers]`) set to 23 minutes past each hour. When
it fires, the relay asks GitHub to run `update-webmap.yml`. For that to work the
token needs **Actions: Read and write** on the repository. If the token was made
before this was added, edit it on GitHub (Settings → Developer settings →
Fine-grained tokens → the token → Edit) and add that permission; the token
itself stays the same, so nothing needs re-entering. Then run
`npx wrangler deploy` from `relay/`.

To check it: `npx wrangler tail` shows "Started update-webmap.yml" when the
timer fires, and the run appears under the repository's Actions tab as started
by you.

## Label

Every submission is filed with the `map-submission` label, which must exist in
the repository. List them with
`gh issue list --label map-submission`. After changing the relay's code, run
`npx wrangler deploy` again from `relay/` for it to take effect.

## Limits

- Only the app's own site (`ALLOWED_ORIGIN` in `wrangler.toml`) may call it.
- One submission per visitor address per minute, at most 4,000 cities each.
- At most 30 issues an hour and 100 a day in total, whoever sends them
  (`MAX_PER_HOUR` and `MAX_PER_DAY` in `src/validate.ts`). The relay counts
  its own recent issues on GitHub before filing another, so the cap holds
  across all of Cloudflare's locations and needs no extra storage. Only issues
  filed under its token's account count, so issues players post on GitHub by
  hand do not use it up. Once it is
  reached, players are asked to try again later.
- Only coordinates and a username-like name are accepted; no free text.
