import { FileText, AlertTriangle, CheckCircle, Clock, TrendingUp } from "lucide-react";
import { StatCard } from "./StatCard";
import { RecentIncidents } from "./RecentIncidents";
import { ComplianceScore } from "./ComplianceScore";
import { PendingActions } from "./PendingActions";

export function DashboardView() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Documentos Activos"
          value="127"
          subtitle="23 pendientes de revisión"
          icon={FileText}
          variant="default"
        />
        <StatCard
          title="Incidencias Abiertas"
          value="8"
          trend={{ value: 12, isPositive: false }}
          icon={AlertTriangle}
          variant="warning"
        />
        <StatCard
          title="CAPAs en Curso"
          value="5"
          subtitle="2 requieren atención"
          icon={Clock}
          variant="accent"
        />
        <StatCard
          title="SOPs Actualizados"
          value="94%"
          trend={{ value: 5, isPositive: true }}
          icon={CheckCircle}
          variant="success"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Incidents - Spans 2 columns */}
        <div className="lg:col-span-2">
          <RecentIncidents />
        </div>

        {/* Compliance Score */}
        <div>
          <ComplianceScore />
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PendingActions />
        
        {/* Quick Actions */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="font-semibold text-foreground mb-4">Acceso Rápido</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Nuevo PNT", icon: FileText },
              { label: "Registrar Incidencia", icon: AlertTriangle },
              { label: "Crear CAPA", icon: CheckCircle },
              { label: "Ver Informes", icon: TrendingUp },
            ].map((action) => (
              <button
                key={action.label}
                className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-secondary/50 transition-colors text-left"
              >
                <action.icon className="w-5 h-5 text-accent" />
                <span className="text-sm font-medium text-foreground">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
