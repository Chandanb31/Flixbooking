-- Theatres, screens and seat layouts (all names are fictional).

INSERT INTO theatres (city_id, name, area, address, amenities)
SELECT c.id, t.name, t.area, t.address, t.amenities
FROM (VALUES
    ('mumbai',    'Starlight Cinemas', 'Andheri West',  'Link Road, Andheri West, Mumbai',         ARRAY['Parking','Food Court','Wheelchair Access']),
    ('mumbai',    'Aurora Multiplex',  'Lower Parel',   'Senapati Bapat Marg, Lower Parel, Mumbai', ARRAY['Recliners','Food Court','M-Ticket']),
    ('delhi',     'Starlight Cinemas', 'Saket',         'Press Enclave Road, Saket, New Delhi',    ARRAY['Parking','Food Court','Wheelchair Access']),
    ('delhi',     'Moonbeam Theatres', 'Connaught Place','Inner Circle, Connaught Place, New Delhi', ARRAY['Metro Nearby','M-Ticket']),
    ('bengaluru', 'Aurora Multiplex',  'Koramangala',   '80 Feet Road, Koramangala, Bengaluru',    ARRAY['Recliners','Food Court','Parking']),
    ('bengaluru', 'Velvet Screens',    'Indiranagar',   '100 Feet Road, Indiranagar, Bengaluru',   ARRAY['Café','M-Ticket']),
    ('hyderabad', 'Starlight Cinemas', 'Hitech City',   'Madhapur Main Road, Hitech City, Hyderabad', ARRAY['Parking','Food Court','Wheelchair Access']),
    ('hyderabad', 'Moonbeam Theatres', 'Banjara Hills', 'Road No. 1, Banjara Hills, Hyderabad',    ARRAY['Recliners','M-Ticket']),
    ('chennai',   'Velvet Screens',    'T. Nagar',      'Usman Road, T. Nagar, Chennai',           ARRAY['Café','Parking']),
    ('chennai',   'Aurora Multiplex',  'Velachery',     'Velachery Main Road, Chennai',            ARRAY['Recliners','Food Court','Wheelchair Access'])
) AS t(city_slug, name, area, address, amenities)
JOIN cities c ON c.slug = t.city_slug
ON CONFLICT (city_id, name, area) DO NOTHING;

-- Two screens per theatre. Screen 2 is IMAX at Starlight, 4DX at Aurora.
INSERT INTO screens (theatre_id, name, screen_type)
SELECT th.id, s.name,
       CASE
         WHEN s.name = 'Screen 2' AND th.name = 'Starlight Cinemas' THEN 'IMAX'
         WHEN s.name = 'Screen 2' AND th.name = 'Aurora Multiplex'  THEN '4DX'
         ELSE 'STANDARD'
       END
FROM theatres th
CROSS JOIN (VALUES ('Screen 1'), ('Screen 2')) AS s(name)
ON CONFLICT (theatre_id, name) DO NOTHING;

-- Seat layout used by every screen (16-column grid, gaps = aisles):
--   Rows A–D  CLASSIC   14 seats  (aisles after seat 3 and seat 11)
--   Rows E–J  PRIME     14 seats
--   Rows K–L  RECLINER   6 seats  (wide seats, centre aisle)
--   A1 and A14 are wheelchair-accessible.
INSERT INTO seats (screen_id, row_label, seat_number, col_index, seat_type, is_accessible)
SELECT sc.id, r.row_label, n,
       CASE WHEN n <= 3 THEN n WHEN n <= 11 THEN n + 1 ELSE n + 2 END,
       r.seat_type,
       (r.row_label = 'A' AND n IN (1, 14))
FROM screens sc
CROSS JOIN (VALUES ('A','CLASSIC'),('B','CLASSIC'),('C','CLASSIC'),('D','CLASSIC'),
                   ('E','PRIME'),('F','PRIME'),('G','PRIME'),('H','PRIME'),('I','PRIME'),('J','PRIME'))
           AS r(row_label, seat_type)
CROSS JOIN generate_series(1, 14) AS n
ON CONFLICT (screen_id, row_label, seat_number) DO NOTHING;

-- Recliners take 2 grid columns each: columns 2,4,6 | 10,12,14
INSERT INTO seats (screen_id, row_label, seat_number, col_index, seat_type)
SELECT sc.id, r.row_label, n,
       CASE WHEN n <= 3 THEN n * 2 ELSE n * 2 + 2 END,
       'RECLINER'
FROM screens sc
CROSS JOIN (VALUES ('K'), ('L')) AS r(row_label)
CROSS JOIN generate_series(1, 6) AS n
ON CONFLICT (screen_id, row_label, seat_number) DO NOTHING;
