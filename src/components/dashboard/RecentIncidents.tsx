import { AlertTriangle, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Incident {
  id: string;
  title: string;
  type: "non-conformity" | "deviation" | "incident" | "complaint";
  status: "open" | "in_progress" | "closed";
  priority: "high" | "medium" | "low";
  createdAt: string;
}

const mockIncidents: Incident[] = [
  {
    id: "NC-2024-001",
    title: "Desviación en control de temperatura almacén",
    type: "deviation",
    status: "open",
    priority: "high",
    createdAt: "2024-01-10",
  },
  {
    id: "NC-2024-002",
    title: "Documentación incompleta lote 2024-B12",
    type: "non-conformity",
    status: "in_progress",
    priority: "medium",
    createdAt: "2024-01-09",
  },
  {
    id: "INC-2024-003",
    title: "Fallo en sistema de control de acceso",
    type: "incident",
    status: "in_progress",
    priority: "high",
    createdAt: "2024-01-08",
  },
  {
    id: "RCL-2024-001",
    title: "Reclamación cliente - etiquetado incorrecto",
    type: "complaint",
    status: "open",
    priority: "medium",
    createdAt: "2024-01-07",
  },
];

const statusLabels = {
  open: "Abierto",
  in_progress: "En Progreso",
  closed: "Cerrado",
};

const typeLabels = {
  "non-conformity": "No Conformidad",
  deviation: "Desviación",
  incident: "Incidente",
  complaint: "Reclamación",
};

const priorityStyles = {
  high: "text-destructive",
  medium: "text-warning",
  low: "text-muted-foreground",
};

export function RecentIncidents() {
  return (
    <div className="bg-card rounded-lg border border-border">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">Incidencias Recientes</h3>
        </div>
        <Button variant="ghost" size="sm" className="text-accent">
          Ver todas
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
      
      <div className="divide-y divide-border">
        {mockIncidents.map((incident) => (
          <div key={incident.id} className="p-4 hover:bg-secondary/50 transition-colors cursor-pointer">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-muted-foreground">{incident.id}</span>
                  <span className={cn("badge-status", {
                    "badge-open": incident.status === "open",
                    "badge-progress": incident.status === "in_progress",
                    "badge-closed": incident.status === "closed",
                  })}>
                    {statusLabels[incident.status]}
                  </span>
                </div>
                <p className="text-sm font-medium text-foreground truncate">{incident.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {typeLabels[incident.type]}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={cn("text-xs font-medium", priorityStyles[incident.priority])}>
                  {incident.priority === "high" ? "Alta" : incident.priority === "medium" ? "Media" : "Baja"}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {incident.createdAt}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
