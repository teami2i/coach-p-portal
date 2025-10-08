import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { RichTextEditor } from "./RichTextEditor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload } from "lucide-react";
interface Lesson {
  id?: string;
  module_id: string;
  title: string;
  description: string;
  video_url: string;
  duration_seconds: number;
  order_index: number;
  resources: any[];
  content: string;
  video_file_path?: string;
}
interface LessonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleId: string;
  lesson?: Lesson | null;
  onSuccess: () => void;
}
export const LessonDialog = ({
  open,
  onOpenChange,
  moduleId,
  lesson,
  onSuccess
}: LessonDialogProps) => {
  const {
    toast
  } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [formData, setFormData] = useState<Lesson>({
    module_id: moduleId,
    title: "",
    description: "",
    video_url: "",
    duration_seconds: 0,
    order_index: 0,
    resources: [],
    content: "",
    video_file_path: ""
  });
  useEffect(() => {
    if (lesson) {
      setFormData(lesson);
    } else {
      setFormData({
        module_id: moduleId,
        title: "",
        description: "",
        video_url: "",
        duration_seconds: 0,
        order_index: 0,
        resources: [],
        content: "",
        video_file_path: ""
      });
    }
  }, [lesson, moduleId]);
  const handleVideoUpload = async (file: File) => {
    setUploadingVideo(true);
    try {
      // Check file size (limit to 500MB)
      const maxSize = 500 * 1024 * 1024; // 500MB in bytes
      if (file.size > maxSize) {
        throw new Error('File size must be less than 500MB');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${moduleId}/${fileName}`;
      
      console.log('Uploading video:', { fileName, fileSize: file.size, fileType: file.type });
      
      const {
        error: uploadError
      } = await supabase.storage.from('lesson-videos').upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
      
      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }
      
      console.log('Video uploaded successfully to:', filePath);
      
      setFormData({
        ...formData,
        video_file_path: filePath,
        video_url: ""
      });
      toast({
        title: "Video uploaded",
        description: "The video has been uploaded successfully."
      });
    } catch (error: any) {
      console.error('Video upload failed:', error);
      toast({
        title: "Upload failed",
        description: error.message || "An unknown error occurred",
        variant: "destructive"
      });
      setVideoFile(null); // Clear the failed upload
    } finally {
      setUploadingVideo(false);
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // If there's an uploaded video, handle it
      if (videoFile && !formData.video_file_path) {
        await handleVideoUpload(videoFile);
      }
      if (lesson?.id) {
        const {
          error
        } = await supabase.from("course_lessons").update(formData).eq("id", lesson.id);
        if (error) throw error;
        toast({
          title: "Lesson updated",
          description: "The lesson has been updated successfully."
        });
      } else {
        const {
          error
        } = await supabase.from("course_lessons").insert([formData]);
        if (error) throw error;
        toast({
          title: "Lesson created",
          description: "The lesson has been created successfully."
        });
      }
      onSuccess();
      onOpenChange(false);
      setVideoFile(null);
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lesson ? "Edit Lesson" : "Create New Lesson"}</DialogTitle>
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
            <Label htmlFor="description">Internal Description (optional)</Label>
            <Textarea id="description" value={formData.description} onChange={e => setFormData({
            ...formData,
            description: e.target.value
          })} rows={3} />
          </div>
          <div className="space-y-2">
            <Label>Video Source</Label>
            <Tabs defaultValue="url" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="url">Video URL</TabsTrigger>
                <TabsTrigger value="upload">Upload Video</TabsTrigger>
              </TabsList>
              <TabsContent value="url" className="space-y-2">
                <Input id="video_url" type="url" value={formData.video_url} onChange={e => setFormData({
                ...formData,
                video_url: e.target.value,
                video_file_path: ""
              })} placeholder="YouTube, Vimeo, Loom, Google Drive, or OneDrive URL" />
                <p className="text-xs text-muted-foreground">
                  Supports YouTube, Vimeo, and Loom URLs
                </p>
              </TabsContent>
              <TabsContent value="upload" className="space-y-2">
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  {formData.video_file_path ? <div className="space-y-2">
                      <p className="text-sm text-green-600 font-medium">✓ Video uploaded successfully</p>
                      <p className="text-xs text-muted-foreground">{formData.video_file_path}</p>
                      <Button type="button" variant="outline" size="sm" onClick={() => setFormData({
                    ...formData,
                    video_file_path: ""
                  })}>
                        Remove
                      </Button>
                    </div> : <>
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <Input type="file" accept="video/*" onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setVideoFile(file);
                      handleVideoUpload(file);
                    }
                  }} disabled={uploadingVideo} />
                      {uploadingVideo && <p className="text-sm text-muted-foreground mt-2">Uploading...</p>}
                      <p className="text-xs text-muted-foreground mt-2">
                        Secure upload - only authenticated users can access
                      </p>
                    </>}
                </div>
              </TabsContent>
            </Tabs>
          </div>
          
          
          <div className="space-y-2">
            <Label>Lesson Content (displayed below video)</Label>
            <RichTextEditor content={formData.content} onChange={content => setFormData({
            ...formData,
            content
          })} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : lesson ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>;
};