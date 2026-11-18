export type SeatType = "CLASSIC" | "PRIME" | "RECLINER";

export interface User {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  role: "customer" | "organizer" | "admin";
}

export interface City {
  id: number;
  name: string;
  slug: string;
  state: string;
}

export interface Movie {
  id: number;
  slug: string;
  title: string;
  tagline: string | null;
  synopsis: string | null;
  genres: string[];
  language: string;
  certificate: "U" | "UA" | "A";
  duration_min: number;
  release_date: string;
  rating: number | null;
  director: string | null;
  cast_members: string[];
  formats: string[];
  status: "now_showing" | "coming_soon" | "ended";
  poster_url: string;
}

export interface ShowSlot {
  id: number;
  starts_at: string;
  format: string;
  language: string;
  screen_name: string;
  min_price: number;
  total_seats: number;
  free_seats: number;
}

export interface TheatreShows {
  id: number;
  name: string;
  area: string;
  address: string;
  amenities: string[];
  shows: ShowSlot[];
}

export interface Seat {
  id: number;
  row_label: string;
  seat_number: number;
  col_index: number;
  seat_type: SeatType;
  is_accessible: boolean;
  status: "available" | "held" | "booked";
}

export interface ShowDetail {
  id: number;
  starts_at: string;
  ends_at: string;
  format: string;
  language: string;
  status: string;
  is_bookable: boolean;
  screen_name: string;
  screen_type: string;
  theatre_name: string;
  theatre_area: string;
  city: string;
  movie_slug: string;
  movie_title: string;
  poster_url: string;
  certificate: string;
  duration_min: number;
  prices: { seat_type: SeatType; price: number }[];
  seats: Seat[];
}

export interface BookedSeat {
  seat_id: number;
  row_label: string;
  seat_number: number;
  seat_type: SeatType;
  price: number;
}

export interface Booking {
  id: number;
  booking_code: string;
  status: "pending" | "confirmed" | "cancelled" | "expired";
  seat_count: number;
  subtotal: number;
  convenience_fee: number;
  total_amount: number;
  hold_expires_at: string;
  refund_amount: number;
  refund_status: "none" | "processing" | "refunded";
  created_at: string;
  confirmed_at: string | null;
  cancelled_at: string | null;
  show_id: number;
  starts_at: string;
  format: string;
  language: string;
  screen_name: string;
  theatre_name: string;
  theatre_area: string;
  theatre_address: string;
  city: string;
  movie_slug: string;
  movie_title: string;
  poster_url: string;
  certificate: string;
  duration_min: number;
  seats: BookedSeat[];
}

export interface RefundQuote {
  can_cancel: boolean;
  reason: string | null;
  hours_left: number;
  refund_percent: number;
  policy: string;
  refund_amount: number;
  non_refundable_fee: number;
}

export interface RefundRule {
  min_hours_before: number;
  refund_percent: number;
  label: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}
