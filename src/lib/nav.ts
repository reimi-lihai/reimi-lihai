export interface NavItem {
  href: string;
  key: string; // i18n key under nav.*
}

// Primary nav — stays (minpaku) first, since booking is the main purpose.
export const primaryNav: NavItem[] = [
  { href: "/stays", key: "nav.stays" },
  { href: "/properties", key: "nav.properties" },
  { href: "/inbound", key: "nav.inbound" },
  { href: "/checkin", key: "nav.checkin" },
  { href: "/company", key: "nav.company" },
  { href: "/contact", key: "nav.contact" },
];
