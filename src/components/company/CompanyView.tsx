import { useState } from "react";
import { Building2, Mail, Plus, FileText, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const mockCompany = {
  name: "QualiQ Labs",
  industry: "Calidad y cumplimiento",
  size: "250-500",
  address: "Calle Gran Vía 45, Madrid",
  cif: "B-12345678",
  contact: "contacto@qualiq.ai",
};

const mockUsers = [
  { id: "1", name: "María García", email: "maria@qualiq.ai", role: "Admin" },
  { id: "2", name: "Carlos López", email: "carlos@qualiq.ai", role: "Editor" },
  { id: "3", name: "Ana Martínez", email: "ana@qualiq.ai", role: "Viewer" },
];

export function CompanyView() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("perfil");
  const isAdmin = Boolean(user?.email?.includes("admin") || user?.app_metadata?.role === "admin");

  if (!isAdmin) {
    return (
      <div className="bg-card rounded-lg border border-border p-6 space-y-4">
        <div className="flex items-start gap-3">
          <Building2 className="w-6 h-6 text-accent" />
          <div>
            <h3 className="font-semibold text-foreground">Acceso restringido a Empresa</h3>
            <p className="text-sm text-muted-foreground">
              Los datos completos de la empresa están disponibles solo para administradores. Puedes solicitar acceso.
            </p>
          </div>
        </div>
        <Button
          variant="accent"
          onClick={() => (window.location.href = "mailto:admin@qualiq.ai?subject=Solicitud%20de%20acceso%20a%20Empresa")}
        >
          <Mail className="w-4 h-4 mr-2" />
          Solicitar acceso por email
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 max-w-lg">
          <TabsTrigger value="perfil">Perfil empresa</TabsTrigger>
          <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
          <TabsTrigger value="facturacion">Facturación</TabsTrigger>
        </TabsList>

        <TabsContent value="perfil" className="mt-6">
          <div className="bg-card rounded-lg border border-border p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Perfil de la empresa</h3>
              <Button variant="outline">Editar perfil</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input defaultValue={mockCompany.name} />
              </div>
              <div className="space-y-2">
                <Label>Industria</Label>
                <Input defaultValue={mockCompany.industry} />
              </div>
              <div className="space-y-2">
                <Label>Tamaño</Label>
                <Select defaultValue={mockCompany.size}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-50">1-50</SelectItem>
                    <SelectItem value="51-250">51-250</SelectItem>
                    <SelectItem value="250-500">250-500</SelectItem>
                    <SelectItem value="500+">500+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>CIF</Label>
                <Input defaultValue={mockCompany.cif} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Dirección</Label>
                <Textarea defaultValue={mockCompany.address} rows={2} />
              </div>
              <div className="space-y-2">
                <Label>Email de contacto</Label>
                <Input defaultValue={mockCompany.contact} />
              </div>
            </div>
            <Button
              variant="accent"
              onClick={() =>
                toast({
                  title: "Perfil actualizado",
                  description: "Los datos de la empresa se han guardado correctamente.",
                })
              }
            >
              Guardar cambios
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="usuarios" className="mt-6">
          <div className="bg-card rounded-lg border border-border p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">Usuarios</h3>
                <p className="text-sm text-muted-foreground">Gestiona accesos, roles y licencias.</p>
              </div>
              <Button variant="accent">
                <Plus className="w-4 h-4 mr-2" />
                Crear usuario
              </Button>
            </div>

            <div className="space-y-3">
              {mockUsers.map((userItem) => (
                <div key={userItem.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div>
                    <p className="text-sm font-medium text-foreground">{userItem.name}</p>
                    <p className="text-xs text-muted-foreground">{userItem.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-secondary px-2 py-1 rounded-full">{userItem.role}</span>
                    <Button variant="outline" size="sm">
                      Editar
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive">
                      Eliminar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="facturacion" className="mt-6">
          <div className="bg-card rounded-lg border border-border p-6 space-y-4">
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-accent" />
              <div>
                <h3 className="font-semibold text-foreground">Facturación</h3>
                <p className="text-sm text-muted-foreground">Estado de pagos y cobertura de licencias.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-secondary/30 border border-border rounded-lg p-4">
                <p className="text-xs text-muted-foreground">Estado de pago</p>
                <p className="text-lg font-semibold text-foreground mt-1">Activo</p>
              </div>
              <div className="bg-secondary/30 border border-border rounded-lg p-4">
                <p className="text-xs text-muted-foreground">Licencias asignadas</p>
                <p className="text-lg font-semibold text-foreground mt-1">38 / 50</p>
              </div>
              <div className="bg-secondary/30 border border-border rounded-lg p-4">
                <p className="text-xs text-muted-foreground">Próxima facturación</p>
                <p className="text-lg font-semibold text-foreground mt-1">01/02/2024</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Genera facturas en formato español con datos fiscales completos.</p>
            </div>

            <Button
              variant="accent"
              onClick={() =>
                toast({
                  title: "Factura generada",
                  description: "La factura en formato ES se ha generado correctamente.",
                })
              }
            >
              Generar factura (ES)
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
