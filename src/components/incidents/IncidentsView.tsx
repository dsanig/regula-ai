import { useState } from "react";
import { 
  AlertTriangle, 
  Search, 
  Filter, 
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  MoreVertical
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Incident {
  id: string;
  code: string;
  title: string;
  type: "non-conformity" | "deviation" | "incident" | "complaint" | "capa";
  status: "open" | "in_progress" | "pending_approval" | "closed";
  priority: "critical" | "high" | "medium" | "low";
  area: string;
  createdAt: string;
  dueDate: string;
  assignee: string;
}

const mockIncidents: Incident[] = [
  {
    id: "1",
    code: "NC-2024-001",
    title: "Desviación en control de temperatura almacén zona A",
    type: "deviation",
    status: "open",
    priority: "critical",
    area: "Almacén",
    createdAt: "2024-01-10",
    dueDate: "2024-01-17",
    assignee: "María García",
  },
  {
    id: "2",
    code: "NC-2024-002",
    title: "Documentación incompleta en lote de producción 2024-B12",
    type: "non-conformity",
    status: "in_progress",
    priority: "high",
    area: "Producción",
    createdAt: "2024-01-09",
    dueDate: "2024-01-16",
    assignee: "Carlos López",
  },
  {
    id: "3",
    code: "CAPA-2024-001",
    title: "Acción correctiva: Actualización procedimiento control temperatura",
    type: "capa",
    status: "in_progress",
    priority: "high",
    area: "Calidad",
    createdAt: "2024-01-08",
    dueDate: "2024-01-22",
    assignee: "Ana Martínez",
  },
  {
    id: "4",
    code: "RCL-2024-001",
    title: "Reclamación cliente: Etiquetado incorrecto producto X-200",
    type: "complaint",
    status: "pending_approval",
    priority: "medium",
    area: "Atención Cliente",
    createdAt: "2024-01-07",
    dueDate: "2024-01-14",
    assignee: "Pedro Sánchez",
  },
  {
    id: "5",
    code: "INC-2024-001",
    title: "Fallo en sistema de control de acceso área estéril",
    type: "incident",
    status: "closed",
    priority: "high",
    area: "Seguridad",
    createdAt: "2024-01-05",
    dueDate: "2024-01-12",
    assignee: "Laura Ruiz",
  },
];

const typeConfig = {
  "non-conformity": { label: "No Conformidad", color: "bg-destructive/10 text-destructive" },
  deviation: { label: "Desviación", color: "bg-warning/10 text-warning" },
  incident: { label: "Incidente", color: "bg-accent/10 text-accent" },
  complaint: { label: "Reclamación", color: "bg-primary/10 text-primary" },
  capa: { label: "CAPA", color: "bg-success/10 text-success" },
};

const statusConfig = {
  open: { label: "Abierto", icon: AlertCircle, color: "text-destructive" },
  in_progress: { label: "En Progreso", icon: Clock, color: "text-warning" },
  pending_approval: { label: "Pendiente Aprobación", icon: Clock, color: "text-accent" },
  closed: { label: "Cerrado", icon: CheckCircle, color: "text-success" },
};

const priorityConfig = {
  critical: { label: "Crítica", color: "bg-destructive text-destructive-foreground" },
  high: { label: "Alta", color: "bg-warning text-warning-foreground" },
  medium: { label: "Media", color: "bg-accent text-accent-foreground" },
  low: { label: "Baja", color: "bg-muted text-muted-foreground" },
};

export function IncidentsView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const stats = {
    total: mockIncidents.length,
    open: mockIncidents.filter(i => i.status === "open").length,
    inProgress: mockIncidents.filter(i => i.status === "in_progress").length,
    overdue: 2,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">Total Incidencias</p>
          <p className="text-2xl font-bold text-foreground mt-1">{stats.total}</p>
        </div>
        <div className="bg-card rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm text-muted-foreground">Abiertas</p>
          <p className="text-2xl font-bold text-destructive mt-1">{stats.open}</p>
        </div>
        <div className="bg-card rounded-lg border border-warning/30 bg-warning/5 p-4">
          <p className="text-sm text-muted-foreground">En Progreso</p>
          <p className="text-2xl font-bold text-warning mt-1">{stats.inProgress}</p>
        </div>
        <div className="bg-card rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm text-muted-foreground">Vencidas</p>
          <p className="text-2xl font-bold text-destructive mt-1">{stats.overdue}</p>
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por código, título o área..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filtrar
            <ChevronDown className="w-4 h-4 ml-2" />
          </Button>
          <Button variant="accent">
            <Plus className="w-4 h-4 mr-2" />
            Nueva Incidencia
          </Button>
        </div>
      </div>

      {/* Incidents List */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Código
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Descripción
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Tipo
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Prioridad
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Estado
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Fecha Límite
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {mockIncidents.map((incident) => {
                const type = typeConfig[incident.type];
                const status = statusConfig[incident.status];
                const priority = priorityConfig[incident.priority];
                const StatusIcon = status.icon;
                
                return (
                  <tr key={incident.id} className="hover:bg-secondary/30 transition-colors cursor-pointer">
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm text-foreground">{incident.code}</span>
                    </td>
                    <td className="px-4 py-3 max-w-sm">
                      <div>
                        <p className="text-sm font-medium text-foreground truncate">{incident.title}</p>
                        <p className="text-xs text-muted-foreground">{incident.area} • {incident.assignee}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("badge-status", type.color)}>
                        {type.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("badge-status", priority.color)}>
                        {priority.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center gap-1.5 text-sm", status.color)}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-muted-foreground">{incident.dueDate}</span>
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
            Mostrando 1-5 de 42 incidencias
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
  );
}
