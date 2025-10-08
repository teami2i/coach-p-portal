-- Add video_file_path column to store uploaded video paths
ALTER TABLE public.course_lessons 
ADD COLUMN video_file_path TEXT;

-- Create storage bucket for lesson videos (private for security)
INSERT INTO storage.buckets (id, name)
VALUES ('lesson-videos', 'lesson-videos');

-- RLS policies for lesson-videos bucket
-- Only admins can upload/delete videos
CREATE POLICY "Admins can upload lesson videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'lesson-videos' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'administrator'
  )
);

CREATE POLICY "Admins can update lesson videos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'lesson-videos' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'administrator'
  )
);

CREATE POLICY "Admins can delete lesson videos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'lesson-videos' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'administrator'
  )
);

-- Authenticated users can view videos (but URLs will be signed/temporary)
CREATE POLICY "Authenticated users can view lesson videos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'lesson-videos');