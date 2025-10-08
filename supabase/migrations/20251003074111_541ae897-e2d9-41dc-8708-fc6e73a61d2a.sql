-- Add order_index column to courses table
ALTER TABLE courses ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- Set initial order_index values based on created_at
WITH ranked_courses AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) - 1 as new_order
  FROM courses
)
UPDATE courses
SET order_index = ranked_courses.new_order
FROM ranked_courses
WHERE courses.id = ranked_courses.id;