// Window Detection options. Low-pressure, fixed text. No timers, no countdown,
// no pressure. The user simply reports whether a small opening is here yet.

export type WindowEvent = 'WINDOW_MORE_CAPACITY' | 'WINDOW_EXTERNAL_CHANGE' | 'WINDOW_NONE';

export interface WindowOption {
  id: string;
  label: string;
  event: WindowEvent;
}

export const windowHeadline = 'No rush. We are just watching for a small opening.';

export const windowOptions: WindowOption[] = [
  { id: 'more_capacity', label: 'I have a little more capacity now.', event: 'WINDOW_MORE_CAPACITY' },
  { id: 'external_change', label: 'Something or someone outside me changed.', event: 'WINDOW_EXTERNAL_CHANGE' },
  { id: 'not_yet', label: 'Not yet.', event: 'WINDOW_NONE' },
];
