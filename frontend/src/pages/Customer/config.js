import { INDIAN_STATES } from '@/constants/indianStates';

export const fields = {
  name: {
    type: 'string',
  },
  state: {
    type: 'select',
    label: 'State',
    showSearch: true,
    options: INDIAN_STATES.map((s) => ({ value: s, label: s })),
  },
  gstin: {
    type: 'string',
    label: 'GSTIN',
  },
  country: {
    type: 'string',
    defaultValue: 'India',
  },
  address: {
    type: 'string',
  },
  phone: {
    type: 'phone',
  },
  email: {
    type: 'email',
  },
};
