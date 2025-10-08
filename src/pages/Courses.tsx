import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, Circle, ChevronRight, ChevronDown, Play, BookOpen, Edit, Trash2, Plus, GripVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CourseDialog } from "@/components/admin/CourseDialog";
import { ModuleDialog } from "@/components/admin/ModuleDialog";
import { LessonDialog } from "@/components/admin/LessonDialog";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { VideoPlayer } from "@/components/VideoPlayer";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  order_index: number;
}

interface Module {
  id: string;
  course_id: string;
  title: string;
  description: string;
  order_index: number;
}

interface Lesson {
  id: string;
  module_id: string;
  title: string;
  description: string;
  video_url: string;
  duration_seconds: number;
  order_index: number;
  resources: any;
  content: string;
  video_file_path?: string;
}

const Courses = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<{ [moduleId: string]: Lesson[] }>({});
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [progress, setProgress] = useState<{ [lessonId: string]: boolean }>({});
  const [openModules, setOpenModules] = useState<{ [moduleId: string]: boolean }>({});
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Admin dialog states
  const [courseDialog, setCourseDialog] = useState<{ open: boolean; course?: Course }>({ open: false });
  const [moduleDialog, setModuleDialog] = useState<{ open: boolean; module?: Module }>({ open: false });
  const [lessonDialog, setLessonDialog] = useState<{ open: boolean; lesson?: Lesson; moduleId?: string }>({ open: false });
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const [editingTitleLessonId, setEditingTitleLessonId] = useState<string | null>(null);
  const [videoSignedUrls, setVideoSignedUrls] = useState<{ [lessonId: string]: string }>({});

  useEffect(() => {
    checkAdminAndFetchCourses();
  }, []);

  const checkAdminAndFetchCourses = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "administrator")
        .single();
      setIsAdmin(!!roleData);
    }
    fetchCourses();
  };

  useEffect(() => {
    if (courseId) {
      const course = courses.find(c => c.id === courseId);
      if (course) {
        handleSelectCourse(course);
      }
    }
  }, [courseId, courses]);

  const fetchCourses = async () => {
    try {
      const { data: coursesData } = await supabase
        .from("courses")
        .select("*")
        .order("order_index", { ascending: true });

      setCourses(coursesData || []);
      
      if (coursesData && coursesData.length > 0 && !courseId) {
        handleSelectCourse(coursesData[0]);
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCourse = async (course: Course) => {
    setSelectedCourse(course);
    navigate(`/courses/${course.id}`);
    await fetchCourseContent(course.id);
  };

  const fetchCourseContent = async (courseId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: modulesData } = await supabase
        .from("course_modules")
        .select("*")
        .eq("course_id", courseId)
        .order("order_index");

      setModules(modulesData || []);

      if (modulesData && modulesData.length > 0) {
        const { data: lessonsData } = await supabase
          .from("course_lessons")
          .select("*")
          .in("module_id", modulesData.map(m => m.id))
          .order("order_index");

        const lessonsByModule: { [moduleId: string]: Lesson[] } = {};
        lessonsData?.forEach((lesson: Lesson) => {
          if (!lessonsByModule[lesson.module_id]) {
            lessonsByModule[lesson.module_id] = [];
          }
          lessonsByModule[lesson.module_id].push(lesson);
        });
        setLessons(lessonsByModule);

        const { data: progressData } = await supabase
          .from("lesson_progress")
          .select("lesson_id, completed")
          .eq("user_id", user.id)
          .in("lesson_id", lessonsData?.map(l => l.id) || []);

        const progressMap: { [lessonId: string]: boolean } = {};
        progressData?.forEach((p: any) => {
          progressMap[p.lesson_id] = p.completed;
        });
        setProgress(progressMap);

        if (modulesData.length > 0) {
          const firstModule = modulesData[0];
          setOpenModules({ [firstModule.id]: true });
          if (lessonsByModule[firstModule.id]?.length > 0) {
            setSelectedLesson(lessonsByModule[firstModule.id][0]);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching course content:", error);
    }
  };

  const toggleLessonComplete = async (lessonId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const isCompleted = progress[lessonId] || false;

      if (isCompleted) {
        await supabase
          .from("lesson_progress")
          .delete()
          .eq("user_id", user.id)
          .eq("lesson_id", lessonId);
        setProgress({ ...progress, [lessonId]: false });
      } else {
        await supabase
          .from("lesson_progress")
          .upsert({
            user_id: user.id,
            lesson_id: lessonId,
            completed: true,
            completed_at: new Date().toISOString(),
          });
        setProgress({ ...progress, [lessonId]: true });
        toast({ title: "Lesson completed!", description: "Great job!" });
      }
    } catch (error) {
      console.error("Error toggling completion:", error);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    return `${mins} min`;
  };

  const getVideoEmbedUrl = (url: string) => {
    if (!url) return "";
    
    // YouTube
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      // Check if it's already an embed URL
      if (url.includes("youtube.com/embed/")) {
        // Add parameters to disable branding, info, and related videos
        const separator = url.includes("?") ? "&" : "?";
        return `${url}${separator}modestbranding=1&rel=0&showinfo=0&fs=0&disablekb=1`;
      }
      
      // Extract video ID from various YouTube URL formats
      let videoId = "";
      
      // Format: https://www.youtube.com/watch?v=VIDEO_ID
      if (url.includes("youtube.com/watch?v=")) {
        videoId = url.split("watch?v=")[1]?.split("&")[0];
      }
      // Format: https://youtu.be/VIDEO_ID
      else if (url.includes("youtu.be/")) {
        videoId = url.split("youtu.be/")[1]?.split("?")[0];
      }
      
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}?modestbranding=1&rel=0&showinfo=0&fs=0&disablekb=1`;
      }
    }
    
    // Vimeo
    if (url.includes("vimeo.com")) {
      // Check if it's already an embed URL
      if (url.includes("player.vimeo.com/video/")) {
        // Add parameters to disable title, byline, portrait, and share button
        const separator = url.includes("?") ? "&" : "?";
        return `${url}${separator}title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479`;
      }
      
      // Extract video ID from various Vimeo URL formats
      // Format: https://vimeo.com/VIDEO_ID or https://vimeo.com/VIDEO_ID?params
      const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
      if (vimeoMatch && vimeoMatch[1]) {
        return `https://player.vimeo.com/video/${vimeoMatch[1]}?title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479`;
      }
    }
    
    // Loom
    if (url.includes("loom.com")) {
      // Check if it's already an embed URL
      if (url.includes("loom.com/embed/")) {
        // Add parameters to hide owner and title
        const separator = url.includes("?") ? "&" : "?";
        return `${url}${separator}hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true`;
      }
      
      // Extract video ID from Loom URL
      // Format: https://www.loom.com/share/VIDEO_ID
      const loomMatch = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/);
      if (loomMatch && loomMatch[1]) {
        return `https://www.loom.com/embed/${loomMatch[1]}?hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true`;
      }
    }
    
    // Google Drive
    if (url.includes("drive.google.com")) {
      // Check if it's already an embed/preview URL
      if (url.includes("/preview") || url.includes("/embed")) {
        return url;
      }
      
      // Extract file ID from various Google Drive URL formats
      // Format: https://drive.google.com/file/d/FILE_ID/view
      const driveMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (driveMatch && driveMatch[1]) {
        return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
      }
      
      // Format: https://drive.google.com/open?id=FILE_ID
      const openMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (openMatch && openMatch[1]) {
        return `https://drive.google.com/file/d/${openMatch[1]}/preview`;
      }
    }
    
    // OneDrive
    if (url.includes("onedrive.live.com") || url.includes("1drv.ms")) {
      // If it already has embed in it, return as is
      if (url.includes("embed")) {
        return url;
      }
      
      // For 1drv.ms short links, they need to be converted
      // Add embed parameter to the URL
      if (url.includes("?")) {
        return `${url}&embed`;
      } else {
        return `${url}?embed`;
      }
    }
    
    // If no platform matched, return the original URL
    return url;
  };

  const calculateCourseProgress = () => {
    const allLessons = Object.values(lessons).flat();
    if (allLessons.length === 0) return 0;
    const completedCount = allLessons.filter(l => progress[l.id]).length;
    return Math.round((completedCount / allLessons.length) * 100);
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm("Are you sure you want to delete this course?")) return;
    const { error } = await supabase.from("courses").delete().eq("id", courseId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Course deleted successfully" });
      setCourses(courses.filter(c => c.id !== courseId));
      if (selectedCourse?.id === courseId) {
        setSelectedCourse(null);
        navigate("/courses");
      }
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm("Are you sure you want to delete this module and all its lessons?")) return;
    const { error } = await supabase.from("course_modules").delete().eq("id", moduleId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Module deleted successfully" });
      if (selectedCourse) fetchCourseContent(selectedCourse.id);
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm("Are you sure you want to delete this lesson?")) return;
    const { error } = await supabase.from("course_lessons").delete().eq("id", lessonId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Lesson deleted successfully" });
      if (selectedCourse) fetchCourseContent(selectedCourse.id);
    }
  };

  const handleSaveContent = async () => {
    if (!selectedLesson) return;
    
    const { error } = await supabase
      .from("course_lessons")
      .update({ content: editedContent })
      .eq("id", selectedLesson.id);
    
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Content updated successfully" });
      setSelectedLesson({ ...selectedLesson, content: editedContent });
      setIsEditingContent(false);
    }
  };

  const handleStartEditing = () => {
    setEditedContent(selectedLesson?.content || "");
    setIsEditingContent(true);
  };

  const handleCreateLesson = async (moduleId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Create a blank lesson
      const newLesson = {
        module_id: moduleId,
        title: "New Lesson",
        description: "",
        video_url: "",
        duration_seconds: 0,
        order_index: lessons[moduleId]?.length || 0,
        resources: [],
        content: "",
      };

      const { data, error } = await supabase
        .from("course_lessons")
        .insert([newLesson])
        .select()
        .single();

      if (error) throw error;

      toast({ title: "Lesson created", description: "Click to edit the lesson details" });
      
      // Refresh lessons
      if (selectedCourse) {
        await fetchCourseContent(selectedCourse.id);
      }
      
      // Auto-select the new lesson and enable title editing
      if (data) {
        setSelectedLesson(data);
        setEditingTitleLessonId(data.id);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUpdateLessonTitle = async (lessonId: string, newTitle: string) => {
    try {
      const { error } = await supabase
        .from("course_lessons")
        .update({ title: newTitle })
        .eq("id", lessonId);

      if (error) throw error;

      // Update local state
      const updatedLessons = { ...lessons };
      Object.keys(updatedLessons).forEach(moduleId => {
        updatedLessons[moduleId] = updatedLessons[moduleId].map(lesson =>
          lesson.id === lessonId ? { ...lesson, title: newTitle } : lesson
        );
      });
      setLessons(updatedLessons);

      if (selectedLesson?.id === lessonId) {
        setSelectedLesson({ ...selectedLesson, title: newTitle });
      }

      setEditingTitleLessonId(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRemoveVideo = async (lessonId: string) => {
    if (!confirm("Are you sure you want to remove the video from this lesson?")) return;
    
    try {
      const { error } = await supabase
        .from("course_lessons")
        .update({ video_url: null, video_file_path: null })
        .eq("id", lessonId);

      if (error) throw error;

      toast({ title: "Video removed successfully" });
      
      if (selectedCourse) {
        await fetchCourseContent(selectedCourse.id);
      }
      
      if (selectedLesson?.id === lessonId) {
        setSelectedLesson({ ...selectedLesson, video_url: "", video_file_path: undefined });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getVideoUrl = async (lesson: Lesson) => {
    // If it's a URL-based video, return the embed URL
    if (lesson.video_url) {
      return getVideoEmbedUrl(lesson.video_url);
    }
    
    // If it's an uploaded video, generate a signed URL
    if (lesson.video_file_path) {
      // Check if we already have a signed URL cached
      if (videoSignedUrls[lesson.id]) {
        return videoSignedUrls[lesson.id];
      }

      const { data, error } = await supabase.storage
        .from('lesson-videos')
        .createSignedUrl(lesson.video_file_path, 3600); // 1 hour expiry

      if (error) {
        console.error("Error creating signed URL:", error);
        return "";
      }

      // Cache the signed URL
      setVideoSignedUrls(prev => ({ ...prev, [lesson.id]: data.signedUrl }));
      return data.signedUrl;
    }

    return "";
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleModuleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;

    const oldIndex = modules.findIndex(m => m.id === active.id);
    const newIndex = modules.findIndex(m => m.id === over.id);

    const reorderedModules = arrayMove(modules, oldIndex, newIndex);
    setModules(reorderedModules);

    // Update order_index in database
    try {
      await Promise.all(
        reorderedModules.map((module, index) =>
          supabase
            .from('course_modules')
            .update({ order_index: index })
            .eq('id', module.id)
        )
      );
      toast({ title: "Modules reordered successfully" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      if (selectedCourse) fetchCourseContent(selectedCourse.id);
    }
  };

  const handleLessonDragEnd = async (event: DragEndEvent, moduleId: string) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;

    const moduleLessons = lessons[moduleId] || [];
    const oldIndex = moduleLessons.findIndex(l => l.id === active.id);
    const newIndex = moduleLessons.findIndex(l => l.id === over.id);

    const reorderedLessons = arrayMove(moduleLessons, oldIndex, newIndex);
    setLessons({ ...lessons, [moduleId]: reorderedLessons });

    // Update order_index in database
    try {
      await Promise.all(
        reorderedLessons.map((lesson, index) =>
          supabase
            .from('course_lessons')
            .update({ order_index: index })
            .eq('id', lesson.id)
        )
      );
      toast({ title: "Lessons reordered successfully" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      if (selectedCourse) fetchCourseContent(selectedCourse.id);
    }
  };

  const handleCourseDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;

    const oldIndex = courses.findIndex(c => c.id === active.id);
    const newIndex = courses.findIndex(c => c.id === over.id);

    const reorderedCourses = arrayMove(courses, oldIndex, newIndex);
    setCourses(reorderedCourses);

    // Update order_index in database
    try {
      await Promise.all(
        reorderedCourses.map((course, index) =>
          supabase
            .from('courses')
            .update({ order_index: index })
            .eq('id', course.id)
        )
      );
      toast({ title: "Courses reordered successfully" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      fetchCourses();
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!selectedCourse) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Classroom</h1>
            </div>
            {isAdmin && (
              <Button onClick={() => setCourseDialog({ open: true })}>
                <Plus className="mr-2 h-4 w-4" />
                Create Course
              </Button>
            )}
          </div>
          {courses.length === 0 ? (
            <Card className="p-12 text-center">
              <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No courses available yet</p>
            </Card>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleCourseDragEnd}
            >
              <SortableContext
                items={courses.map(c => c.id)}
                strategy={verticalListSortingStrategy}
                disabled={!isAdmin}
              >
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {courses.map((course) => (
                    <SortableCourse
                      key={course.id}
                      course={course}
                      isAdmin={isAdmin}
                      handleSelectCourse={handleSelectCourse}
                      setCourseDialog={setCourseDialog}
                      handleDeleteCourse={handleDeleteCourse}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
        <CourseDialog
          open={courseDialog.open}
          onOpenChange={(open) => setCourseDialog({ open })}
          course={courseDialog.course}
          onSuccess={checkAdminAndFetchCourses}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Course Selector */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => {
            setSelectedCourse(null);
            navigate('/courses');
          }}>
            ← Back to Courses
          </Button>
          <div className="flex gap-2 flex-wrap">
            {courses.map((course) => (
              <Button
                key={course.id}
                variant={selectedCourse.id === course.id ? "default" : "outline"}
                onClick={() => handleSelectCourse(course)}
              >
                {course.title}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex gap-6">
          <div className="w-80 flex-shrink-0 overflow-y-auto border-r pr-4 max-h-[calc(100vh-200px)]">
            <div className="mb-4">
              <h2 className="font-bold text-xl mb-2">{selectedCourse.title}</h2>
              <Progress value={calculateCourseProgress()} className="h-2" />
              <p className="text-sm text-muted-foreground mt-2">{calculateCourseProgress()}% complete</p>
            </div>
            <div className="space-y-2">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleModuleDragEnd}
            >
              <SortableContext
                items={modules.map(m => m.id)}
                strategy={verticalListSortingStrategy}
                disabled={!isAdmin}
              >
                {modules.map((module, idx) => (
                  <SortableModule
                    key={module.id}
                    module={module}
                    idx={idx}
                    isAdmin={isAdmin}
                    openModules={openModules}
                    setOpenModules={setOpenModules}
                    setModuleDialog={setModuleDialog}
                    handleDeleteModule={handleDeleteModule}
                    lessons={lessons}
                    selectedLesson={selectedLesson}
                    setSelectedLesson={setSelectedLesson}
                    progress={progress}
                    editingTitleLessonId={editingTitleLessonId}
                    setLessons={setLessons}
                    handleUpdateLessonTitle={handleUpdateLessonTitle}
                    setLessonDialog={setLessonDialog}
                    handleDeleteLesson={handleDeleteLesson}
                    formatDuration={formatDuration}
                    handleCreateLesson={handleCreateLesson}
                    handleLessonDragEnd={handleLessonDragEnd}
                    sensors={sensors}
                  />
                ))}
              </SortableContext>
            </DndContext>
            {isAdmin && (
              <Button onClick={() => setModuleDialog({ open: true })} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Add Module
              </Button>
            )}
          </div>
        </div>
        <div className="flex-1">
          {selectedLesson ? (
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  {editingTitleLessonId === selectedLesson.id && isAdmin ? (
                    <Input
                      value={selectedLesson.title}
                      onChange={(e) => {
                        const newTitle = e.target.value;
                        setSelectedLesson({ ...selectedLesson, title: newTitle });
                      }}
                      onBlur={() => handleUpdateLessonTitle(selectedLesson.id, selectedLesson.title)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleUpdateLessonTitle(selectedLesson.id, selectedLesson.title);
                        }
                      }}
                      autoFocus
                      className="text-2xl font-bold"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <h1 className="text-2xl font-bold">{selectedLesson.title}</h1>
                      {isAdmin && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setEditingTitleLessonId(selectedLesson.id)}
                          className="h-8 w-8"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )}
                  <p className="text-muted-foreground">{selectedLesson.description}</p>
                </div>
                <Button variant={progress[selectedLesson.id] ? "outline" : "default"} onClick={() => toggleLessonComplete(selectedLesson.id)}>
                  {progress[selectedLesson.id] ? <><CheckCircle2 className="mr-2 h-4 w-4" />Completed</> : "Mark Complete"}
                </Button>
              </div>
              <div className="relative bg-black rounded-lg overflow-hidden aspect-video group">
                {(selectedLesson.video_url || selectedLesson.video_file_path) ? (
                  <>
                    <VideoPlayer lesson={selectedLesson} getVideoUrl={getVideoUrl} />
                    {isAdmin && (
                      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setLessonDialog({ open: true, lesson: selectedLesson, moduleId: selectedLesson.module_id })}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Video
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRemoveVideo(selectedLesson.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full flex-col gap-4">
                    <Play className="h-16 w-16 text-white" />
                    {isAdmin && (
                      <Button variant="outline" onClick={() => setLessonDialog({ open: true, lesson: selectedLesson, moduleId: selectedLesson.module_id })}>
                        <Edit className="mr-2 h-4 w-4" />
                        Add Video
                      </Button>
                    )}
                  </div>
                )}
              </div>
              
              {/* Lesson Content */}
              {(selectedLesson.content || isAdmin) && (
                <div className="mt-6 p-6 bg-muted rounded-lg">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Lesson Details</h3>
                    {isAdmin && !isEditingContent && (
                      <Button size="sm" variant="outline" onClick={handleStartEditing}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Content
                      </Button>
                    )}
                  </div>
                  
                  {isEditingContent && isAdmin ? (
                    <div className="space-y-4">
                      <RichTextEditor 
                        content={editedContent}
                        onChange={setEditedContent}
                      />
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={() => setIsEditingContent(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleSaveContent}>
                          Save Changes
                        </Button>
                      </div>
                    </div>
                  ) : (
                    selectedLesson.content && (
                      <div 
                        className="prose prose-sm max-w-none dark:prose-invert [&_iframe]:w-full [&_iframe]:aspect-video [&_iframe]:rounded-lg"
                        dangerouslySetInnerHTML={{ __html: selectedLesson.content }}
                      />
                    )
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full"><BookOpen className="h-16 w-16 text-muted-foreground" /></div>
          )}
        </div>
      </div>
    </div>
    <CourseDialog
      open={courseDialog.open}
      onOpenChange={(open) => setCourseDialog({ open })}
      course={courseDialog.course}
      onSuccess={checkAdminAndFetchCourses}
    />
    <ModuleDialog
      open={moduleDialog.open}
      onOpenChange={(open) => setModuleDialog({ open })}
      courseId={selectedCourse?.id || ""}
      module={moduleDialog.module || null}
      onSuccess={() => selectedCourse && fetchCourseContent(selectedCourse.id)}
    />
    <LessonDialog
      open={lessonDialog.open}
      onOpenChange={(open) => setLessonDialog({ open })}
      moduleId={lessonDialog.moduleId || ""}
      lesson={lessonDialog.lesson || null}
      onSuccess={() => selectedCourse && fetchCourseContent(selectedCourse.id)}
    />
    </DashboardLayout>
  );
};

// Sortable Module Component
const SortableModule = ({
  module,
  idx,
  isAdmin,
  openModules,
  setOpenModules,
  setModuleDialog,
  handleDeleteModule,
  lessons,
  selectedLesson,
  setSelectedLesson,
  progress,
  editingTitleLessonId,
  setLessons,
  handleUpdateLessonTitle,
  setLessonDialog,
  handleDeleteLesson,
  formatDuration,
  handleCreateLesson,
  handleLessonDragEnd,
  sensors,
}: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: module.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Collapsible
        open={openModules[module.id] !== false}
        onOpenChange={(open) => setOpenModules({ ...openModules, [module.id]: open })}
      >
        <div className="flex items-center gap-2">
          {isAdmin && (
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          <CollapsibleTrigger className="flex-1 flex items-center gap-2 p-2 hover:bg-muted rounded-lg">
            {openModules[module.id] !== false ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <span className="font-semibold text-sm">
              {idx + 1}. {module.title}
            </span>
          </CollapsibleTrigger>
          {isAdmin && (
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setModuleDialog({ open: true, module })}
              >
                <Edit className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDeleteModule(module.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
        <CollapsibleContent>
          <div className="ml-6 space-y-1 mt-1">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(event) => handleLessonDragEnd(event, module.id)}
            >
              <SortableContext
                items={lessons[module.id]?.map((l: Lesson) => l.id) || []}
                strategy={verticalListSortingStrategy}
                disabled={!isAdmin}
              >
                {lessons[module.id]?.map((lesson: Lesson, lIdx: number) => (
                  <SortableLesson
                    key={lesson.id}
                    lesson={lesson}
                    lIdx={lIdx}
                    isAdmin={isAdmin}
                    moduleId={module.id}
                    selectedLesson={selectedLesson}
                    setSelectedLesson={setSelectedLesson}
                    progress={progress}
                    editingTitleLessonId={editingTitleLessonId}
                    lessons={lessons}
                    setLessons={setLessons}
                    handleUpdateLessonTitle={handleUpdateLessonTitle}
                    setLessonDialog={setLessonDialog}
                    handleDeleteLesson={handleDeleteLesson}
                    formatDuration={formatDuration}
                  />
                ))}
              </SortableContext>
            </DndContext>
            {isAdmin && (
              <Button
                size="sm"
                variant="outline"
                className="ml-6 mt-2"
                onClick={() => handleCreateLesson(module.id)}
              >
                <Plus className="mr-2 h-3 w-3" />
                Add Lesson
              </Button>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

// Sortable Lesson Component
const SortableLesson = ({
  lesson,
  lIdx,
  isAdmin,
  moduleId,
  selectedLesson,
  setSelectedLesson,
  progress,
  editingTitleLessonId,
  lessons,
  setLessons,
  handleUpdateLessonTitle,
  setLessonDialog,
  handleDeleteLesson,
  formatDuration,
}: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lesson.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 group">
      {isAdmin && (
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="h-3 w-3 text-muted-foreground" />
        </div>
      )}
      <button
        onClick={() => setSelectedLesson(lesson)}
        className={`flex-1 text-left p-3 rounded-lg ${
          selectedLesson?.id === lesson.id
            ? "bg-yellow-50 dark:bg-yellow-950/20 border-l-4 border-yellow-500"
            : "hover:bg-muted"
        }`}
      >
        <div className="flex items-center gap-2">
          {progress[lesson.id] ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : (
            <Circle className="h-4 w-4 text-gray-400" />
          )}
          <div className="flex-1">
            {editingTitleLessonId === lesson.id && isAdmin ? (
              <Input
                className="h-7 text-sm"
                value={lesson.title}
                onChange={(e) => {
                  const updatedLessons = { ...lessons };
                  updatedLessons[moduleId] = updatedLessons[moduleId].map((l: Lesson) =>
                    l.id === lesson.id ? { ...l, title: e.target.value } : l
                  );
                  setLessons(updatedLessons);
                }}
                onBlur={(e) => handleUpdateLessonTitle(lesson.id, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleUpdateLessonTitle(
                      lesson.id,
                      (e.target as HTMLInputElement).value
                    );
                  }
                }}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <p className="text-sm font-medium">
                {lIdx + 1}. {lesson.title}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {formatDuration(lesson.duration_seconds)}
            </p>
          </div>
        </div>
      </button>
      {isAdmin && (
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              setLessonDialog({ open: true, lesson, moduleId: moduleId })
            }
          >
            <Edit className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleDeleteLesson(lesson.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
};

// Sortable Course Component
const SortableCourse = ({
  course,
  isAdmin,
  handleSelectCourse,
  setCourseDialog,
  handleDeleteCourse,
}: {
  course: Course;
  isAdmin: boolean;
  handleSelectCourse: (course: Course) => void;
  setCourseDialog: (value: { open: boolean; course?: Course }) => void;
  handleDeleteCourse: (courseId: string) => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: course.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="cursor-pointer hover:shadow-lg transition-shadow group relative" onClick={() => handleSelectCourse(course)}>
        {isAdmin && (
          <div 
            {...attributes} 
            {...listeners} 
            className="absolute top-2 left-2 z-10 cursor-grab active:cursor-grabbing bg-background/80 rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        {course.thumbnail_url && <img src={course.thumbnail_url} alt={course.title} className="w-full h-48 object-cover rounded-t-lg" />}
        <CardContent className="p-4">
          <h3 className="font-bold text-lg">{course.title}</h3>
          <p className="text-sm text-muted-foreground">{course.description}</p>
          {isAdmin && (
            <div className="flex gap-2 mt-4" onClick={(e) => e.stopPropagation()}>
              <Button size="sm" variant="outline" onClick={() => setCourseDialog({ open: true, course })}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleDeleteCourse(course.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Courses;
