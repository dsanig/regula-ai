import { useEffect, useMemo, useState } from "react";
import { Plus, Paperclip } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

type Audit = { id: string; title: string; description: string | null; audit_date: string | null; auditor_id: string | null };
type CapaPlan = { id: string; audit_id: string; description: string | null };
type NonConformity = { id: string; capa_plan_id: string; title: string; description: string | null; severity: string | null; root_cause: string | null; status: string };
type ActionItem = { id: string; non_conformity_id: string; action_type: "corrective" | "preventive"; description: string; responsible_id: string | null; due_date: string | null; status: string };
type Profile = { id: string; full_name: string | null; email: string | null };

const actionStatus = ["open", "in_progress", "closed", "overdue"] as const;

export function AuditManagementView() {
  const [audits, setAudits] = useState<Audit[]>([]);
  const [capaPlans, setCapaPlans] = useState<CapaPlan[]>([]);
  const [nonConformities, setNonConformities] = useState<NonConformity[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null);

  const [newAuditOpen, setNewAuditOpen] = useState(false);
  const [newNcOpen, setNewNcOpen] = useState(false);
  const [newActionOpen, setNewActionOpen] = useState(false);

  const [auditForm, setAuditForm] = useState({ title: "", description: "", audit_date: "" });
  const [ncForm, setNcForm] = useState({ title: "", description: "", severity: "", root_cause: "", status: "open" });
  const [actionForm, setActionForm] = useState({
    non_conformity_id: "",
    action_type: "corrective" as "corrective" | "preventive",
    description: "",
    responsible_id: "",
    due_date: "",
    status: "open",
    file: null as File | null,
  });

  const { toast } = useToast();

  const selectedCapaPlan = useMemo(
    () => capaPlans.find((plan) => plan.audit_id === selectedAuditId) ?? null,
    [capaPlans, selectedAuditId],
  );

  const filteredNcs = useMemo(
    () => nonConformities.filter((nc) => nc.capa_plan_id === selectedCapaPlan?.id),
    [nonConformities, selectedCapaPlan],
  );

  const loadData = async () => {
    const [{ data: auditsData }, { data: capaData }, { data: ncData }, { data: actionData }, { data: usersData }] = await Promise.all([
      (supabase as any).from("audits").select("id,title,description,audit_date,auditor_id").order("created_at", { ascending: false }),
      (supabase as any).from("capa_plans").select("id,audit_id,description"),
      (supabase as any).from("non_conformities").select("id,capa_plan_id,title,description,severity,root_cause,status"),
      (supabase as any).from("actions").select("id,non_conformity_id,action_type,description,responsible_id,due_date,status"),
      (supabase as any).from("profiles").select("id,full_name,email"),
    ]);

    setAudits((auditsData ?? []) as Audit[]);
    setCapaPlans((capaData ?? []) as CapaPlan[]);
    setNonConformities((ncData ?? []) as NonConformity[]);
    setActions((actionData ?? []) as ActionItem[]);
    setUsers((usersData ?? []) as Profile[]);

    if (!selectedAuditId && auditsData?.[0]?.id) {
      setSelectedAuditId(auditsData[0].id);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const selectedAudit = audits.find((audit) => audit.id === selectedAuditId) ?? null;

  const createAudit = async () => {
    const { error } = await (supabase as any).from("audits").insert({
      title: auditForm.title,
      description: auditForm.description || null,
      audit_date: auditForm.audit_date || null,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Auditoría creada", description: "Se creó la auditoría y su plan CAPA automáticamente." });
    setNewAuditOpen(false);
    setAuditForm({ title: "", description: "", audit_date: "" });
    await loadData();
  };

  const createNonConformity = async () => {
    if (!selectedCapaPlan) return;

    const { data, error } = await (supabase as any)
      .from("non_conformities")
      .insert({
        capa_plan_id: selectedCapaPlan.id,
        title: ncForm.title,
        description: ncForm.description || null,
        severity: ncForm.severity || null,
        root_cause: ncForm.root_cause || null,
        status: ncForm.status,
      })
      .select("id")
      .single();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    const correctiveAction = await (supabase as any).from("actions").insert({
      non_conformity_id: data.id,
      action_type: "corrective",
      description: "Acción correctiva inicial",
      status: "open",
    });

    if (correctiveAction.error) {
      toast({ title: "No conformidad creada", description: "Pero no se pudo crear la acción correctiva automática.", variant: "destructive" });
    } else {
      toast({ title: "No conformidad creada", description: "Se creó con una acción correctiva obligatoria." });
    }

    setNewNcOpen(false);
    setNcForm({ title: "", description: "", severity: "", root_cause: "", status: "open" });
    await loadData();
  };

  const createAction = async () => {
    const { data, error } = await (supabase as any)
      .from("actions")
      .insert({
        non_conformity_id: actionForm.non_conformity_id,
        action_type: actionForm.action_type,
        description: actionForm.description,
        responsible_id: actionForm.responsible_id || null,
        due_date: actionForm.due_date || null,
        status: actionForm.status,
      })
      .select("id")
      .single();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    if (actionForm.file) {
      const extension = actionForm.file.name.split(".").pop();
      const filePath = `actions/${data.id}/${crypto.randomUUID()}.${extension}`;

      const upload = await supabase.storage.from("documents").upload(filePath, actionForm.file, { upsert: false });
      if (!upload.error) {
        await (supabase as any).from("action_attachments").insert({
          action_id: data.id,
          bucket_id: "documents",
          object_path: filePath,
        });
      }
    }

    toast({ title: "Acción creada", description: "La acción se registró correctamente." });
    setNewActionOpen(false);
    setActionForm({ non_conformity_id: "", action_type: "corrective", description: "", responsible_id: "", due_date: "", status: "open", file: null });
    await loadData();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Auditorías</CardTitle>
          <Button size="sm" onClick={() => setNewAuditOpen(true)}><Plus className="mr-1 h-4 w-4" />Nueva</Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {audits.map((audit) => (
            <button key={audit.id} onClick={() => setSelectedAuditId(audit.id)} className={`w-full rounded border p-3 text-left ${selectedAuditId === audit.id ? "border-primary bg-primary/5" : "border-border"}`}>
              <p className="font-medium">{audit.title}</p>
              <p className="text-xs text-muted-foreground">{audit.audit_date ?? "Sin fecha"}</p>
            </button>
          ))}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle>Audit Info</CardTitle></CardHeader>
          <CardContent>
            {selectedAudit ? (
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Título:</span> {selectedAudit.title}</p>
                <p><span className="font-medium">Fecha:</span> {selectedAudit.audit_date ?? "Sin fecha"}</p>
                <p><span className="font-medium">Descripción:</span> {selectedAudit.description ?? "Sin descripción"}</p>
              </div>
            ) : <p className="text-sm text-muted-foreground">Selecciona una auditoría.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>CAPA Plan</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm">{selectedCapaPlan?.description ?? "Plan CAPA generado automáticamente para esta auditoría."}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Non-conformities</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setNewNcOpen(true)}>Añadir NC</Button>
              <Button size="sm" onClick={() => setNewActionOpen(true)}>Añadir acción</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredNcs.map((nc) => (
              <div key={nc.id} className="rounded border p-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{nc.title}</p>
                  <span className="text-xs text-muted-foreground">{nc.status}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{nc.description ?? "Sin descripción"}</p>
                <div className="mt-2 space-y-1">
                  {actions.filter((action) => action.non_conformity_id === nc.id).map((action) => (
                    <div key={action.id} className="rounded bg-muted/40 p-2 text-sm">
                      <p className="font-medium">{action.action_type === "corrective" ? "Corrective action" : "Preventive action"}</p>
                      <p>{action.description}</p>
                      <p className="text-xs text-muted-foreground">Estado: {action.status}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Dialog open={newAuditOpen} onOpenChange={setNewAuditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nueva auditoría</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Título</Label><Input value={auditForm.title} onChange={(e) => setAuditForm((prev) => ({ ...prev, title: e.target.value }))} /></div>
            <div><Label>Fecha</Label><Input type="date" value={auditForm.audit_date} onChange={(e) => setAuditForm((prev) => ({ ...prev, audit_date: e.target.value }))} /></div>
            <div><Label>Descripción</Label><Textarea value={auditForm.description} onChange={(e) => setAuditForm((prev) => ({ ...prev, description: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button onClick={createAudit}>Crear</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={newNcOpen} onOpenChange={setNewNcOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nueva no conformidad</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Título</Label><Input value={ncForm.title} onChange={(e) => setNcForm((prev) => ({ ...prev, title: e.target.value }))} /></div>
            <div><Label>Descripción</Label><Textarea value={ncForm.description} onChange={(e) => setNcForm((prev) => ({ ...prev, description: e.target.value }))} /></div>
            <div><Label>Severidad</Label><Input value={ncForm.severity} onChange={(e) => setNcForm((prev) => ({ ...prev, severity: e.target.value }))} /></div>
            <div><Label>Causa raíz</Label><Textarea value={ncForm.root_cause} onChange={(e) => setNcForm((prev) => ({ ...prev, root_cause: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button onClick={createNonConformity}>Crear</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={newActionOpen} onOpenChange={setNewActionOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nueva acción</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>No conformidad</Label>
              <Select value={actionForm.non_conformity_id} onValueChange={(value) => setActionForm((prev) => ({ ...prev, non_conformity_id: value }))}>
                <SelectTrigger><SelectValue placeholder="Selecciona NC" /></SelectTrigger>
                <SelectContent>{filteredNcs.map((nc) => <SelectItem key={nc.id} value={nc.id}>{nc.title}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={actionForm.action_type} onValueChange={(value: "corrective" | "preventive") => setActionForm((prev) => ({ ...prev, action_type: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="corrective">Corrective</SelectItem>
                  <SelectItem value="preventive">Preventive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Descripción</Label><Textarea value={actionForm.description} onChange={(e) => setActionForm((prev) => ({ ...prev, description: e.target.value }))} /></div>
            <div>
              <Label>Responsable</Label>
              <Select value={actionForm.responsible_id} onValueChange={(value) => setActionForm((prev) => ({ ...prev, responsible_id: value }))}>
                <SelectTrigger><SelectValue placeholder="Selecciona responsable" /></SelectTrigger>
                <SelectContent>{users.map((user) => <SelectItem key={user.id} value={user.id}>{user.full_name ?? user.email ?? user.id}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Fecha vencimiento</Label><Input type="date" value={actionForm.due_date} onChange={(e) => setActionForm((prev) => ({ ...prev, due_date: e.target.value }))} /></div>
            <div>
              <Label>Estado</Label>
              <Select value={actionForm.status} onValueChange={(value) => setActionForm((prev) => ({ ...prev, status: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{actionStatus.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Adjunto</Label>
              <Input type="file" onChange={(e) => setActionForm((prev) => ({ ...prev, file: e.target.files?.[0] ?? null }))} />
              {actionForm.file && <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1"><Paperclip className="h-3 w-3" />{actionForm.file.name}</p>}
            </div>
          </div>
          <DialogFooter><Button onClick={createAction}>Guardar acción</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
