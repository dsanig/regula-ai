import { useMemo, useState } from "react";
import {
  Search,
  Filter,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  MoreVertical,
  FileUp,
  ClipboardList,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import type { FiltersState } from "@/components/filters/FilterModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Incident {
  id: string;
  code: string;
  title: string;
  type: "non-conformity" | "deviation" | "incident" | "complaint" | "capa";
  status: "open" | "in_progress" | "pending_approval" | "closed";
  priority: "critical" | "high" | "medium" | "low";
  area: string;
  areaId: string;
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
    areaId: "almacen",
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
    areaId: "produccion",
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
    areaId: "calidad",
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
    areaId: "atencion",
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
    areaId: "seguridad",
    createdAt: "2024-01-05",
    dueDate: "2024-01-12",
    assignee: "Laura Ruiz",
  },
  {
    id: "6",
    code: "NC-2024-003",
    title: "Variación de PH fuera de rango durante mezcla",
    type: "non-conformity",
    status: "open",
    priority: "high",
    area: "Producción",
    areaId: "produccion",
    createdAt: "2024-01-11",
    dueDate: "2024-01-18",
    assignee: "Iván Morales",
  },
  {
    id: "7",
    code: "INC-2024-002",
    title: "No disponibilidad de equipos críticos en turno nocturno",
    type: "incident",
    status: "in_progress",
    priority: "medium",
    area: "Calidad",
    areaId: "calidad",
    createdAt: "2024-01-06",
    dueDate: "2024-01-15",
    assignee: "Lucía Vega",
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

const areaFilters = [
  { id: "all", label: "Todas" },
  { id: "almacen", label: "Almacén" },
  { id: "produccion", label: "Producción" },
  { id: "calidad", label: "Calidad" },
  { id: "seguridad", label: "Seguridad" },
  { id: "atencion", label: "Atención Cliente" },
];

interface IncidentActionsMenuProps {
  onEdit: () => void;
  onAssign: () => void;
  onClose: () => void;
}

function IncidentActionsMenu({ onEdit, onAssign, onClose }: IncidentActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreVertical className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44 bg-popover">
        <DropdownMenuItem onClick={onEdit} className="cursor-pointer">
          Editar incidencia
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onAssign} className="cursor-pointer">
          Asignar responsable
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onClose} className="cursor-pointer text-destructive focus:text-destructive">
          Cerrar incidencia
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface IncidentsViewProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filters: FiltersState;
  onFiltersChange: (filters: FiltersState) => void;
  onOpenFilters: () => void;
  isNewIncidentOpen: boolean;
  onNewIncidentOpenChange: (open: boolean) => void;
  initialIncidentType?: Incident["type"];
}

