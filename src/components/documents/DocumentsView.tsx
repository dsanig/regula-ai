import { useMemo, useRef, useState, useEffect } from "react";
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
  pageCount: number;
  format: "pdf" | "docx" | "xlsx";
  originalAuthor: string;
  lastModifiedBy: string;
  fileUrl: string;
}

const mockDocuments: Document[] = [
  {
    id: "1",
    code: "PNT-CAL-001",
    title: "Control de Documentos y Registros",
    category: "Calidad",
    categoryId: "calidad",
    version: "3.0",
    status: "approved",
    lastUpdated: "2024-01-05",
    owner: "María García",
    pageCount: 24,
    format: "pdf",
    originalAuthor: "Sofía Ruiz",
    lastModifiedBy: "María García",
    fileUrl: "/docs/PNT-CAL-001.pdf",
  },
  {
    id: "2",
    code: "PNT-PRD-002",
    title: "Fabricación y Control de Producto",
    category: "Producción",
    categoryId: "produccion",
    version: "2.1",
    status: "review",
    lastUpdated: "2024-01-08",
    owner: "Carlos López",
    pageCount: 31,
    format: "docx",
    originalAuthor: "Carlos López",
    lastModifiedBy: "Equipo QA",
    fileUrl: "/docs/PNT-PRD-002.docx",
  },
  {
    id: "3",
    code: "PNT-ALM-003",
    title: "Control de Almacén y Stock",
    category: "Logística",
    categoryId: "logistica",
    version: "1.5",
    status: "approved",
    lastUpdated: "2023-12-15",
    owner: "Ana Martínez",
    pageCount: 18,
    format: "pdf",
    originalAuthor: "Ana Martínez",
    lastModifiedBy: "Laura Ruiz",
    fileUrl: "/docs/PNT-ALM-003.pdf",
  },
  {
    id: "4",
    code: "PNT-VAL-004",
    title: "Validación de Procesos",
    category: "Calidad",
    categoryId: "calidad",
    version: "4.0",
    status: "draft",
    lastUpdated: "2024-01-10",
    owner: "Pedro Sánchez",
    pageCount: 12,
    format: "docx",
    originalAuthor: "Pedro Sánchez",
    lastModifiedBy: "Pedro Sánchez",
    fileUrl: "/docs/PNT-VAL-004.docx",
  },
  {
    id: "5",
    code: "MAN-CAL-001",
    title: "Manual de Calidad",
    category: "Calidad",
    categoryId: "calidad",
    version: "5.2",
    status: "approved",
    lastUpdated: "2023-11-20",
    owner: "Director Calidad",
    pageCount: 88,
    format: "pdf",
    originalAuthor: "Dirección Técnica",
    lastModifiedBy: "Director Calidad",
    fileUrl: "/docs/MAN-CAL-001.pdf",
  },
  {
    id: "6",
    code: "PNT-RRH-010",
    title: "Gestión de Formación y Competencias",
    category: "RRHH",
    categoryId: "rrhh",
    version: "1.3",
    status: "approved",
    lastUpdated: "2023-12-12",
    owner: "Lucía Vega",
    pageCount: 16,
    format: "pdf",
    originalAuthor: "Lucía Vega",
    lastModifiedBy: "Lucía Vega",
    fileUrl: "/docs/PNT-RRH-010.pdf",
  },
  {
    id: "7",
    code: "PNT-REG-014",
    title: "Revisión de Requisitos Regulatorios",
    category: "Regulatory",
    categoryId: "regulatory",
    version: "2.0",
    status: "review",
    lastUpdated: "2024-01-02",
    owner: "Equipo RA",
    pageCount: 22,
    format: "xlsx",
    originalAuthor: "Equipo RA",
    lastModifiedBy: "Equipo RA",
    fileUrl: "/docs/PNT-REG-014.xlsx",
  },
  {
    id: "8",
    code: "PNT-PRD-005",
    title: "Limpieza y Sanitización de Equipos",
    category: "Producción",
    categoryId: "produccion",
    version: "3.2",
    status: "approved",
    lastUpdated: "2024-01-04",
    owner: "Javier Soto",
    pageCount: 14,
    format: "pdf",
    originalAuthor: "Javier Soto",
    lastModifiedBy: "Javier Soto",
    fileUrl: "/docs/PNT-PRD-005.pdf",
  },
  {
    id: "9",
    code: "PNT-LOG-008",
    title: "Gestión de Transporte y Distribución",
    category: "Logística",
    categoryId: "logistica",
    version: "1.0",
    status: "draft",
    lastUpdated: "2024-01-11",
    owner: "Rosa Díaz",
    pageCount: 9,
    format: "docx",
    originalAuthor: "Rosa Díaz",
    lastModifiedBy: "Equipo Logística",
    fileUrl: "/docs/PNT-LOG-008.docx",
  },
  {
    id: "10",
    code: "PNT-CAL-011",
    title: "Gestión de CAPAs",
    category: "Calidad",
    categoryId: "calidad",
    version: "2.4",
    status: "approved",
    lastUpdated: "2023-12-28",
    owner: "Marta Romero",
    pageCount: 26,
    format: "pdf",
    originalAuthor: "Marta Romero",
    lastModifiedBy: "Marta Romero",
    fileUrl: "/docs/PNT-CAL-011.pdf",
  },
  {
    id: "11",
    code: "PNT-PRD-006",
    title: "Control de Cambios en Producción",
    category: "Producción",
    categoryId: "produccion",
    version: "1.8",
    status: "review",
    lastUpdated: "2024-01-09",
    owner: "Iván Morales",
    pageCount: 20,
    format: "xlsx",
    originalAuthor: "Iván Morales",
    lastModifiedBy: "Equipo QA",
    fileUrl: "/docs/PNT-PRD-006.xlsx",
  },
  {
    id: "12",
    code: "PNT-CAL-015",
    title: "Gestión de Riesgos de Calidad",
    category: "Calidad",
    categoryId: "calidad",
    version: "1.2",
    status: "approved",
    lastUpdated: "2024-01-03",
    owner: "Natalia Perez",
    pageCount: 17,
    format: "pdf",
    originalAuthor: "Natalia Perez",
    lastModifiedBy: "Natalia Perez",
    fileUrl: "/docs/PNT-CAL-015.pdf",
  },
];

