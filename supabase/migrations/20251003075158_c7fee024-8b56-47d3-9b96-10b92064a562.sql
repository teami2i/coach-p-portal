-- Delete the existing bucket
DELETE FROM storage.buckets WHERE id = 'lesson-videos';

-- Recreate the bucket with proper configuration
INSERT INTO storage.buckets (id, name)
VALUES ('lesson-videos', 'lesson-videos');