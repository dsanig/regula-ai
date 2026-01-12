import { useState } from "react";
import { 
  FileText, 
  Search, 
  Filter, 
  Plus, 
  FolderOpen, 
  ChevronRight,
  MoreVertical,
  CheckCircle,
  Clock,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Document {
  id: string;
  code: string;
  title: string;
  category: string;
  version: string;
  status: "approved" | "draft" | "review" | "obsolete";
  lastUpdated: string;
  owner: string;
}

const mockDocuments: Document[] = [
  {
    id: "1",
    code: "PNT-CAL-001",
    title: "Control de Documentos y Registros",
    category: "Calidad",
    version: "3.0",
    status: "approved",
    lastUpdated: "2024-01-05",
    owner: "María García",
  },
  {
    id: "2",
    code: "PNT-PRD-002",
    title: "Fabricación y Control de Producto",
    category: "Producción",
    version: "2.1",
    status: "review",
    lastUpdated: "2024-01-08",
    owner: "Carlos López",
  },
  {
    id: "3",
    code: "PNT-ALM-003",
    title: "Control de Almacén y Stock",
    category: "Logística",
    version: "1.5",
    status: "approved",
    lastUpdated: "2023-12-15",
    owner: "Ana Martínez",
  },
  {
    id: "4",
    code: "PNT-VAL-004",
    title: "Validación de Procesos",
    category: "Calidad",
    version: "4.0",
    status: "draft",
    lastUpdated: "2024-01-10",
    owner: "Pedro Sánchez",
  },
  {
    id: "5",
    code: "MAN-CAL-001",
    title: "Manual de Calidad",
    category: "Calidad",
    version: "5.2",
    status: "approved",
    lastUpdated: "2023-11-20",
    owner: "Director Calidad",
  },
];

const categories = [
  { id: "all", label: "Todos", count: 127 },
  { id: "calidad", label: "Calidad", count: 45 },
  { id: "produccion", label: "Producción", count: 32 },
  { id: "logistica", label: "Logística", count: 28 },
  { id: "rrhh", label: "RRHH", count: 12 },
  { id: "regulatory", label: "Regulatory", count: 10 },
];

const statusConfig = {
  approved: { label: "Aprobado", icon: CheckCircle, class: "text-success" },
  draft: { label: "Borrador", icon: Clock, class: "text-muted-foreground" },
  review: { label: "En Revisión", icon: AlertCircle, class: "text-warning" },
  obsolete: { label: "Obsoleto", icon: AlertCircle, class: "text-destructive" },
};

export function DocumentsView() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por código, título o responsable..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filtrar
          </Button>
          <Button variant="accent">
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
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors",
                    selectedCategory === cat.id
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
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
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
                  {mockDocuments.map((doc) => {
                    const status = statusConfig[doc.status];
                    const StatusIcon = status.icon;
                    return (
                      <tr key={doc.id} className="hover:bg-secondary/30 transition-colors cursor-pointer">
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
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-secondary/20">
              <p className="text-sm text-muted-foreground">
                Mostrando 1-5 de 127 documentos
              </p>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled>
                  Anterior
                </Button>
                <Button variant="outline" size="sm">
                  Siguiente
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