const categoryOptions = [
  { id: "all", label: "Todos" },
  { id: "calidad", label: "Calidad" },
  { id: "produccion", label: "Producción" },
  { id: "logistica", label: "Logística" },
  { id: "rrhh", label: "RRHH" },
  { id: "regulatory", label: "Regulatory" },
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
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (folderInputRef.current) {
      folderInputRef.current.setAttribute("webkitdirectory", "true");
      folderInputRef.current.setAttribute("directory", "true");
    }
  }, []);

  const categoryCounts = useMemo(() => {
    return mockDocuments.reduce((acc, doc) => {
      acc[doc.categoryId] = (acc[doc.categoryId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, []);

  const categories = useMemo(
    () =>
      categoryOptions.map((cat) => ({
        ...cat,
        count: cat.id === "all" ? mockDocuments.length : categoryCounts[cat.id] ?? 0,
      })),
    [categoryCounts]
  );

  const filteredDocuments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return mockDocuments.filter((doc) => {
      const matchesQuery =
        !query ||
        doc.code.toLowerCase().includes(query) ||
        doc.title.toLowerCase().includes(query) ||
        doc.owner.toLowerCase().includes(query) ||
        doc.category.toLowerCase().includes(query);

      const matchesCategory = filters.category === "all" || doc.categoryId === filters.category;
      const matchesStatus = filters.documentStatus === "all" || doc.status === filters.documentStatus;
      return matchesQuery && matchesCategory && matchesStatus;
    });
  }, [searchQuery, filters]);

  const totalPages = Math.max(1, Math.ceil(filteredDocuments.length / itemsPerPage));
  const paginatedDocuments = filteredDocuments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
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

  const handleOpenHistory = (doc: Document) => {
    setSelectedDocument(doc);
    setIsHistoryOpen(true);
  };

  const handleDownload = (doc: Document) => {
    const link = document.createElement("a");
    link.href = doc.fileUrl;
    link.download = `${doc.code}.${doc.format}`;
    link.click();
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
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
          <Button variant="outline" onClick={onOpenFilters}>
            <Filter className="w-4 h-4 mr-2" />
            Filtrar
          </Button>
          <Button variant="accent" onClick={() => onNewDocumentOpenChange(true)}>
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
                <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                  setItemsPerPage(Number(value));
                  setCurrentPage(1);
                }}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
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
                      <tr
                        key={doc.id}
                        className="hover:bg-secondary/30 transition-colors cursor-pointer"
                        onClick={() => handleOpenPreview(doc)}
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
                            onViewOwners={() => handleAction("Propietarios", doc.code)}
                            onDownload={() => handleDownload(doc)}
                            onShare={() => handleAction("Compartir", doc.code)}
                            onArchive={() => handleAction("Archivar", doc.code)}
                            onToggleLock={() => handleAction("Bloquear/Desbloquear", doc.code)}
                            onDelete={() => handleAction("Eliminar", doc.code)}
                          />
                        </td>
                      </tr>
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
                Mostrando {(currentPage - 1) * itemsPerPage + 1}-
                {Math.min(currentPage * itemsPerPage, filteredDocuments.length)} de {filteredDocuments.length} documentos
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
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Vista previa del documento</DialogTitle>
            <DialogDescription>
              Visualiza detalles y descarga el archivo.
            </DialogDescription>
          </DialogHeader>

          {selectedDocument && (
            <div className="space-y-4">
              <details className="rounded-lg border border-border p-4">
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
                  </div>
                </div>
              </details>

              <div className="bg-secondary/30 rounded-lg border border-border p-6 flex items-center justify-center text-center">
                <div className="space-y-2">
                  {selectedDocument.format === "pdf" && <FileText className="w-8 h-8 text-accent mx-auto" />}
                  {selectedDocument.format === "docx" && <File className="w-8 h-8 text-accent mx-auto" />}
                  {selectedDocument.format === "xlsx" && <FileSpreadsheet className="w-8 h-8 text-accent mx-auto" />}
                  <p className="text-sm font-medium text-foreground">
                    Vista previa {selectedDocument.format.toUpperCase()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    La previsualización se renderiza dentro de QualiQ con los permisos actuales.
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
              Cerrar
            </Button>
            {selectedDocument && (
              <Button variant="accent" onClick={() => handleDownload(selectedDocument)}>
                Descargar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Historial de versiones</DialogTitle>
            <DialogDescription>
              Revisa cambios anteriores y restaura si es necesario.
            </DialogDescription>
          </DialogHeader>

          {selectedDocument && (
            <div className="space-y-3">
              {[
                { version: selectedDocument.version, date: selectedDocument.lastUpdated, author: selectedDocument.lastModifiedBy, status: "Actual" },
                { version: "2.5", date: "2023-10-12", author: selectedDocument.originalAuthor, status: "Aprobada" },
                { version: "2.0", date: "2023-06-08", author: selectedDocument.originalAuthor, status: "Aprobada" },
              ].map((entry, index) => (
                <div
                  key={`${entry.version}-${index}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-border"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">v{entry.version}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.date} • {entry.author}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-secondary px-2 py-1 rounded-full">{entry.status}</span>
                    <Button variant="outline" size="sm">
                      Ver cambios
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsHistoryOpen(false)}>
              Cerrar
            </Button>
            <Button
              variant="accent"
              onClick={() => {
                if (selectedDocument) {
                  toast({
                    title: "Versión restaurada",
                    description: `Se restauró la versión seleccionada de ${selectedDocument.code}.`,
                  });
                }
                setIsHistoryOpen(false);
              }}
            >
              Restaurar versión
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isNewDocumentOpen} onOpenChange={onNewDocumentOpenChange}>
        <DialogContent className="sm:max-w-3xl">
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
                  <Input placeholder="PNT-XXX-000" />
                </div>
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input placeholder="Nombre del documento" />
                </div>
                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <Select defaultValue="manual">
                    <SelectTrigger>
                      <SelectValue placeholder="Tipo de asignación" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Asignación manual</SelectItem>
                      <SelectItem value="ai">Asignación por IA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Área / Categoría específica</Label>
                  <Select defaultValue="calidad">
                    <SelectTrigger>
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
                <Textarea placeholder="Describe el alcance del documento..." rows={3} />
              </div>

              <div className="space-y-2">
                <Label>Archivo</Label>
                <Input type="file" />
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
                <Input type="file" accept=".xlsx,.xls" />
              </div>

              <div className="bg-secondary/30 border border-border rounded-lg p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <FolderOpen className="w-5 h-5 text-accent" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Carga por carpeta</p>
                    <p className="text-xs text-muted-foreground">Arrastra o selecciona una carpeta completa.</p>
                  </div>
                </div>
                <Input ref={folderInputRef} type="file" multiple />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => onNewDocumentOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              variant="accent"
              onClick={() => {
                toast({
                  title: "Documento cargado",
                  description: "El documento se ha añadido a la biblioteca.",
                });
                onNewDocumentOpenChange(false);
              }}
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
