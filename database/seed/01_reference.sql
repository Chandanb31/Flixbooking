-- Cities and the refund policy.

INSERT INTO cities (name, slug, state) VALUES
    ('Mumbai',    'mumbai',    'Maharashtra'),
    ('Delhi',     'delhi',     'Delhi'),
    ('Bengaluru', 'bengaluru', 'Karnataka'),
    ('Hyderabad', 'hyderabad', 'Telangana'),
    ('Chennai',   'chennai',   'Tamil Nadu')
ON CONFLICT (slug) DO NOTHING;

-- Refund policy (convenience fee is never refunded):
--   24h+ before the show  -> 100%
--   4h to 24h before      -> 50%
--   under 4h              -> 0% (cancellation not allowed)
INSERT INTO refund_rules (min_hours_before, refund_percent, label) VALUES
    (24, 100, 'Full refund (24+ hours before show)'),
    (4,   50, '50% refund (4 to 24 hours before show)'),
    (0,    0, 'No refund (less than 4 hours before show)')
ON CONFLICT (min_hours_before) DO NOTHING;
