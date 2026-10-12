/**
 * Pure decision logic for the PWA auto-update flow (unit tested).
 *
 * Goal: installed clients update themselves without user effort, but never at a moment that
 * would destroy unsaved work.
 */

/** Is the server running a different build than this page, and have we not already tried it? */
export function isNewVersion(localBuildId: string, remoteBuildId: string | null | undefined, alreadyAttempted: string | null): boolean {
  if (!remoteBuildId || remoteBuildId === localBuildId) return false;
  // Loop guard: if we already reloaded for this exact build and still run the old one
  // (e.g. a proxy served stale HTML), do not reload again in this browser session.
  return remoteBuildId !== alreadyAttempted;
}

export type ApplyDecision =
  /** Reload right away: nobody is looking at the page and nothing is unsaved. */
  | "apply-now"
  /** Visible page without unsaved work: show a short countdown, then apply. */
  | "countdown"
  /** Unsaved form data: never auto-apply; wait until the work is saved or the user chooses. */
  | "wait-for-user";

export function decideApply(state: { hidden: boolean; unsavedWork: boolean; postponed: boolean }): ApplyDecision {
  if (state.unsavedWork) return "wait-for-user";
  if (state.hidden) return "apply-now";
  if (state.postponed) return "wait-for-user";
  return "countdown";
}

export const UPDATE_CHECK_INTERVAL_MS = 5 * 60 * 1000;
export const COUNTDOWN_SECONDS = 10;
export const POSTPONE_MS = 30 * 60 * 1000;
