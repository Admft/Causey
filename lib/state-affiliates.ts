/**
 * USCF state affiliate calendars — scrape roadmap + public listing page.
 * Keep data/state-affiliates.txt in sync when editing.
 */

export type AffiliateTier = 1 | 2 | 3 | 4;

export type StateAffiliate = {
  region: string;
  org: string;
  abbreviation?: string;
  href: string;
  note?: string;
  tier: AffiliateTier;
};

export const AFFILIATE_TIER_LABELS: Record<
  AffiliateTier,
  { title: string; blurb: string }
> = {
  1: {
    title: "Tier 1 — The Big Five",
    blurb: "Highest volume, complex scholastic pathways, major prize-fund opens.",
  },
  2: {
    title: "Tier 2 — Major powerhouses",
    blurb: "Dense circuits with explicit state-championship qualification rules.",
  },
  3: {
    title: "Tier 3 — Active mid-size",
    blurb: "Consistent scenes and regional scholastic qualifiers into state events.",
  },
  4: {
    title: "Tier 4 — Rest of the country",
    blurb:
      "Lower volume, still required for Denker, Barber, Rockefeller, Haring, and related national invitationals.",
  },
};

export const STATE_AFFILIATES: StateAffiliate[] = [
  // Tier 1
  {
    region: "New York",
    org: "New York State Chess Association",
    abbreviation: "NYSCA",
    href: "https://nysca.net",
    tier: 1,
  },
  {
    region: "California (North)",
    org: "CalChess",
    href: "https://calchess.org",
    tier: 1,
  },
  {
    region: "California (South)",
    org: "Southern California Chess Federation",
    abbreviation: "SCCF",
    href: "https://scchess.com",
    tier: 1,
  },
  {
    region: "Texas",
    org: "Texas Chess Association",
    abbreviation: "TCA",
    href: "https://texaschess.org",
    tier: 1,
  },
  {
    region: "Florida",
    org: "Florida Chess Association",
    abbreviation: "FCA",
    href: "https://floridachess.org",
    tier: 1,
  },
  // Tier 2
  {
    region: "Illinois",
    org: "Illinois Chess Association",
    abbreviation: "ICA",
    href: "https://ilchess.org",
    tier: 2,
  },
  {
    region: "New Jersey",
    org: "New Jersey State Chess Federation",
    abbreviation: "NJSCF",
    href: "https://njscf.org",
    tier: 2,
  },
  {
    region: "Pennsylvania",
    org: "Pennsylvania State Chess Federation",
    abbreviation: "PSCF",
    href: "https://pscfchess.org",
    tier: 2,
  },
  {
    region: "Massachusetts",
    org: "Massachusetts Chess Association",
    abbreviation: "MACA",
    href: "https://masschess.org",
    tier: 2,
  },
  {
    region: "Washington",
    org: "Washington Chess Federation",
    abbreviation: "WCF",
    href: "https://washingtonchess.com",
    tier: 2,
  },
  {
    region: "Ohio",
    org: "Ohio Chess Association",
    abbreviation: "OCA",
    href: "https://ohiochess.org",
    tier: 2,
  },
  // Tier 3
  {
    region: "Arizona",
    org: "Arizona Chess Federation",
    abbreviation: "ACF",
    href: "https://azchess.org",
    tier: 3,
  },
  {
    region: "Colorado",
    org: "Colorado State Chess Association",
    abbreviation: "CSCA",
    href: "https://coloradochess.com",
    tier: 3,
  },
  {
    region: "Connecticut",
    org: "Connecticut State Chess Association",
    abbreviation: "CSCA",
    href: "https://chessct.org",
    tier: 3,
  },
  {
    region: "Georgia",
    org: "Georgia Chess Association",
    abbreviation: "GCA",
    href: "https://georgiachess.org",
    tier: 3,
  },
  {
    region: "Maryland",
    org: "Maryland Chess Association",
    abbreviation: "MCA",
    href: "https://mdchess.com",
    tier: 3,
  },
  {
    region: "Michigan",
    org: "Michigan Chess Association",
    abbreviation: "MCA",
    href: "https://michess.org",
    tier: 3,
  },
  {
    region: "Missouri",
    org: "Missouri Chess Association",
    abbreviation: "MCA",
    href: "https://mochess.org",
    tier: 3,
  },
  {
    region: "North Carolina",
    org: "North Carolina Chess Association",
    abbreviation: "NCCA",
    href: "https://ncchess.org",
    tier: 3,
  },
  {
    region: "Virginia",
    org: "Virginia Chess Federation",
    abbreviation: "VCF",
    href: "https://vachess.org",
    tier: 3,
  },
  // Tier 4
  {
    region: "Alabama",
    org: "Alabama Chess Federation",
    abbreviation: "ACF",
    href: "https://alabamachess.org",
    tier: 4,
  },
  {
    region: "Alaska",
    org: "Alaska Chess",
    href: "https://alaskachess.org",
    tier: 4,
  },
  {
    region: "Arkansas",
    org: "Arkansas Chess Association",
    abbreviation: "ACA",
    href: "https://arkansaschess.net",
    tier: 4,
  },
  {
    region: "Delaware",
    org: "Delaware Chess Association",
    abbreviation: "DCA",
    href: "https://delawarechess.org",
    tier: 4,
  },
  {
    region: "District of Columbia",
    org: "DC Chess League",
    href: "https://dcchess.org",
    tier: 4,
  },
  {
    region: "Hawaii",
    org: "Hawaii Chess Federation",
    abbreviation: "HCF",
    href: "https://hawaiichess.org",
    tier: 4,
  },
  {
    region: "Idaho",
    org: "Idaho Chess Association",
    abbreviation: "ICA",
    href: "https://idahochessassociation.com",
    tier: 4,
  },
  {
    region: "Indiana",
    org: "Indiana State Chess Association",
    abbreviation: "ISCA",
    href: "https://indianachess.org",
    tier: 4,
  },
  {
    region: "Iowa",
    org: "Iowa State Chess Association",
    abbreviation: "IASCA",
    href: "https://iowachess.org",
    tier: 4,
  },
  {
    region: "Kansas",
    org: "Kansas Chess Association",
    abbreviation: "KCA",
    href: "https://kansaschess.org",
    tier: 4,
  },
  {
    region: "Kentucky",
    org: "Kentucky Chess Association",
    abbreviation: "KCA",
    href: "https://kychess.org",
    tier: 4,
  },
  {
    region: "Louisiana",
    org: "Louisiana Chess Association",
    abbreviation: "LCA",
    href: "https://louisianachess.org",
    tier: 4,
  },
  {
    region: "Maine",
    org: "Maine Chess Association",
    abbreviation: "MECA",
    href: "https://chessmaine.net",
    tier: 4,
  },
  {
    region: "Minnesota",
    org: "Minnesota State Chess Association",
    abbreviation: "MSCA",
    href: "https://minnesotachess.com",
    tier: 4,
  },
  {
    region: "Mississippi",
    org: "Mississippi Chess Association",
    abbreviation: "MCA",
    href: "https://mcachess.org",
    tier: 4,
  },
  {
    region: "Montana",
    org: "Montana Chess Association",
    abbreviation: "MCA",
    href: "https://montanachess.org",
    tier: 4,
  },
  {
    region: "Nebraska",
    org: "Nebraska State Chess Association",
    abbreviation: "NSCA",
    href: "https://nebraskachess.com",
    tier: 4,
  },
  {
    region: "Nevada",
    org: "Nevada Chess",
    href: "https://nevadachess.org",
    tier: 4,
  },
  {
    region: "New Hampshire",
    org: "New Hampshire Chess Association",
    abbreviation: "NHCA",
    href: "https://nhchess.org",
    tier: 4,
  },
  {
    region: "New Mexico",
    org: "New Mexico Chess Organization",
    abbreviation: "NMCO",
    href: "https://nmchess.org",
    tier: 4,
  },
  {
    region: "North Dakota",
    org: "North Dakota Chess Association",
    abbreviation: "NDCA",
    href: "https://ndchess.com",
    tier: 4,
  },
  {
    region: "Oklahoma",
    org: "Oklahoma Chess Association",
    abbreviation: "OCA",
    href: "https://ochess.org",
    tier: 4,
  },
  {
    region: "Oregon",
    org: "Oregon Chess Federation",
    abbreviation: "OCF",
    href: "https://nwchess.com",
    note: "Shared Northwest hub with Washington",
    tier: 4,
  },
  {
    region: "Rhode Island",
    org: "Rhode Island Chess Association",
    abbreviation: "RICA",
    href: "https://richess.org",
    tier: 4,
  },
  {
    region: "South Carolina",
    org: "South Carolina Chess Association",
    abbreviation: "SCCA",
    href: "https://scchess.org",
    tier: 4,
  },
  {
    region: "South Dakota",
    org: "South Dakota Chess Association",
    abbreviation: "SDCA",
    href: "https://sdchess.org",
    tier: 4,
  },
  {
    region: "Tennessee",
    org: "Tennessee Chess Association",
    abbreviation: "TCA",
    href: "https://tnchess.us",
    tier: 4,
  },
  {
    region: "Utah",
    org: "Utah Chess Association",
    abbreviation: "UCA",
    href: "https://utahchess.com",
    tier: 4,
  },
  {
    region: "Vermont",
    org: "Vermont Chess Association",
    abbreviation: "VCA",
    href: "https://vtchess.info",
    tier: 4,
  },
  {
    region: "West Virginia",
    org: "West Virginia Chess Association",
    abbreviation: "WVCA",
    href: "https://wvchess.org",
    tier: 4,
  },
  {
    region: "Wisconsin",
    org: "Wisconsin Chess Association",
    abbreviation: "WCA",
    href: "https://wischess.org",
    tier: 4,
  },
  {
    region: "Wyoming",
    org: "Wyoming Chess Association",
    abbreviation: "WCA",
    href: "https://wyomingchess.com",
    tier: 4,
  },
];

export function affiliatesByTier(tier: AffiliateTier): StateAffiliate[] {
  return STATE_AFFILIATES.filter((a) => a.tier === tier);
}
