-- Add RLS policies for administrators to manage content

-- Courses table policies
CREATE POLICY "Administrators can insert courses"
ON public.courses
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'administrator'));

CREATE POLICY "Administrators can update courses"
ON public.courses
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'administrator'));

CREATE POLICY "Administrators can delete courses"
ON public.courses
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'administrator'));

-- Events table policies
CREATE POLICY "Administrators can insert events"
ON public.events
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'administrator'));

CREATE POLICY "Administrators can update events"
ON public.events
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'administrator'));

CREATE POLICY "Administrators can delete events"
ON public.events
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'administrator'));

-- Videos table policies
CREATE POLICY "Administrators can insert videos"
ON public.videos
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'administrator'));

CREATE POLICY "Administrators can update videos"
ON public.videos
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'administrator'));

CREATE POLICY "Administrators can delete videos"
ON public.videos
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'administrator'));

-- Documents table policies
CREATE POLICY "Administrators can insert documents"
ON public.documents
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'administrator'));

CREATE POLICY "Administrators can update documents"
ON public.documents
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'administrator'));

CREATE POLICY "Administrators can delete documents"
ON public.documents
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'administrator'));