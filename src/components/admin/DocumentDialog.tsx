import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Document {
  id?: string;
  title: string;
  description: string;
  file_url: string;
  file_type: string;
  category: string;
}

interface DocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document?: Document | null;
  onSuccess: () => void;
}

export const DocumentDialog = ({ open, onOpenChange, document, onSuccess }: DocumentDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Document>({
    title: "",
    description: "",
    file_url: "",
    file_type: "",
    category: "",
  });

  useEffect(() => {
    if (document) {
      setFormData(document);
    } else {
      setFormData({
        title: "",
        description: "",
        file_url: "",
        file_type: "",
        category: "",
      });
    }
  }, [document]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (document?.id) {
        const { error } = await supabase
          .from("documents")
          .update(formData)
          .eq("id", document.id);

        if (error) throw error;

        toast({
          title: "Document updated",
          description: "The document has been updated successfully.",
        });
      } else {
        console.log("Creating document with data:", formData);
        const { error } = await supabase
          .from("documents")
          .insert([formData]);

        if (error) {
          console.error("Document creation error:", error);
          throw error;
        }

        toast({
          title: "Document created",
          description: "The document has been created successfully.",
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
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
          <DialogTitle>{document ? "Edit Document" : "Add New Document"}</DialogTitle>
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
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="file_url">File URL *</Label>
            <Input
              id="file_url"
              type="url"
              value={formData.file_url}
              onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
              placeholder="https://example.com/document.pdf"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="file_type">File Type</Label>
            <Input
              id="file_type"
              value={formData.file_type}
              onChange={(e) => setFormData({ ...formData, file_type: e.target.value })}
              placeholder="pdf, doc, xlsx, etc."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="Training, Resources, etc."
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : document ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
