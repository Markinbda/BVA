-- Add "Adopt an Athlete Backgrounds" as a gallery category
INSERT INTO gallery_categories (name, sort_order)
VALUES ('Adopt an Athlete Backgrounds', 100)
ON CONFLICT (name) DO NOTHING;
