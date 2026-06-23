// The five danger conditions shown by the First Check danger gate, plus the
// "none of these" option. Each condition maps to a SafetyFlag. Fixed text only.

import type { SafetyFlag } from '../state/types';

export interface DangerCondition {
  id: string;
  label: string;
  flag: SafetyFlag;
}

export const dangerConditions: DangerCondition[] = [
  {
    id: 'self_harm',
    label: 'I am thinking about ending my life, or hurting myself.',
    flag: 'suicide_self_harm',
  },
  {
    id: 'medical',
    label: 'There is a medical emergency happening right now.',
    flag: 'medical_emergency',
  },
  {
    id: 'substance',
    label: 'I have taken something and I do not feel in control.',
    flag: 'substance_beyond_control',
  },
  {
    id: 'child',
    label: 'A child is in danger right now.',
    flag: 'threat_to_child',
  },
  {
    id: 'violence',
    label: 'Someone is hurting me, or I am in danger from someone, right now.',
    flag: 'violence_abuse',
  },
];

export const noneOfThese = {
  id: 'none',
  label: 'None of these right now. Continue.',
};
