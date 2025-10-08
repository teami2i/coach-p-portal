-- Restructure for SKOOL-style course hierarchy and sales leaderboard

-- Create course_modules table (categories/sections within courses)
CREATE TABLE public.course_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view course modules"
  ON public.course_modules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Administrators can manage course modules"
  ON public.course_modules FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'administrator'));

-- Create course_lessons table (individual lessons with videos)
CREATE TABLE public.course_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES public.course_modules(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  video_thumbnail_url TEXT,
  duration_seconds INTEGER DEFAULT 0,
  order_index INTEGER NOT NULL DEFAULT 0,
  resources JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view course lessons"
  ON public.course_lessons FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Administrators can manage course lessons"
  ON public.course_lessons FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'administrator'));

-- Create lesson_progress table to track user progress
CREATE TABLE public.lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  lesson_id UUID REFERENCES public.course_lessons(id) ON DELETE CASCADE NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, lesson_id)
);

ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own lesson progress"
  ON public.lesson_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own lesson progress"
  ON public.lesson_progress FOR ALL
  USING (auth.uid() = user_id);

-- Drop old performance_metrics table and create new sales_metrics table
DROP TABLE IF EXISTS public.performance_metrics CASCADE;

CREATE TABLE public.sales_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  metric_month DATE NOT NULL,
  rn_auto INTEGER DEFAULT 0,
  fire INTEGER DEFAULT 0,
  life INTEGER DEFAULT 0,
  health INTEGER DEFAULT 0,
  life_premium INTEGER DEFAULT 0,
  health_premium INTEGER DEFAULT 0,
  total_sales INTEGER GENERATED ALWAYS AS (rn_auto + fire + life + health + life_premium + health_premium) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, metric_month)
);

ALTER TABLE public.sales_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sales metrics"
  ON public.sales_metrics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own sales metrics"
  ON public.sales_metrics FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Team managers and admins can view all sales metrics"
  ON public.sales_metrics FOR SELECT
  USING (
    public.has_role(auth.uid(), 'team_manager') OR 
    public.has_role(auth.uid(), 'agency_owner') OR 
    public.has_role(auth.uid(), 'administrator')
  );

-- Add triggers for updated_at
CREATE TRIGGER update_course_modules_updated_at
  BEFORE UPDATE ON public.course_modules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_course_lessons_updated_at
  BEFORE UPDATE ON public.course_lessons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lesson_progress_updated_at
  BEFORE UPDATE ON public.lesson_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sales_metrics_updated_at
  BEFORE UPDATE ON public.sales_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();