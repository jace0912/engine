// Copy + resources shown on the Safety Override screen. Calm, non-terminal,
// and never an instruction to start, stop, or change any treatment or care.
//
// Phase 1 placeholders: these resources are intentionally generic so they are
// safe everywhere. A production build must localise them to the user's region.

export interface SafetyResource {
  id: string;
  label: string;
  detail: string;
}

export const safetyHeadline = 'Let’s get you to someone who can help.';

export const safetyBody =
  'This tool is paused for now. Your safety comes first, and reaching a person is the right next step.';

export const safetyResources: SafetyResource[] = [
  {
    id: 'emergency',
    label: 'If you are in immediate danger',
    detail: 'Call your local emergency number now.',
  },
  {
    id: 'crisis_line',
    label: 'If you need to talk to someone',
    detail: 'Contact a crisis line or helpline in your area.',
  },
  {
    id: 'person',
    label: 'If you can',
    detail: 'Reach out to one person you trust and tell them how you are feeling.',
  },
];

export const safetyFooter = 'This session stays here for now. You do not need to do anything else.';
