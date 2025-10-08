import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
interface Module {
  id?: string;
  course_id: string;
  title: string;
  description: string;
  order_index: number;
}
interface ModuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  module?: Module | null;
  onSuccess: () => void;
}
export const ModuleDialog = ({
  open,
  onOpenChange,
  courseId,
  module,
  onSuccess
}: ModuleDialogProps) => {
  const {
    toast
  } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Module>({
    course_id: courseId,
    title: "",
    description: "",
    order_index: 0
  });
  useEffect(() => {
    if (module) {
      setFormData(module);
    } else {
      setFormData({
        course_id: courseId,
        title: "",
        description: "",
        order_index: 0
      });
    }
  }, [module, courseId]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (module?.id) {
        const {
          error
        } = await supabase.from("course_modules").update(formData).eq("id", module.id);
        if (error) throw error;
        toast({
          title: "Module updated",
          description: "The module has been updated successfully."
        });
      } else {
        const {
          error
        } = await supabase.from("course_modules").insert([formData]);
        if (error) throw error;
        toast({
          title: "Module created",
          description: "The module has been created successfully."
        });
      }
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{module ? "Edit Module" : "Create New Module"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input id="title" value={formData.title} onChange={e => setFormData({
            ...formData,
            title: e.target.value
          })} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={formData.description} onChange={e => setFormData({
            ...formData,
            description: e.target.value
          })} rows={3} />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : module ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>;
};