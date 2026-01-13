import { CheckCircle2, Clock, FileText, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PendingAction {
  id: string;
  title: string;
  type: "approval" | "review" | "update" | "capa";
  dueDate: string;
  isOverdue: boolean;
}

const mockActions: PendingAction[] = [
  {
    id: "1",
    title: "Aprobar PNT-CAL-001 v3.0",
    type: "approval",
    dueDate: "2024-01-12",
    isOverdue: false,
  },
  {
    id: "2",
    title: "Revisar análisis causa raíz NC-2024-001",
    type: "review",
    dueDate: "2024-01-10",
    isOverdue: true,
  },
  {
    id: "3",
    title: "Actualizar Manual de Calidad",
    type: "update",
    dueDate: "2024-01-15",
    isOverdue: false,
  },
  {
    id: "4",
    title: "Implementar CAPA-2024-003",
    type: "capa",
    dueDate: "2024-01-11",
    isOverdue: true,
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

interface PendingActionsProps {
  onViewAll: () => void;
}

export function PendingActions({ onViewAll }: PendingActionsProps) {
  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">Acciones Pendientes</h3>
        <span className="text-xs font-medium px-2 py-1 rounded-full bg-destructive/10 text-destructive">
          {mockActions.filter(a => a.isOverdue).length} vencidas
        </span>
      </div>

      <div className="space-y-3">
        {mockActions.map((action) => {
          const Icon = typeIcons[action.type];
          return (
            <div 
              key={action.id}
              className={cn(
                "p-3 rounded-lg border transition-colors cursor-pointer",
                action.isOverdue 
                  ? "border-destructive/30 bg-destructive/5 hover:bg-destructive/10" 
                  : "border-border hover:bg-secondary/50"
              )}
            >
              <div className="flex items-start gap-3">
                <Icon className={cn(
                  "w-4 h-4 mt-0.5",
                  action.isOverdue ? "text-destructive" : "text-muted-foreground"
                )} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{action.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {typeLabels[action.type]}
                    </span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className={cn(
                      "text-xs flex items-center gap-1",
                      action.isOverdue ? "text-destructive font-medium" : "text-muted-foreground"
                    )}>
                      <Clock className="w-3 h-3" />
                      {action.dueDate}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Button variant="outline" className="w-full mt-4" onClick={onViewAll}>
        Ver todas las acciones
      </Button>
    </div>
  );
}
