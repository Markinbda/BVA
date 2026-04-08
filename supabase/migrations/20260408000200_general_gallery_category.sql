-- Ensure "General" gallery category exists as the default staging folder.
-- Images are placed here automatically until an admin moves them to a specific category.
-- "General" is not shown on the public Gallery page.
INSERT INTO gallery_categories (name, sort_order)
VALUES ('General', 0)
ON CONFLICT (name) DO NOTHING;
