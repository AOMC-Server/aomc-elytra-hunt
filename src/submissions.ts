// What players send in for the maintainer to review: reports on whether a ship was where the app
// shows it, and their looted lists. Both go to the relay in relay/, which files them as GitHub issues.

import { issueFor, issueForShip, parseShipReport, parseSubmission, type ShipResult } from '../relay/src/validate';
import { $, fmt, xzText } from './dom';
import { cleanUsername } from './journeymap';
import { copyText } from './route-panel';
import { DEFAULT_SEED, onUsername, setUsername, state } from './state';
import type { Tracker } from './tracker';
import { cityId, type City } from './types';

export const ISSUES_URL = 'https://github.com/AOMC-Server/aomc-elytra-hunt/issues';
/**
 * Address of the relay that files looted-city submissions as GitHub issues (see relay/README.md).
 * While empty, the Submit button is hidden and players are pointed at GitHub instead.
 */
const SUBMIT_URL = 'https://aomc-looted-relay.sh4sh.workers.dev';

/** The accepted ship reports, published with the site. */
export async function loadShipReports(): Promise<{ missing?: string[]; found?: string[]; noCity?: string[] }> {
  try {
    const res = await fetch('./ship-reports.json');
    return res.ok ? await res.json() : {};
  } catch {
    return {};
  }
}

/**
 * A new GitHub issue from one of the templates in .github/ISSUE_TEMPLATE. The template adds the label
 * that /merge looks for, which players who are not collaborators cannot add themselves.
 */
function newIssueUrl(template: string, issue: { title: string; body: string }): string {
  const url = (body: string) =>
    `${ISSUES_URL}/new?template=${template}&title=${encodeURIComponent(issue.title)}&body=${encodeURIComponent(body)}`;
  // GitHub turns away very long addresses: a long list has to be pasted in instead.
  const full = url(issue.body);
  return full.length <= 8000 ? full : url('Paste here what the app copied.');
}

/** What these need from the rest of the app. */
export interface SubmissionsHost {
  tracker(): Tracker;
}

