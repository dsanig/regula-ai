import { Shield, TrendingUp } from "lucide-react";

export function ComplianceScore() {
  const score = 87;
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-5 h-5 text-muted-foreground" />
        <h3 className="font-semibold text-foreground">Índice de Cumplimiento</h3>
      </div>

      <div className="flex items-center justify-center py-4">
        <div className="relative">
          <svg className="w-32 h-32 -rotate-90">
            <circle
              cx="64"
              cy="64"
              r="45"
              stroke="currentColor"
              strokeWidth="10"
              fill="none"
              className="text-secondary"
            />
            <circle
              cx="64"
              cy="64"
              r="45"
              stroke="currentColor"
              strokeWidth="10"
              fill="none"
              strokeLinecap="round"
              className="text-accent transition-all duration-1000"
              style={{
                strokeDasharray: circumference,
                strokeDashoffset: strokeDashoffset,
              }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-foreground">{score}%</span>
            <span className="text-xs text-muted-foreground">Puntuación</span>
          </div>
        </div>
      </div>

      <div className="space-y-3 mt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Documentación</span>
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-success rounded-full" style={{ width: "92%" }} />
            </div>
            <span className="text-foreground font-medium">92%</span>
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Procesos</span>
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full" style={{ width: "85%" }} />
            </div>
            <span className="text-foreground font-medium">85%</span>
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Incidencias</span>
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-warning rounded-full" style={{ width: "78%" }} />
            </div>
            <span className="text-foreground font-medium">78%</span>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex items-center gap-2 text-sm text-success">
          <TrendingUp className="w-4 h-4" />
          <span>+3% respecto al mes anterior</span>
        </div>
      </div>
    </div>
  );
}
