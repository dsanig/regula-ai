import { Fragment, useMemo, useRef, useState, useEffect, useCallback } from "react";
import {
  FileText,
  Search,
  Filter,
  Plus,
  FolderOpen,
  CheckCircle,
  Clock,
  AlertCircle,
  FileSpreadsheet,
  File,
  UploadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { DocumentActionsMenu } from "./DocumentActionsMenu";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import type { FiltersState } from "@/components/filters/FilterModal";

interface Document {
  id: string;
  code: string;
  title: string;
  category: string;
  categoryId: string;
  version: string;
  status: "approved" | "draft" | "review" | "obsolete";
  lastUpdated: string;
  owner: string;
  ownerId: string;
  pageCount: number;
  format: "pdf" | "docx" | "xlsx";
  originalAuthor: string;
  lastModifiedBy: string;
  fileUrl: string;
}

interface SignedDocument {
  file?: File;
  signedAt: string;
  signerName: string;
  reason?: string;
  id?: string;
}

// Build AutoFirma invocation URL using afirma:// protocol
function buildAutoFirmaUrl(fileB64: string, fileName: string): string {
  const params = new URLSearchParams({
    op: "sign",
    format: "CAdES",
    algorithm: "SHA256withRSA",
    dat: fileB64,
    filename: fileName,
  });
  return `afirma://sign?${params.toString()}`;
}


const categoryOptions = [
  { id: "all", label: "Todos" },
  { id: "calidad", label: "Calidad" },
  { id: "produccion", label: "Producción" },
  { id: "logistica", label: "Logística" },
  { id: "rrhh", label: "RRHH" },
  { id: "regulatory", label: "Regulatorio" },
];

const statusConfig = {
  approved: { label: "Aprobado", icon: CheckCircle, class: "text-success" },
  draft: { label: "Borrador", icon: Clock, class: "text-muted-foreground" },
  review: { label: "En Revisión", icon: AlertCircle, class: "text-warning" },
  obsolete: { label: "Obsoleto", icon: AlertCircle, class: "text-destructive" },
};

interface DocumentsViewProps {
  mode?: "documents" | "processes";
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filters: FiltersState;
  onFiltersChange: (filters: FiltersState) => void;
  onOpenFilters: () => void;
  isNewDocumentOpen: boolean;
  onNewDocumentOpenChange: (open: boolean) => void;
}

export function DocumentsView({
  mode = "documents",
  searchQuery,
  onSearchChange,
  filters,
  onFiltersChange,
  onOpenFilters,
  isNewDocumentOpen,
  onNewDocumentOpenChange,
}: DocumentsViewProps) {
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showAllDocuments, setShowAllDocuments] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const [expandedDocumentId, setExpandedDocumentId] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isOwnersOpen, setIsOwnersOpen] = useState(false);
  const [isSignOpen, setIsSignOpen] = useState(false);
  const [signStatus, setSignStatus] = useState<"idle" | "waiting" | "completed">("idle");
  const [signReason, setSignReason] = useState("");
  const [signerName, setSignerName] = useState("");
  const [signedDocuments, setSignedDocuments] = useState<Record<string, SignedDocument>>({});
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const { canEditContent, refreshPermissions } = usePermissions();

  // New document form state
  const [newDocCode, setNewDocCode] = useState("");
  const [newDocTitle, setNewDocTitle] = useState("");
  const [newDocCategory, setNewDocCategory] = useState("calidad");
  const [newDocDescription, setNewDocDescription] = useState("");
  const [newDocFile, setNewDocFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Real documents from database
  const [dbDocuments, setDbDocuments] = useState<Document[]>([]);

  // Fetch signatures from DB
  const fetchSignatures = useCallback(async () => {
    if (!profile?.company_id) return;
    const { data } = await supabase
      .from("document_signatures")
      .select("*");
    if (data) {
      const mapped: Record<string, SignedDocument> = {};
      for (const sig of data) {
        mapped[sig.document_id] = {
          signedAt: sig.signed_at,
          signerName: sig.signer_name || "Desconocido",
          reason: sig.signature_data || undefined,
          id: sig.id,
        };
      }
      setSignedDocuments(mapped);
    }
  }, [profile?.company_id]);

  const fetchDocuments = useCallback(async () => {
    if (!profile?.company_id) return;
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: false });
    if (!error && data) {
      const ownerUserIds = [...new Set(data.map((doc) => doc.owner_id).filter(Boolean))];

      const { data: ownersData } = ownerUserIds.length
        ? await supabase
            .from("profiles")
            .select("user_id, full_name, email")
            .in("user_id", ownerUserIds)
        : { data: [] };

      const ownerUserMap = new Map(
        (ownersData || []).map((owner) => [
          owner.user_id,
          owner.full_name?.trim() || owner.email || owner.user_id,
        ])
      );

      const mapped: Document[] = data.map((d) => ({
        id: d.id,
        code: d.code,
        title: d.title,
        category: d.category,
        categoryId: d.category.toLowerCase().replace(/ó/g, "o").replace(/í/g, "i"),
        version: String(d.version) + ".0",
        status: d.status as Document["status"],
        lastUpdated: new Date(d.updated_at).toISOString().split("T")[0],
        owner: ownerUserMap.get(d.owner_id) || d.owner_id,
        ownerId: d.owner_id,
        pageCount: 0,
        format: (d.file_type || "pdf") as Document["format"],
        originalAuthor: ownerUserMap.get(d.owner_id) || d.owner_id,
        lastModifiedBy: ownerUserMap.get(d.owner_id) || d.owner_id,
        fileUrl: d.file_url,
      }));
      setDbDocuments(mapped);
    }
  }, [profile?.company_id]);

  useEffect(() => {
    fetchDocuments();
    fetchSignatures();
  }, [fetchDocuments, fetchSignatures]);

  useEffect(() => {
    void refreshPermissions();
  }, [refreshPermissions]);

  const allDocuments = useMemo(() => [...dbDocuments], [dbDocuments]);

  const handleUploadDocument = async () => {
    if (!newDocFile || !newDocCode.trim() || !newDocTitle.trim()) {
      toast({ title: "Campos requeridos", description: "Completa código, título y archivo.", variant: "destructive" });
      return;
    }
    if (!user || !profile?.company_id) {
      toast({ title: "Error", description: "Debes iniciar sesión.", variant: "destructive" });
      return;
    }
    if (!canEditContent) {
      toast({
        title: "Permisos insuficientes",
        description: "Tu sesión no tiene permisos de administrador para subir documentos.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData.user) {
        throw userError ?? new Error("No se pudo obtener el usuario autenticado.");
      }

      const uploaderUser = userData.user;

      console.info("[documents.upload] auth state", {
        sessionError,
        userError,
        sessionUserId: sessionData.session?.user?.id,
        authUserId: uploaderUser.id,
        contextUserId: user.id,
      });

      const fileExt = newDocFile.name.split(".").pop() || "pdf";
      const documentId = crypto.randomUUID();
      const filePath = `${profile.company_id}/${documentId}/${newDocFile.name}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, newDocFile);

      if (uploadError) {
        console.error("[documents.upload] storage.objects insert failed", {
          stage: "storage.objects",
          message: uploadError.message,
          code: uploadError.name,
          details: (uploadError as { details?: string }).details,
          hint: (uploadError as { hint?: string }).hint,
          full: uploadError,
        });
      }

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("documents")
        .getPublicUrl(filePath);

      const fileUrl = urlData.publicUrl;

      const { error: insertError } = await supabase.from("documents").insert({
        id: documentId,
        code: newDocCode.trim(),
        title: newDocTitle.trim(),
        category: newDocCategory.charAt(0).toUpperCase() + newDocCategory.slice(1),
        company_id: profile.company_id,
        owner_id: uploaderUser.id,
        file_type: fileExt,
        file_url: filePath,
        status: "draft" as const,
      });

      if (insertError) {
        console.error("[documents.upload] public.documents insert failed", {
          stage: "public.documents",
          message: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint,
          full: insertError,
        });
      }

      if (insertError) throw insertError;

      toast({ title: "Documento creado", description: "El documento se ha subido correctamente." });
      onNewDocumentOpenChange(false);
      setNewDocCode("");
      setNewDocTitle("");
      setNewDocCategory("calidad");
      setNewDocDescription("");
      setNewDocFile(null);
      fetchDocuments();
    } catch (err: unknown) {
      const uploadError = err as { message?: string; details?: string; hint?: string; code?: string };
      const details = [uploadError.message, uploadError.details, uploadError.hint].filter(Boolean).join(" · ");
      const isPermissionError = uploadError.code === "42501" || /row-level security|permission/i.test(uploadError.message || "");
      toast({
        title: "Error al subir",
        description: isPermissionError
          ? `Permiso denegado por políticas RLS. ${details || "Verifica rol de administrador."}`
          : details || "No se pudo subir el documento.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    if (folderInputRef.current) {
      folderInputRef.current.setAttribute("webkitdirectory", "true");
      folderInputRef.current.setAttribute("directory", "true");
    }
  }, []);

  const categoryCounts = useMemo(() => {
    return allDocuments.reduce((acc, doc) => {
      acc[doc.categoryId] = (acc[doc.categoryId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [allDocuments]);

  const categories = useMemo(
    () =>
      categoryOptions.map((cat) => ({
        ...cat,
        count: cat.id === "all" ? allDocuments.length : categoryCounts[cat.id] ?? 0,
      })),
    [categoryCounts, allDocuments]
  );

  const filteredDocuments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return allDocuments.filter((doc) => {
      const matchesQuery =
        !query ||
        doc.code.toLowerCase().includes(query) ||
        doc.title.toLowerCase().includes(query) ||
        doc.owner.toLowerCase().includes(query) ||
        doc.category.toLowerCase().includes(query);

      const matchesCategory = filters.category === "all" || doc.categoryId === filters.category;
      const matchesStatus = filters.documentStatus === "all" || doc.status === filters.documentStatus;
      
      // Signature status filter
      const isSigned = !!signedDocuments[doc.id];
      const matchesSignature =
        filters.signatureStatus === "all" ||
        (filters.signatureStatus === "signed" && isSigned) ||
        (filters.signatureStatus === "pending" && !isSigned && doc.status === "approved") ||
        (filters.signatureStatus === "not_required" && doc.status !== "approved");

      return matchesQuery && matchesCategory && matchesStatus && matchesSignature;
    });
  }, [searchQuery, filters, signedDocuments]);

  const effectiveItemsPerPage = showAllDocuments ? Math.max(filteredDocuments.length, 1) : itemsPerPage;
  const totalPages = Math.max(1, Math.ceil(filteredDocuments.length / effectiveItemsPerPage));
  const startItem = filteredDocuments.length === 0 ? 0 : (currentPage - 1) * effectiveItemsPerPage + 1;
  const paginatedDocuments = filteredDocuments.slice(
    (currentPage - 1) * effectiveItemsPerPage,
    currentPage * effectiveItemsPerPage
  );

  const handleAction = (action: string, docCode: string) => {
    toast({
      title: action,
      description: `Acción "${action}" ejecutada para ${docCode}`,
    });
  };

  const handleOpenPreview = (doc: Document) => {
    setSelectedDocument(doc);
    setIsPreviewOpen(true);
  };

  const handleToggleSummary = (docId: string) => {
    setExpandedDocumentId((prev) => (prev === docId ? null : docId));
  };

  const handleDownload = async (doc: Document) => {
    const signedDoc = signedDocuments[doc.id];
    if (signedDoc?.file) {
      const url = URL.createObjectURL(signedDoc.file);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${doc.code}-firmado.${doc.format}`;
      link.click();
      URL.revokeObjectURL(url);
    } else if (doc.fileUrl && !doc.fileUrl.startsWith("/docs/")) {
      // Real file in storage — get a signed URL
      const { data, error } = await supabase.storage
        .from("documents")
        .createSignedUrl(doc.fileUrl, 60);
      if (error || !data?.signedUrl) {
        toast({ title: "Error", description: "No se pudo generar el enlace de descarga.", variant: "destructive" });
        return;
      }
      const link = document.createElement("a");
      link.href = data.signedUrl;
      link.download = `${doc.code}.${doc.format}`;
      link.target = "_blank";
      link.click();
    } else {
      toast({ title: "Sin archivo", description: "Este documento no tiene un archivo asociado.", variant: "destructive" });
      return;
    }
    handleAction("Descargar", doc.code);
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(paginatedDocuments.map((doc) => doc.id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleSelect = (docId: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? [...prev, docId] : prev.filter((id) => id !== docId)
    );
  };

  const handleCategoryChange = (categoryId: string) => {
    onFiltersChange({
      ...filters,
      category: categoryId,
    });
    setCurrentPage(1);
  };

  const handleOpenHistory = (doc: Document) => {
    setSelectedDocument(doc);
    setIsHistoryOpen(true);
  };

  const handleOpenOwners = (doc: Document) => {
    setSelectedDocument(doc);
    setIsOwnersOpen(true);
  };

  const handleOpenSign = (doc: Document) => {
    setSelectedDocument(doc);
    const existingSignature = signedDocuments[doc.id];
    setSignStatus(existingSignature ? "completed" : "idle");
    setSignReason(existingSignature?.reason ?? "");
    setSignerName(existingSignature?.signerName ?? "");
    setIsSignOpen(true);
  };

  const handleStartSigning = async () => {
    if (!selectedDocument) return;
    setSignStatus("waiting");
    toast({
      title: "Invocando AutoFirma",
      description: "Se abrirá AutoFirma para firmar con tu DNIe. Asegúrate de tener el lector conectado.",
    });

    try {
      if (selectedDocument.fileUrl && !selectedDocument.fileUrl.startsWith("/docs/")) {
        const { data: urlData, error } = await supabase.storage
          .from("documents")
          .createSignedUrl(selectedDocument.fileUrl, 120);
        
        if (!error && urlData?.signedUrl) {
          const response = await fetch(urlData.signedUrl);
          const blob = await response.blob();
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(",")[1] || "";
            const afirmaUrl = buildAutoFirmaUrl(base64, `${selectedDocument.code}.${selectedDocument.format}`);
            window.location.href = afirmaUrl;
          };
          reader.readAsDataURL(blob);
          return;
        }
      }
      // Fallback without file data
      const afirmaUrl = buildAutoFirmaUrl("", `${selectedDocument.code}.${selectedDocument.format}`);
      window.location.href = afirmaUrl;
    } catch (err) {
      console.error("Error invoking AutoFirma:", err);
      toast({
        title: "Error al invocar AutoFirma",
        description: "Asegúrate de tener AutoFirma instalada. Puedes descargarla desde firmaelectronica.gob.es",
        variant: "destructive",
      });
      setSignStatus("idle");
    }
  };

  const handleCompleteSigning = async (file?: File) => {
    if (!selectedDocument || !user) return;
    if (!signerName.trim()) {
      toast({
        title: "Falta el firmante",
        description: "Indica el nombre del firmante antes de confirmar.",
        variant: "destructive",
      });
      return;
    }

    const signedAt = new Date().toISOString();
    
    const { error } = await supabase.from("document_signatures").insert({
      document_id: selectedDocument.id,
      signed_by: user.id,
      signer_name: signerName.trim(),
      signer_email: user.email || null,
      signature_method: "autofirma_dnie",
      signature_data: signReason.trim() || null,
      signed_at: signedAt,
    });

    if (error) {
      toast({ title: "Error al registrar firma", description: error.message, variant: "destructive" });
      return;
    }

    setSignedDocuments((prev) => ({
      ...prev,
      [selectedDocument.id]: {
        file,
        signedAt,
        signerName: signerName.trim(),
        reason: signReason.trim() || undefined,
      },
    }));
    setSignStatus("completed");
    toast({
      title: "Documento firmado",
      description: `${selectedDocument.code} ha sido firmado con DNIe por ${signerName.trim()}.`,
    });
  };

  const handleSignedFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    handleCompleteSigning(file);
  };

  const handleDownloadForSigning = async (doc: Document) => {
    if (doc.fileUrl && !doc.fileUrl.startsWith("/docs/")) {
      const { data, error } = await supabase.storage
        .from("documents")
        .createSignedUrl(doc.fileUrl, 60);
      if (!error && data?.signedUrl) {
        const link = document.createElement("a");
        link.href = data.signedUrl;
        link.download = `${doc.code}-para-firmar.${doc.format}`;
        link.target = "_blank";
        link.click();
        return;
      }
    }
    toast({ title: "Sin archivo", description: "Este documento no tiene un archivo asociado.", variant: "destructive" });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            data-testid="documents-search"
            placeholder={
              mode === "processes"
                ? "Buscar procesos por código, título o responsable..."
                : "Buscar por código, título o responsable..."
            }
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onOpenFilters} data-testid="documents-filter-button">
            <Filter className="w-4 h-4 mr-2" />
            Filtrar
          </Button>
          <Button
            data-testid="documents-new-button"
            variant="accent"
            onClick={() => onNewDocumentOpenChange(true)}
            disabled={!canEditContent}
            title={canEditContent ? undefined : "Solo Superadmin, Administrador o Editor pueden subir documentos."}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Documento
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Categories Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-card rounded-lg border border-border p-4">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <FolderOpen className="w-4 h-4" />
              Categorías
            </h3>
            <div className="space-y-1">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryChange(cat.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors",
                    filters.category === cat.id
                      ? "bg-accent/10 text-accent font-medium"
                      : "text-muted-foreground hover:bg-secondary"
                  )}
                >
                  <span>{cat.label}</span>
                  <span className="text-xs bg-secondary px-2 py-0.5 rounded-full">
                    {cat.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Documents Table */}
        <div className="lg:col-span-3">
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/20">
              <div className="flex items-center gap-3">
                <Label className="text-xs text-muted-foreground">Mostrar</Label>
                <Select
                  value={showAllDocuments ? "all" : itemsPerPage.toString()}
                  onValueChange={(value) => {
                    if (value === "all") {
                      setShowAllDocuments(true);
                      setCurrentPage(1);
                      return;
                    }
                    setShowAllDocuments(false);
                    setItemsPerPage(Number(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="all">Todos</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground">
                  documentos por página
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {selectedIds.length} seleccionados
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      <Checkbox
                        checked={
                          paginatedDocuments.length > 0 &&
                          selectedIds.length === paginatedDocuments.length
                        }
                        onCheckedChange={(checked) => toggleSelectAll(Boolean(checked))}
                        aria-label="Seleccionar todos"
                      />
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Código
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Título
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Versión
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actualizado
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedDocuments.map((doc) => {
                    const status = statusConfig[doc.status];
                    const StatusIcon = status.icon;
                    return (
                      <Fragment key={doc.id}>
                        <tr
                          className="hover:bg-secondary/30 transition-colors cursor-pointer"
                          onClick={() => handleToggleSummary(doc.id)}
                        >
                          <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                            <Checkbox
                              checked={selectedIds.includes(doc.id)}
                              onCheckedChange={(checked) => toggleSelect(doc.id, Boolean(checked))}
                              aria-label={`Seleccionar ${doc.code}`}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-sm text-foreground">{doc.code}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="text-sm font-medium text-foreground">{doc.title}</p>
                              <p className="text-xs text-muted-foreground">{doc.owner}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-foreground">v{doc.version}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn("inline-flex items-center gap-1.5 text-sm", status.class)}>
                              <StatusIcon className="w-3.5 h-3.5" />
                              {status.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-muted-foreground">{doc.lastUpdated}</span>
                          </td>
                          <td className="px-4 py-3 text-right" onClick={(event) => event.stopPropagation()}>
                            <DocumentActionsMenu
                              documentId={doc.id}
                              isLocked={false}
                              onView={() => handleOpenPreview(doc)}
                              onEdit={() => handleAction("Editar", doc.code)}
                              onViewHistory={() => handleOpenHistory(doc)}
                              onViewOwners={() => handleOpenOwners(doc)}
                              onDownload={() => handleDownload(doc)}
                              onSign={() => handleOpenSign(doc)}
                              onShare={() => handleAction("Compartir", doc.code)}
                              onArchive={() => handleAction("Archivar", doc.code)}
                              onToggleLock={() => handleAction("Bloquear/Desbloquear", doc.code)}
                              onDelete={() => handleAction("Eliminar", doc.code)}
                            />
                          </td>
                        </tr>
                        {expandedDocumentId === doc.id && (
                          <tr className="bg-secondary/20">
                            <td colSpan={7} className="px-4 py-4">
                              <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm text-muted-foreground">
                                  <div>
                                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Formato</p>
                                    <p className="text-sm font-medium text-foreground">{doc.format.toUpperCase()}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Páginas</p>
                                    <p className="text-sm font-medium text-foreground">{doc.pageCount}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Autor original</p>
                                    <p className="text-sm font-medium text-foreground">{doc.originalAuthor}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Versión actual</p>
                                    <p className="text-sm font-medium text-foreground">v{doc.version}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Última modificación</p>
                                    <p className="text-sm font-medium text-foreground">{doc.lastUpdated}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Modificado por</p>
                                    <p className="text-sm font-medium text-foreground">{doc.lastModifiedBy}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Firma</p>
                                    <p className="text-sm font-medium text-foreground">
                                      {signedDocuments[doc.id] ? "Firmado" : "Pendiente"}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <Button variant="outline" onClick={() => handleOpenPreview(doc)}>
                                    Vista previa
                                  </Button>
                                  <Button variant="accent" onClick={() => handleDownload(doc)}>
                                    Descargar
                                  </Button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredDocuments.length === 0 && (
              <div className="py-10 text-center text-sm text-muted-foreground">
                No se encontraron documentos que coincidan con tu búsqueda o filtros.
              </div>
            )}

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-4 py-3 border-t border-border bg-secondary/20">
              <p className="text-sm text-muted-foreground">
                Mostrando {startItem}-
                {Math.min(currentPage * effectiveItemsPerPage, filteredDocuments.length)} de {filteredDocuments.length} documentos
              </p>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-3xl" data-testid="new-document-modal">
          <DialogHeader>
            <DialogTitle>Vista previa del documento</DialogTitle>
            <DialogDescription>
              Visualiza detalles y descarga el archivo.
            </DialogDescription>
          </DialogHeader>

          {selectedDocument && (
            <div className="space-y-4">
              <details className="rounded-lg border border-border p-4" open>
                <summary className="cursor-pointer font-semibold text-foreground">
                  Resumen del documento
                </summary>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 text-sm text-muted-foreground">
                  <div>
                    <p className="font-medium text-foreground">{selectedDocument.title}</p>
                    <p>Código: {selectedDocument.code}</p>
                    <p>Formato: {selectedDocument.format.toUpperCase()}</p>
                    <p>Páginas: {selectedDocument.pageCount}</p>
                  </div>
                  <div>
                    <p>Autor original: {selectedDocument.originalAuthor}</p>
                    <p>Versión actual: v{selectedDocument.version}</p>
                    <p>Última modificación: {selectedDocument.lastUpdated}</p>
                    <p>Modificado por: {selectedDocument.lastModifiedBy}</p>
                    <p>
                      Firma:{" "}
                      {signedDocuments[selectedDocument.id]
                        ? "Firmado con DNIe"
                        : "Pendiente"}
                    </p>
                  </div>
                </div>
              </details>

              <div className="bg-secondary/30 rounded-lg border border-border p-6">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Vista previa {selectedDocument.format.toUpperCase()}</p>
                    <p className="text-xs text-muted-foreground">
                      Previsualización simulada dentro de QualiQ con permisos actuales.
                    </p>
                  </div>
                  {selectedDocument.format === "pdf" && <FileText className="w-7 h-7 text-accent" />}
                  {selectedDocument.format === "docx" && <File className="w-7 h-7 text-accent" />}
                  {selectedDocument.format === "xlsx" && <FileSpreadsheet className="w-7 h-7 text-accent" />}
                </div>

                {selectedDocument.format === "pdf" && (
                  <div className="mt-4 rounded-lg border border-border bg-background p-4 text-sm text-muted-foreground space-y-2">
                    <p className="font-medium text-foreground">Contenido destacado</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Alcance y objetivo del procedimiento.</li>
                      <li>Lista de responsabilidades y aprobaciones.</li>
                      <li>Sección de registros y control de cambios.</li>
                    </ul>
                    <p className="text-xs text-muted-foreground">Previsualización tipo PDF (texto resumido).</p>
                  </div>
                )}

                {selectedDocument.format === "docx" && (
                  <div className="mt-4 rounded-lg border border-border bg-background p-4 text-sm text-muted-foreground space-y-2">
                    <p className="font-medium text-foreground">Secciones del documento</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="rounded-md border border-border p-3">
                        <p className="text-xs uppercase text-muted-foreground">Capítulo 1</p>
                        <p className="text-sm font-medium text-foreground">Introducción y contexto</p>
                      </div>
                      <div className="rounded-md border border-border p-3">
                        <p className="text-xs uppercase text-muted-foreground">Capítulo 2</p>
                        <p className="text-sm font-medium text-foreground">Procedimiento operativo</p>
                      </div>
                      <div className="rounded-md border border-border p-3">
                        <p className="text-xs uppercase text-muted-foreground">Capítulo 3</p>
                        <p className="text-sm font-medium text-foreground">Registros y anexos</p>
                      </div>
                      <div className="rounded-md border border-border p-3">
                        <p className="text-xs uppercase text-muted-foreground">Capítulo 4</p>
                        <p className="text-sm font-medium text-foreground">Control de versiones</p>
                      </div>
                    </div>
                  </div>
                )}

                {selectedDocument.format === "xlsx" && (
                  <div className="mt-4 rounded-lg border border-border bg-background p-4 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground mb-3">Hoja de indicadores clave</p>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs">
                        <thead>
                          <tr className="text-muted-foreground">
                            <th className="text-left pb-2">Proceso</th>
                            <th className="text-left pb-2">Responsable</th>
                            <th className="text-left pb-2">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="text-foreground">
                          <tr>
                            <td className="py-1">Control de riesgos</td>
                            <td className="py-1">Equipo QA</td>
                            <td className="py-1">En revisión</td>
                          </tr>
                          <tr>
                            <td className="py-1">Trazabilidad</td>
                            <td className="py-1">Equipo RA</td>
                            <td className="py-1">Aprobado</td>
                          </tr>
                          <tr>
                            <td className="py-1">Gestión CAPA</td>
                            <td className="py-1">Auditoría interna</td>
                            <td className="py-1">Borrador</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
              Cerrar
            </Button>
            {selectedDocument && (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => handleOpenSign(selectedDocument)}>
                  Firmar con DNIe
                </Button>
                <Button variant="accent" onClick={() => handleDownload(selectedDocument)}>
                  Descargar
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSignOpen} onOpenChange={setIsSignOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Firma electrónica con DNIe</DialogTitle>
            <DialogDescription>
              Firma electrónica cualificada integrada con el DNIe y AutoFirma.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="rounded-lg border border-border bg-secondary/20 p-4 space-y-3">
              <p className="text-sm font-medium text-foreground">Documento seleccionado</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-muted-foreground">
                <div>
                  <p className="font-medium text-foreground">{selectedDocument?.title ?? "Documento"}</p>
                  <p>Código: {selectedDocument?.code ?? "N/D"}</p>
                </div>
                <div>
                  <p>Versión: v{selectedDocument?.version ?? "N/D"}</p>
                  <p>Responsable: {selectedDocument?.owner ?? "N/D"}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div className="rounded-lg border border-border p-4 space-y-2">
                <p className="font-medium text-foreground">Requisitos técnicos</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Lector compatible y DNIe insertado.</li>
                  <li>AutoFirma instalada y en ejecución.</li>
                  <li>Navegador con permisos de firma habilitados.</li>
                </ul>
              </div>
              <div className="rounded-lg border border-border p-4 space-y-2">
                <p className="font-medium text-foreground">Trazabilidad</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Hash del documento (SHA-256) almacenado.</li>
                  <li>Marca temporal y certificado cualificado.</li>
                  <li>Registro de auditoría en la biblioteca.</li>
                </ul>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre del firmante</Label>
                <Input
                  placeholder="Nombre y apellidos"
                  value={signerName}
                  onChange={(event) => setSignerName(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Documento firmado (salida AutoFirma)</Label>
                <Input type="file" accept=".pdf,.docx,.xlsx" onChange={handleSignedFileChange} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Motivo / comentario de firma</Label>
              <Textarea
                placeholder="Añade el motivo de la firma (opcional)"
                rows={3}
                value={signReason}
                onChange={(event) => setSignReason(event.target.value)}
              />
            </div>

            <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground space-y-2">
              <p className="font-medium text-foreground">Estado de la firma</p>
              {signStatus === "idle" && (
                <div className="space-y-2">
                  <p>
                    Haz clic en "Iniciar firma con DNIe" para invocar AutoFirma. Necesitarás el lector y tu DNIe insertado.
                  </p>
                  <p className="text-xs">
                    ¿No tienes AutoFirma?{" "}
                    <a
                      href="https://firmaelectronica.gob.es/Home/Descargas.html"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent underline"
                    >
                      Descárgala aquí
                    </a>
                  </p>
                </div>
              )}
              {signStatus === "waiting" && (
                <div className="space-y-2">
                  <p>
                    AutoFirma ha sido invocada. Autoriza la operación con tu DNIe y luego sube el archivo firmado o haz clic en "Confirmar firma".
                  </p>
                </div>
              )}
              {signStatus === "completed" && (
                <div className="space-y-1 text-success">
                  <p>Firma completada. El documento queda registrado como firmado en la auditoría.</p>
                  {selectedDocument && signedDocuments[selectedDocument.id] && (
                    <p className="text-xs text-muted-foreground">
                      Firmado por {signedDocuments[selectedDocument.id].signerName} el{" "}
                      {new Date(signedDocuments[selectedDocument.id].signedAt).toLocaleString("es-ES")}.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsSignOpen(false)}>
              Cerrar
            </Button>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => selectedDocument && handleDownloadForSigning(selectedDocument)}
                disabled={!selectedDocument || signStatus === "completed"}
              >
                Descargar para firmar
              </Button>
              <Button
                variant="accent"
                onClick={handleStartSigning}
                disabled={signStatus !== "idle"}
              >
                Iniciar firma con DNIe
              </Button>
              {signStatus === "waiting" && (
                <Button
                  variant="success"
                  onClick={() => handleCompleteSigning()}
                  disabled={!signerName.trim()}
                >
                  Confirmar firma
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isNewDocumentOpen} onOpenChange={onNewDocumentOpenChange}>
        <DialogContent className="sm:max-w-3xl" data-testid="new-document-modal">
          <DialogHeader>
            <DialogTitle>Nuevo documento</DialogTitle>
            <DialogDescription>
              Carga un documento individual o realiza una carga masiva mediante plantillas.
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="single">
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="single">Documento individual</TabsTrigger>
              <TabsTrigger value="batch">Carga masiva</TabsTrigger>
            </TabsList>
            <TabsContent value="single" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Código</Label>
                  <Input data-testid="document-code-input" placeholder="PNT-XXX-000" value={newDocCode} onChange={(e) => setNewDocCode(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input data-testid="document-title-input" placeholder="Nombre del documento" value={newDocTitle} onChange={(e) => setNewDocTitle(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <Select defaultValue="manual">
                    <SelectTrigger data-testid="document-category-select">
                      <SelectValue placeholder="Tipo de asignación" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Asignación manual</SelectItem>
                      <SelectItem value="ai">Asignación por IA</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    La asignación automática consume créditos IA y puede sobreescribir categorías manuales.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Área / Categoría específica</Label>
                  <Select value={newDocCategory} onValueChange={setNewDocCategory}>
                    <SelectTrigger data-testid="document-category-select">
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="calidad">Calidad</SelectItem>
                      <SelectItem value="produccion">Producción</SelectItem>
                      <SelectItem value="logistica">Logística</SelectItem>
                      <SelectItem value="rrhh">RRHH</SelectItem>
                      <SelectItem value="regulatory">Regulatory</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descripción / alcance</Label>
                <Textarea placeholder="Describe el alcance del documento..." rows={3} value={newDocDescription} onChange={(e) => setNewDocDescription(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Archivo</Label>
                <Input data-testid="document-file-input" type="file" accept=".pdf,.docx,.xlsx,.xls,.doc" onChange={(e) => setNewDocFile(e.target.files?.[0] || null)} />
              </div>
            </TabsContent>
            <TabsContent value="batch" className="space-y-4 mt-4">
              <div className="bg-secondary/30 border border-border rounded-lg p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <UploadCloud className="w-5 h-5 text-accent" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Carga masiva con Excel</p>
                    <p className="text-xs text-muted-foreground">Sube el archivo de mapeo para asociar metadatos.</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 items-start">
                  <Input type="file" accept=".xlsx,.xls" />
                  <Button variant="outline">Descargar plantilla</Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Asignación por defecto</Label>
                    <Select defaultValue="manual">
                      <SelectTrigger data-testid="document-category-select">
                        <SelectValue placeholder="Asignación" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Manual</SelectItem>
                        <SelectItem value="ai">IA</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Responsable del lote</Label>
                    <Input placeholder="Equipo / responsable" />
                  </div>
                </div>
              </div>

              <div className="bg-secondary/30 border border-border rounded-lg p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <FolderOpen className="w-5 h-5 text-accent" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Carga por carpeta</p>
                    <p className="text-xs text-muted-foreground">Arrastra o selecciona una carpeta completa.</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 items-start">
                  <Input ref={folderInputRef} type="file" multiple />
                  <Button variant="outline">Verificar estructura</Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  La carpeta se relacionará con el Excel para asignar códigos, versiones y categorías.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => onNewDocumentOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              variant="accent"
              disabled={isUploading || !canEditContent}
              title={canEditContent ? undefined : "Solo Superadmin, Administrador o Editor pueden subir documentos."}
              onClick={handleUploadDocument}
              data-testid="document-save-button"
            >
              {isUploading ? "Subiendo..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Historial de versiones</DialogTitle>
            <DialogDescription>
              Cambios registrados para {selectedDocument?.code ?? "el documento seleccionado"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="border border-border rounded-lg p-3">
              <p className="font-medium text-foreground">v{selectedDocument?.version ?? "3.0"}</p>
              <p>Actualizado por {selectedDocument?.lastModifiedBy ?? "Equipo QA"} el {selectedDocument?.lastUpdated ?? "2024-01-05"}.</p>
              <p>Cambios: revisión de secciones y anexos.</p>
            </div>
            <div className="border border-border rounded-lg p-3">
              <p className="font-medium text-foreground">v2.4</p>
              <p>Actualizado por Auditoría interna el 2023-11-18.</p>
              <p>Cambios: ajustes de control de registros.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsHistoryOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isOwnersOpen} onOpenChange={setIsOwnersOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Propietarios del documento</DialogTitle>
            <DialogDescription>Responsables y aprobadores asignados.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center justify-between border border-border rounded-lg p-3">
              <div>
                <p className="font-medium text-foreground">{selectedDocument?.owner ?? "Equipo QA"}</p>
                <p>Propietario principal</p>
              </div>
              <Button variant="outline" size="sm">
                Cambiar
              </Button>
            </div>
            <div className="flex items-center justify-between border border-border rounded-lg p-3">
              <div>
                <p className="font-medium text-foreground">Dirección Técnica</p>
                <p>Aprobador</p>
              </div>
              <Button variant="outline" size="sm">
                Editar
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOwnersOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
