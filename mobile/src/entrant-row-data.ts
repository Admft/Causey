/**
 * One tournament decision as Family, Plan, and the event screen all read it.
 * Kept free of React Native imports so the website's type check can follow the
 * shared RSVP logic without installing Expo.
 */
export type EntrantRowData = {
  competition_id: string;
  profile_id: string;
  status: string;
  registration_status?: string | null;
  needs_organizer_registration: boolean;
  competition: {
    slug: string;
    name: string;
    city: string | null;
    state: string | null;
    start_date: string;
    end_date: string | null;
    reg_url: string | null;
  } | null;
};