export function IncidentsView({
  searchQuery,
  onSearchChange,
  filters,
  onFiltersChange,
  onOpenFilters,
  isNewIncidentOpen,
  onNewIncidentOpenChange,
  initialIncidentType,
}: IncidentsViewProps) {
  const [incidentType, setIncidentType] = useState<Incident["type"]>(initialIncidentType ?? "incident");
  const { toast } = useToast();

  const stats = {
    total: mockIncidents.length,
    open: mockIncidents.filter((i) => i.status === "open").length,
    inProgress: mockIncidents.filter((i) => i.status === "in_progress").length,
    overdue: 2,
  };

  const filteredIncidents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return mockIncidents.filter((incident) => {
      const matchesQuery =
        !query ||
        incident.code.toLowerCase().includes(query) ||
        incident.title.toLowerCase().includes(query) ||
        incident.area.toLowerCase().includes(query) ||
        incident.assignee.toLowerCase().includes(query);

      const matchesArea = filters.incidentArea === "all" || incident.areaId === filters.incidentArea;
      const matchesStatus = filters.incidentStatus === "all" || incident.status === filters.incidentStatus;
      const matchesPriority = filters.incidentPriority === "all" || incident.priority === filters.incidentPriority;

      return matchesQuery && matchesArea && matchesStatus && matchesPriority;
    });
  }, [searchQuery, filters]);

  const areaCounts = useMemo(() => {
    return mockIncidents.reduce((acc, incident) => {
      acc[incident.areaId] = (acc[incident.areaId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, []);

  const handleAreaChange = (areaId: string) => {
    onFiltersChange({
      ...filters,
      incidentArea: areaId,
    });
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
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onOpenFilters}>
            <Filter className="w-4 h-4 mr-2" />
            Filtrar
            <ChevronDown className="w-4 h-4 ml-2" />
          </Button>
          <Button variant="accent" onClick={() => onNewIncidentOpenChange(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva Incidencia
          </Button>
        </div>
      </div>

      {/* Area Filters */}
      <div className="flex flex-wrap gap-2">
        {areaFilters.map((area) => (
          <button
            key={area.id}
            onClick={() => handleAreaChange(area.id)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
              filters.incidentArea === area.id
                ? "bg-accent text-accent-foreground border-accent"
                : "border-border text-muted-foreground hover:bg-secondary"
            )}
          >
            {area.label}
            <span className="ml-2 text-[10px] bg-secondary px-2 py-0.5 rounded-full">
              {area.id === "all" ? mockIncidents.length : areaCounts[area.id] ?? 0}
            </span>
          </button>
        ))}
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
              {filteredIncidents.map((incident) => {
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
                        <p className="text-xs text-muted-foreground">
                          {incident.area} • {incident.assignee}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("badge-status", type.color)}>{type.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("badge-status", priority.color)}>{priority.label}</span>
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
                      <IncidentActionsMenu
                        onEdit={() =>
                          toast({
                            title: "Editar incidencia",
                            description: `Editar ${incident.code}`,
                          })
                        }
                        onAssign={() =>
                          toast({
                            title: "Asignar responsable",
                            description: `Asignar responsable para ${incident.code}`,
                          })
                        }
                        onClose={() =>
                          toast({
                            title: "Cerrar incidencia",
                            description: `Cerrar ${incident.code}`,
                          })
                        }
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredIncidents.length === 0 && (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No se encontraron incidencias con los filtros actuales.
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-secondary/20">
          <p className="text-sm text-muted-foreground">
            Mostrando 1-{filteredIncidents.length} de {filteredIncidents.length} incidencias
          </p>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled>
              Anterior
            </Button>
            <Button variant="outline" size="sm" disabled>
              Siguiente
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={isNewIncidentOpen} onOpenChange={(open) => {
        onNewIncidentOpenChange(open);
        if (open && initialIncidentType) {
          setIncidentType(initialIncidentType);
        }
      }}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Nueva incidencia</DialogTitle>
            <DialogDescription>
              Registra una incidencia con seguimiento completo, asignación y documentación asociada.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de incidencia</Label>
                <Select value={incidentType} onValueChange={(value) => setIncidentType(value as Incident["type"])}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="incident">Incidente</SelectItem>
                    <SelectItem value="non-conformity">No conformidad</SelectItem>
                    <SelectItem value="deviation">Desviación</SelectItem>
                    <SelectItem value="complaint">Reclamación</SelectItem>
                    <SelectItem value="capa">CAPA</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Área</Label>
                <Select defaultValue="calidad">
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona área" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="almacen">Almacén</SelectItem>
                    <SelectItem value="produccion">Producción</SelectItem>
                    <SelectItem value="calidad">Calidad</SelectItem>
                    <SelectItem value="seguridad">Seguridad</SelectItem>
                    <SelectItem value="atencion">Atención Cliente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Título</Label>
              <Input placeholder="Describe brevemente la incidencia" />
            </div>

            <div className="space-y-2">
              <Label>Descripción detallada</Label>
              <Textarea placeholder="Detalles, impacto y contexto..." rows={4} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Prioridad</Label>
                <Select defaultValue="medium">
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona prioridad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Crítica</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="low">Baja</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Responsable</Label>
                <Input placeholder="Asignar a..." />
              </div>
              <div className="space-y-2">
                <Label>Fecha límite</Label>
                <Input type="date" />
              </div>
            </div>

            <div className="rounded-lg border border-border p-4 bg-secondary/20 space-y-3">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-accent" />
                <p className="text-sm font-medium text-foreground">Flujo de trabajo (estilo JIRA)</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-destructive" />
                  <span>Asignación</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-warning" />
                  <span>Actualizaciones</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span>Resolución</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="notify" defaultChecked />
                <Label htmlFor="notify" className="text-xs text-muted-foreground">
                  Notificar automáticamente a los responsables asignados
                </Label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Adjuntos (archivos o documentos)</Label>
                <div className="flex items-center gap-2">
                  <Input type="file" multiple />
                  <FileUp className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Documentación final vinculada</Label>
                <Input placeholder="PNT / informe final" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Actualizar estado antes de cerrar</Label>
              <Select defaultValue="open">
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Abierto</SelectItem>
                  <SelectItem value="in_progress">En progreso</SelectItem>
                  <SelectItem value="pending_approval">Pendiente de aprobación</SelectItem>
                  <SelectItem value="closed">Cerrado</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  Cada actualización quedará registrada en el historial de la incidencia.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => onNewIncidentOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              variant="accent"
              onClick={() => {
                toast({
                  title: "Incidencia registrada",
                  description: "La incidencia se ha creado y los responsables han sido notificados.",
                });
                onNewIncidentOpenChange(false);
              }}
            >
              Crear incidencia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
