export const CONTACT_STATUS = {
  NEW: "new",
  CONTACTED: "contacted",
  QUALIFIED: "qualified",
  SITE_VISIT: "site-visit",
  PROPOSAL_SENT: "proposal-sent",
  WON: "won",
  LOST: "lost",
} as const;

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
