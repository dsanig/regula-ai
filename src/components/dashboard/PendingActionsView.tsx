import { useMemo, useState } from "react";
import { CheckCircle2, Clock, FileText, AlertCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface PendingAction {
  id: string;
  title: string;
  type: "approval" | "review" | "update" | "capa";
  dueDate: string;
  isOverdue: boolean;
  owner: string;
}

const mockActions: PendingAction[] = [
  {
    id: "1",
    title: "Aprobar PNT-CAL-001 v3.0",
    type: "approval",
    dueDate: "2024-01-12",
    isOverdue: false,
    owner: "María García",
  },
  {
    id: "2",
    title: "Revisar análisis causa raíz NC-2024-001",
    type: "review",
    dueDate: "2024-01-10",
    isOverdue: true,
    owner: "Carlos López",
  },
  {
    id: "3",
    title: "Actualizar Manual de Calidad",
    type: "update",
    dueDate: "2024-01-15",
    isOverdue: false,
    owner: "Ana Martínez",
  },
  {
    id: "4",
    title: "Implementar CAPA-2024-003",
    type: "capa",
    dueDate: "2024-01-11",
    isOverdue: true,
    owner: "Pedro Sánchez",
  },
  {
    id: "5",
    title: "Validar desviación INC-2024-002",
    type: "review",
    dueDate: "2024-01-18",
    isOverdue: false,
    owner: "Lucía Vega",
  },
];

const typeIcons = {
  approval: CheckCircle2,
  review: FileText,
  update: FileText,
  capa: AlertCircle,
};

const typeLabels = {
  approval: "Aprobación",
  review: "Revisión",
  update: "Actualización",
  capa: "CAPA",
};

export function PendingActionsView() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredActions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return mockActions.filter((action) =>
      !query || action.title.toLowerCase().includes(query) || action.owner.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar acciones pendientes..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="accent">Actualizar prioridades</Button>
      </div>

      <div className="bg-card rounded-lg border border-border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Acciones pendientes</h3>
          <span className="text-xs font-medium px-2 py-1 rounded-full bg-destructive/10 text-destructive">
            {mockActions.filter((a) => a.isOverdue).length} vencidas
          </span>
        </div>

        <div className="space-y-3">
          {filteredActions.map((action) => {
            const Icon = typeIcons[action.type];
            return (
              <div
                key={action.id}
                className={cn(
                  "p-4 rounded-lg border transition-colors",
                  action.isOverdue
                    ? "border-destructive/30 bg-destructive/5 hover:bg-destructive/10"
                    : "border-border hover:bg-secondary/50"
                )}
              >
                <div className="flex items-start gap-3">
                  <Icon className={cn("w-4 h-4 mt-0.5", action.isOverdue ? "text-destructive" : "text-muted-foreground")} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{action.title}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">{typeLabels[action.type]}</span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className={cn("text-xs flex items-center gap-1", action.isOverdue ? "text-destructive font-medium" : "text-muted-foreground")}>
                        <Clock className="w-3 h-3" />
                        {action.dueDate}
                      </span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">Responsable: {action.owner}</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Revisar
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
