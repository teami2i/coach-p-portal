-- Add content field to course_lessons table for displaying text below videos
ALTER TABLE public.course_lessons 
ADD COLUMN content TEXT DEFAULT '';