/** Wire up the report window and the Submit button. Returns what opens the report window for a city. */
export function initSubmissions(host: SubmissionsHost): { openReport(city: City, missing: boolean, found: boolean): void } {
  const mapNote = $('mapNote');

  /** Whether the app's own layout marks this city's ship as a tight fit, whatever has been reported since. */
  const wasUncertain = (city: City) => state.found.some((c) => c[0] === city.x && c[1] === city.z && c[2] === 2);

  /** Send a player's report on whether a city's ship was there, for the maintainer to review. */
  async function reportShip(city: City, result: ShipResult): Promise<void> {
    if (!SUBMIT_URL) {
      reportOnGithub(city, result);
      return;
    }
    mapNote.textContent = 'Sending your report…';
    try {
      const res = await fetch(SUBMIT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'ship',
          city: cityId(city),
          result,
          name: state.chatName,
          // Lets the maintainer see whether the app had already flagged this ship as doubtful.
          uncertain: wasUncertain(city),
        }),
      });
      const body = await res.json().catch(() => ({}));
      mapNote.textContent = res.ok ? 'Report sent for review. Thank you!' : (body.error ?? 'That did not go through. Please try again later.');
    } catch {
      mapNote.textContent = 'Could not reach the report service. Please try again later.';
    }
  }

  /** File a report by hand as a GitHub issue, already filled in: for when the relay is down or not set up. */
  function reportOnGithub(city: City, result: ShipResult): void {
    const parsed = parseShipReport({ kind: 'ship', city: cityId(city), result, name: state.chatName, uncertain: wasUncertain(city) });
    if (parsed.ok) window.open(newIssueUrl('ship-report.md', issueForShip(parsed.value)), '_blank', 'noopener');
  }

  // The little window for a report: pick what was found, give a username, then send.
  const reportBox = $('reportBox');
  const reportForm = $<HTMLFormElement>('reportForm');
  const reportName = $<HTMLInputElement>('reportName');
  let reportCity: City | null = null;
  /** Open the window for a city. `found` asks about a ship being present; otherwise about something missing. */
  /** Ask what the player found at a city. `missing` offers "no ship" and "no city"; `found` offers "the ship is here". */
  function openReport(city: City, missing: boolean, found: boolean): void {
    reportCity = city;
    $('reportWhere').textContent = `At ${xzText(city)}`;
    reportForm.reset();
    // Only the choices that fit are offered, with the first of them selected.
    for (const row of reportForm.querySelectorAll<HTMLElement>('.report-missing')) row.hidden = !missing;
    for (const row of reportForm.querySelectorAll<HTMLElement>('.report-found')) row.hidden = !found;
    reportForm.querySelector<HTMLInputElement>(`input[value="${missing ? 'missing' : 'found'}"]`)!.checked = true;
    reportName.value = state.chatName;
    reportBox.hidden = false;
    reportName.focus();
  }
  const closeReport = () => {
    reportBox.hidden = true;
    reportCity = null;
  };
  $('reportCancel').addEventListener('click', closeReport);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !reportBox.hidden) closeReport();
  });
  reportName.addEventListener('input', () => {
    reportName.value = cleanUsername(reportName.value);
  });
  reportForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const city = reportCity;
    const kind = new FormData(reportForm).get('reportKind');
    // Remembered for next time, and shared with the other places a username is asked for.
    setUsername(reportName.value);
    closeReport();
    if (city && (kind === 'missing' || kind === 'no-city' || kind === 'found')) void reportShip(city, kind);
  });
  $('reportGithub').addEventListener('click', () => {
    const city = reportCity;
    const kind = new FormData(reportForm).get('reportKind');
    setUsername(reportName.value);
    closeReport();
    if (city && (kind === 'missing' || kind === 'no-city' || kind === 'found')) reportOnGithub(city, kind);
  });

  // Sending in the looted list.
  const submitName = $<HTMLInputElement>('submitName');
  const submitBtn = $<HTMLButtonElement>('submitLooted');
  const submitNote = $('submitNote');
  $('submitBox').hidden = !SUBMIT_URL;
  $('submitFallback').hidden = !!SUBMIT_URL;
  // The JourneyMap username is the same person: start with it.
  submitName.value = state.chatName;
  submitName.addEventListener('input', () => {
    submitName.value = cleanUsername(submitName.value);
    setUsername(submitName.value);
  });
  onUsername(() => {
    if (document.activeElement !== submitName) submitName.value = state.chatName;
  });

  /** The player's looted cities to send, or null (with the reason shown) when there is nothing to send. */
  function toSubmit(): { cities: string[]; already: string[] } | null {
    if (state.seed !== DEFAULT_SEED) {
      submitNote.textContent = 'The shared list is only for the default server seed.';
      return null;
    }
    const already = host.tracker().ownAlready();
    const cities = [...new Set([...host.tracker().ownNew(), ...already])];
    if (!cities.length) {
      submitNote.textContent = 'Nothing new to submit: mark some ships as looted first.';
      return null;
    }
    return { cities, already };
  }

  submitBtn.addEventListener('click', async () => {
    const sending = toSubmit();
    if (!sending) return;
    const { cities, already } = sending;
    if (!confirm(`Send ${fmt(cities.length)} looted ${cities.length === 1 ? 'ship' : 'ships'} for review? Once accepted they show as looted for everyone.`)) return;
    submitBtn.disabled = true;
    submitNote.textContent = 'Sending…';
    try {
      const res = await fetch(SUBMIT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: submitName.value, cities, already }),
      });
      const body = await res.json().catch(() => ({}));
      submitNote.textContent = res.ok
        ? `Sent ${fmt(cities.length)} for review. They will show as looted for everyone once accepted.`
        : (body.error ?? 'That did not go through. Please try again later.');
    } catch {
      submitNote.textContent = 'Could not reach the submission service. Please try again later.';
    } finally {
      submitBtn.disabled = false;
    }
  });

  // The same list, filed by hand: copied, so it can be pasted into a GitHub issue however long it is.
  $('submitGithub').addEventListener('click', async () => {
    const sending = toSubmit();
    if (!sending) return;
    const parsed = parseSubmission({ name: submitName.value, ...sending });
    if (!parsed.ok) {
      submitNote.textContent = parsed.error;
      return;
    }
    const issue = issueFor(parsed.value);
    if (!(await copyText(issue.body))) {
      submitNote.textContent = 'Could not copy. Press Export looted and attach the file to a GitHub issue instead.';
      return;
    }
    submitNote.textContent = 'Copied. If GitHub did not open in a new tab, open a new issue there and paste it in.';
    window.open(newIssueUrl('looted.md', issue), '_blank', 'noopener');
  });

  return { openReport };
}
