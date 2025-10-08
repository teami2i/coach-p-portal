import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Edit, Trash2, FolderPlus, FileText, ChevronRight } from "lucide-react";
import { ModuleDialog } from "@/components/admin/ModuleDialog";
import { LessonDialog } from "@/components/admin/LessonDialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Course {
  id: string;
  title: string;
  description: string;
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
}

const CourseBuilder = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<{ [moduleId: string]: Lesson[] }>({});
  const [loading, setLoading] = useState(true);
  const [openModules, setOpenModules] = useState<{ [moduleId: string]: boolean }>({});
  
  const [moduleDialog, setModuleDialog] = useState<{ open: boolean; module?: Module | null }>({ open: false });
  const [lessonDialog, setLessonDialog] = useState<{ open: boolean; moduleId: string; lesson?: Lesson | null }>({ open: false, moduleId: "" });

  useEffect(() => {
    checkAdminAndFetchCourse();
  }, [courseId]);

  const checkAdminAndFetchCourse = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "administrator")
        .single();

      if (!roleData) {
        toast({
          title: "Access Denied",
          description: "Only administrators can access this page.",
          variant: "destructive",
        });
        navigate("/admin");
        return;
      }

      await fetchCourseContent();
    } catch (error) {
      console.error("Error checking access:", error);
      navigate("/admin");
    } finally {
      setLoading(false);
    }
  };

  const fetchCourseContent = async () => {
    if (!courseId) return;

    const { data: courseData } = await supabase
      .from("courses")
      .select("*")
      .eq("id", courseId)
      .single();

    if (courseData) {
      setCourse(courseData);
    }

    const { data: modulesData } = await supabase
      .from("course_modules")
      .select("*")
      .eq("course_id", courseId)
      .order("order_index");

    if (modulesData) {
      setModules(modulesData);
      
      const initialOpenState: { [key: string]: boolean } = {};
      modulesData.forEach(m => {
        initialOpenState[m.id] = true;
      });
      setOpenModules(initialOpenState);

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
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm("Delete this module and all its lessons?")) return;
    
    const { error } = await supabase.from("course_modules").delete().eq("id", moduleId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Module deleted" });
      fetchCourseContent();
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm("Delete this lesson?")) return;
    
    const { error } = await supabase.from("course_lessons").delete().eq("id", lessonId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Lesson deleted" });
      fetchCourseContent();
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

  if (!course) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Course not found</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{course.title}</h1>
            <p className="text-muted-foreground">{course.description}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Course Structure</CardTitle>
              <Button onClick={() => setModuleDialog({ open: true })}>
                <FolderPlus className="mr-2 h-4 w-4" />
                Add Module
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {modules.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No modules yet. Create your first module to get started.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {modules.map((module, idx) => (
                  <Card key={module.id}>
                    <Collapsible open={openModules[module.id] !== false} onOpenChange={(open) => setOpenModules({ ...openModules, [module.id]: open })}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CollapsibleTrigger className="flex items-center gap-2 hover:opacity-70">
                            <ChevronRight className={`h-4 w-4 transition-transform ${openModules[module.id] !== false ? 'rotate-90' : ''}`} />
                            <span className="font-semibold">{idx + 1}. {module.title}</span>
                          </CollapsibleTrigger>
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost" onClick={() => setLessonDialog({ open: true, moduleId: module.id })}>
                              <Plus className="h-4 w-4 mr-1" />
                              Add Lesson
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setModuleDialog({ open: true, module })}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDeleteModule(module.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CollapsibleContent>
                        <CardContent className="pt-0">
                          {!lessons[module.id] || lessons[module.id].length === 0 ? (
                            <p className="text-sm text-muted-foreground pl-6">No lessons yet</p>
                          ) : (
                            <div className="space-y-2 pl-6">
                              {lessons[module.id].map((lesson, lIdx) => (
                                <div key={lesson.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                                  <div className="flex items-center gap-3">
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                      <p className="font-medium text-sm">{lIdx + 1}. {lesson.title}</p>
                                      <p className="text-xs text-muted-foreground">{lesson.description}</p>
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button size="sm" variant="ghost" onClick={() => setLessonDialog({ open: true, moduleId: module.id, lesson })}>
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => handleDeleteLesson(lesson.id)}>
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ModuleDialog
        open={moduleDialog.open}
        onOpenChange={(open) => setModuleDialog({ open })}
        courseId={courseId || ""}
        module={moduleDialog.module}
        onSuccess={fetchCourseContent}
      />

      <LessonDialog
        open={lessonDialog.open}
        onOpenChange={(open) => setLessonDialog({ open: false, moduleId: "" })}
        moduleId={lessonDialog.moduleId}
        lesson={lessonDialog.lesson}
        onSuccess={fetchCourseContent}
      />
    </DashboardLayout>
  );
};

export default CourseBuilder;
