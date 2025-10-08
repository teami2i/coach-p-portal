import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, FileText, Download, Plus, Edit, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { DocumentDialog } from "@/components/admin/DocumentDialog";

interface Document {
  id: string;
  title: string;
  description: string;
  file_url: string;
  file_type: string;
  category: string;
  created_at: string;
}

const Documents = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [documentDialog, setDocumentDialog] = useState<{ open: boolean; document?: Document }>({ open: false });
  const { toast } = useToast();

  useEffect(() => {
    checkAdminAndFetchDocuments();
  }, []);

  const checkAdminAndFetchDocuments = async () => {
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
    fetchDocuments();
  };

  const fetchDocuments = async () => {
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setDocuments(data);
    }
    setLoading(false);
  };

  const filteredDocuments = documents.filter((doc) =>
    doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDownload = async (doc: Document) => {
    try {
      window.open(doc.file_url, "_blank");
      toast({
        title: "Opening document",
        description: `${doc.title} is opening in a new tab`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to open document",
        variant: "destructive",
      });
    }
  };

  const getFileIcon = (fileType: string) => {
    return <FileText className="h-5 w-5" />;
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    const { error } = await supabase.from("documents").delete().eq("id", docId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Document deleted successfully" });
      fetchDocuments();
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">Documents</h2>
            <p className="text-muted-foreground">
              Access training materials, agendas, and resources
            </p>
          </div>
          {isAdmin && (
            <Button onClick={() => setDocumentDialog({ open: true })}>
              <Plus className="mr-2 h-4 w-4" />
              Add Document
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Documents List */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2 mt-2" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : filteredDocuments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">No documents found</p>
              <p className="text-sm text-muted-foreground mt-2">
                {searchTerm
                  ? "Try adjusting your search terms"
                  : "Documents will appear here once they're added"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredDocuments.map((doc) => (
              <Card key={doc.id} className="hover:shadow-medium transition-all">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="p-2 rounded-lg bg-secondary">
                        {getFileIcon(doc.file_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg">{doc.title}</CardTitle>
                        {doc.description && (
                          <CardDescription className="mt-1">
                            {doc.description}
                          </CardDescription>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          {doc.category && (
                            <Badge variant="secondary">{doc.category}</Badge>
                          )}
                          {doc.file_type && (
                            <Badge variant="outline">{doc.file_type.toUpperCase()}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleDownload(doc)}
                      size="sm"
                      className="shrink-0"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                    {isAdmin && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setDocumentDialog({ open: true, document: doc })}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDeleteDocument(doc.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>
      <DocumentDialog
        open={documentDialog.open}
        onOpenChange={(open) => setDocumentDialog({ open })}
        document={documentDialog.document}
        onSuccess={fetchDocuments}
      />
    </DashboardLayout>
  );
};

export default Documents;
