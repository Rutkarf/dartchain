/** Feuille de détails optionnelle — progressive disclosure, le panel existant reste. */

export interface StarConquestSheetState {
  open: boolean;
  kind: 'help' | 'details' | 'none';
}

export const STAR_CONQUEST_SHEET_CLOSED: StarConquestSheetState = {
  open: false,
  kind: 'none',
};

export function openStarConquestSheet(
  kind: Exclude<StarConquestSheetState['kind'], 'none'>
): StarConquestSheetState {
  return { open: true, kind };
}

export function closeStarConquestSheet(): StarConquestSheetState {
  return STAR_CONQUEST_SHEET_CLOSED;
}
