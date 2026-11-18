-- DANGER: deletes every FlixBooking table and all data. Development only.
DROP TABLE IF EXISTS payments, show_seats, booking_seats, bookings, show_prices, shows,
                     seats, screens, theatres, movies, cities, refund_rules, users CASCADE;
DROP FUNCTION IF EXISTS refresh_shows(INT);
DROP FUNCTION IF EXISTS release_expired_holds();
