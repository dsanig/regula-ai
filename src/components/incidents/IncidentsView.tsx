import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle, Clock, Filter, Link as LinkIcon, Plus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { FiltersState } from "@/components/filters/FilterModal";

type IncidentType = "incidencia" | "reclamacion" | "desviacion" | "otra";

interface Incident {
  id: string;
  title: string;
  description: string | null;
  incidencia_type: IncidentType;
  audit_id: string | null;
  responsible_id: string | null;
  status: "open" | "in_progress" | "closed" | "overdue";
  created_at: string;
}

interface AuditRef {
  id: string;
  title: string;
}

interface UserRef {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface IncidentsViewProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filters: FiltersState;
  onFiltersChange: (filters: FiltersState) => void;
  onOpenFilters: () => void;
  isNewIncidentOpen: boolean;
  onNewIncidentOpenChange: (open: boolean) => void;
  initialIncidentType?: IncidentType;
}

const typeLabels: Record<IncidentType, string> = {
  incidencia: "Incidencia",
  reclamacion: "Reclamación",
  desviacion: "Desviación",
  otra: "Otra",
};

const statusConfig = {
  open: { label: "Abierto", icon: AlertCircle, color: "text-destructive" },
  in_progress: { label: "En progreso", icon: Clock, color: "text-warning" },
  closed: { label: "Cerrado", icon: CheckCircle, color: "text-success" },
  overdue: { label: "Vencido", icon: AlertCircle, color: "text-warning" },
};

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
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [audits, setAudits] = useState<AuditRef[]>([]);
  const [users, setUsers] = useState<UserRef[]>([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    incidencia_type: initialIncidentType ?? ("incidencia" as IncidentType),
    audit_id: "none",
    responsible_id: "none",
    status: "open",
  });
  const { toast } = useToast();

  const loadData = async () => {
    const [{ data: incidenciasData, error: incidenciasError }, { data: auditsData }, { data: usersData }] = await Promise.all([
      (supabase as any)
        .from("incidencias")
        .select("id,title,description,incidencia_type,audit_id,responsible_id,status,created_at")
        .order("created_at", { ascending: false }),
      (supabase as any).from("audits").select("id,title").order("created_at", { ascending: false }),
      (supabase as any).from("profiles").select("id,full_name,email"),
    ]);

    if (incidenciasError) {
      toast({ title: "Error", description: incidenciasError.message, variant: "destructive" });
      return;
    }

    setIncidents((incidenciasData ?? []) as Incident[]);
    setAudits((auditsData ?? []) as AuditRef[]);
    setUsers((usersData ?? []) as UserRef[]);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filteredIncidents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return incidents.filter((incident) => {
      const matchesQuery = !query || incident.title.toLowerCase().includes(query) || (incident.description ?? "").toLowerCase().includes(query);
      const matchesStatus = filters.incidentStatus === "all" || incident.status === filters.incidentStatus;
      return matchesQuery && matchesStatus;
    });
  }, [incidents, searchQuery, filters.incidentStatus]);

  const createIncident = async () => {
    const { error } = await (supabase as any).from("incidencias").insert({
      title: form.title,
      description: form.description || null,
      incidencia_type: form.incidencia_type,
      audit_id: form.audit_id === "none" ? null : form.audit_id,
      responsible_id: form.responsible_id === "none" ? null : form.responsible_id,
      status: form.status,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Incidencia creada", description: "Puedes crearla vinculada a una auditoría o standalone." });
    onNewIncidentOpenChange(false);
    setForm({ title: "", description: "", incidencia_type: initialIncidentType ?? "incidencia", audit_id: "none", responsible_id: "none", status: "open" });
    await loadData();
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total</p><p className="text-2xl font-semibold">{incidents.length}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Abiertas</p><p className="text-2xl font-semibold">{incidents.filter((i) => i.status === "open").length}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Cerradas</p><p className="text-2xl font-semibold">{incidents.filter((i) => i.status === "closed").length}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>Incidencias</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9 w-[260px]" placeholder="Buscar incidencias..." value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} />
            </div>
            <Button variant="outline" onClick={onOpenFilters}><Filter className="w-4 h-4 mr-1" />Filtros</Button>
            <Button onClick={() => onNewIncidentOpenChange(true)} data-testid="incidents-new-button"><Plus className="w-4 h-4 mr-1" />Nueva incidencia</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {filteredIncidents.map((incident) => {
            const status = statusConfig[incident.status] ?? statusConfig.open;
            const StatusIcon = status.icon;
            const auditTitle = audits.find((audit) => audit.id === incident.audit_id)?.title;
            return (
              <div key={incident.id} className="rounded border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{incident.title}</p>
                    <p className="text-sm text-muted-foreground">{typeLabels[incident.incidencia_type]} • {new Date(incident.created_at).toLocaleDateString()}</p>
                    {auditTitle && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><LinkIcon className="h-3 w-3" />Auditoría: {auditTitle}</p>}
                  </div>
                  <span className={`text-xs flex items-center gap-1 ${status.color}`}><StatusIcon className="h-3 w-3" />{status.label}</span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Dialog open={isNewIncidentOpen} onOpenChange={onNewIncidentOpenChange}>
        <DialogContent data-testid="new-incident-modal">
          <DialogHeader>
            <DialogTitle>Nueva incidencia</DialogTitle>
            <DialogDescription>Registra incidencia, reclamación, desviación u otra, con auditoría opcional.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Título</Label><Input data-testid="incident-title-input" value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} /></div>
            <div><Label>Descripción</Label><Textarea data-testid="incident-description-input" value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} /></div>
            <div>
              <Label>Tipo de incidencia</Label>
              <Select value={form.incidencia_type} onValueChange={(value: IncidentType) => setForm((prev) => ({ ...prev, incidencia_type: value }))}>
                <SelectTrigger data-testid="incident-type-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="incidencia">Incidencia</SelectItem>
                  <SelectItem value="reclamacion">Reclamación</SelectItem>
                  <SelectItem value="desviacion">Desviación</SelectItem>
                  <SelectItem value="otra">Otra</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Auditoría relacionada (opcional)</Label>
              <Select value={form.audit_id} onValueChange={(value) => setForm((prev) => ({ ...prev, audit_id: value }))}>
                <SelectTrigger data-testid="incident-audit-select"><SelectValue placeholder="Sin auditoría" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin auditoría</SelectItem>
                  {audits.map((audit) => <SelectItem key={audit.id} value={audit.id}>{audit.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Responsable</Label>
              <Select value={form.responsible_id} onValueChange={(value) => setForm((prev) => ({ ...prev, responsible_id: value }))}>
                <SelectTrigger><SelectValue placeholder="Selecciona responsable" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin responsable</SelectItem>
                  {users.map((user) => <SelectItem key={user.id} value={user.id}>{user.full_name ?? user.email ?? user.id}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Estado</Label>
              <Select value={form.status} onValueChange={(value) => setForm((prev) => ({ ...prev, status: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => onFiltersChange({ ...filters, incidentArea: "all" })} variant="ghost">Limpiar</Button>
            <Button onClick={createIncident} data-testid="incident-save-button">Crear incidencia</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
