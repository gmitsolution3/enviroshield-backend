export const CONTACT_STATUS = {
  NEW: "new",
  CONTACTED: "contacted",
  QUALIFIED: "qualified",
  SITE_VISIT: "site-visit",
  PROPOSAL_SENT: "proposal-sent",
  WON: "won",
  LOST: "lost",
} as const;

export type TContactStatus =
  (typeof CONTACT_STATUS)[keyof typeof CONTACT_STATUS];

export const CONTACT_STATUS_TRANSITIONS: Record<
  TContactStatus,
  readonly TContactStatus[]
> = {
  [CONTACT_STATUS.NEW]: [CONTACT_STATUS.CONTACTED],
  [CONTACT_STATUS.CONTACTED]: [
    CONTACT_STATUS.QUALIFIED,
    CONTACT_STATUS.LOST,
  ],
  [CONTACT_STATUS.QUALIFIED]: [
    CONTACT_STATUS.SITE_VISIT,
    CONTACT_STATUS.PROPOSAL_SENT,
    CONTACT_STATUS.LOST,
  ],
  [CONTACT_STATUS.SITE_VISIT]: [
    CONTACT_STATUS.PROPOSAL_SENT,
    CONTACT_STATUS.LOST,
  ],
  [CONTACT_STATUS.PROPOSAL_SENT]: [
    CONTACT_STATUS.WON,
    CONTACT_STATUS.LOST,
  ],
  [CONTACT_STATUS.WON]: [],
  [CONTACT_STATUS.LOST]: [],
} as const;

export const getAllowedContactStatusTransitions = (
  currentStatus: TContactStatus,
): readonly TContactStatus[] => {
  return CONTACT_STATUS_TRANSITIONS[currentStatus] ?? [];
};

export const isAllowedContactStatusTransition = (
  currentStatus: TContactStatus,
  nextStatus: TContactStatus,
): boolean => {
  const allowed = getAllowedContactStatusTransitions(currentStatus);
  return (allowed as readonly string[]).includes(nextStatus);
};

export const CONTACT_SOURCE = {
  WEBSITE: "website",
  PHONE: "phone",
  REFERRAL: "referral",
  OTHER: "other",
} as const;

export const CONTACT_PROJECT_TYPE = {
  RESIDENTIAL: "residential",
  COMMERCIAL: "commercial",
  INDUSTRIAL: "industrial",
  WAREHOUSE: "warehouse",
  FACTORY: "factory",
  HOSPITAL: "hospital",
  SCHOOL: "school",
  HOTEL: "hotel",
  OFFICE: "office",
  SHOPPING_MALL: "shopping-mall",
  SPORTS_FACILITY: "sports-facility",
  OTHER: "other",
} as const;

export const CONTACT_PROJECT_TIMELINE = {
  IMMEDIATE: "immediate",
  WITHIN_ONE_MONTH: "within-1-month",
  ONE_TO_THREE_MONTHS: "1-3-months",
  THREE_TO_SIX_MONTHS: "3-6-months",
  SIX_PLUS_MONTHS: "6-plus-months",
  NOT_DECIDED: "not-decided",
} as const;

export const CONTACT_AREA_UNIT = {
  SQFT: "sqft",
  SQM: "sqm",
} as const;
