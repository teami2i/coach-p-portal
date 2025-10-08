-- Create the lesson-videos storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name)
VALUES ('lesson-videos', 'lesson-videos')
ON CONFLICT (id) DO NOTHING;