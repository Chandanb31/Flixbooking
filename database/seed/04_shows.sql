-- Create a rolling week of showtimes (with prices and seat rows).
-- Re-run any day to top the schedule back up to 7 days ahead.
SELECT refresh_shows(7) AS shows_created;
