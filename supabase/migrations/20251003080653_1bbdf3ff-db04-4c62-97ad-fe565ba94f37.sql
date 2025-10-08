-- Drop the videos table as it's unused and redundant with course_lessons
DROP TABLE IF EXISTS public.videos;

-- Remove video_thumbnail_url from course_lessons as thumbnails are auto-generated
ALTER TABLE public.course_lessons 
DROP COLUMN IF EXISTS video_thumbnail_url;