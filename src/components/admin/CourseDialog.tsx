import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Course {
  id?: string;
  title: string;
  description: string;
  thumbnail_url: string;
}

interface CourseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course?: Course | null;
  onSuccess: () => void;
  onManageCourse?: (courseId: string) => void;
}

export const CourseDialog = ({ open, onOpenChange, course, onSuccess }: CourseDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Course>({
    title: "",
    description: "",
    thumbnail_url: "",
  });

  useEffect(() => {
    if (course) {
      setFormData(course);
    } else {
      setFormData({ title: "", description: "", thumbnail_url: "" });
    }
  }, [course]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (course?.id) {
        const { error } = await supabase
          .from("courses")
          .update(formData)
          .eq("id", course.id);

        if (error) {
          console.error("Course update error:", error);
          throw error;
        }

        toast({
          title: "Course updated",
          description: "The course has been updated successfully.",
        });
      } else {
        console.log("Creating course with data:", formData);
        const { data, error } = await supabase
          .from("courses")
          .insert([formData])
          .select();

        if (error) {
          console.error("Course creation error:", error);
          throw error;
        }

        console.log("Course created successfully:", data);
        toast({
          title: "Course created",
          description: "The course has been created successfully.",
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Full error object:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save course. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{course ? "Edit Course" : "Create New Course"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="thumbnail_url">Thumbnail URL</Label>
            <Input
              id="thumbnail_url"
              type="url"
              value={formData.thumbnail_url}
              onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
              placeholder="https://example.com/image.jpg"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : course ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
