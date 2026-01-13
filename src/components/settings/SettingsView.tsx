import { Globe, BadgeCheck, Building2, UserCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";

export function SettingsView() {
  const { user } = useAuth();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-card rounded-lg border border-border p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Globe className="w-5 h-5 text-accent" />
          <div>
            <h3 className="font-semibold text-foreground">Idioma de la interfaz</h3>
            <p className="text-sm text-muted-foreground">Selecciona el idioma principal de QualiQ.</p>
          </div>
        </div>
        <Select defaultValue="es">
          <SelectTrigger className="max-w-xs">
            <SelectValue placeholder="Selecciona idioma" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="es">Español</SelectItem>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="pt">Português</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card rounded-lg border border-border p-6 space-y-4">
          <div className="flex items-center gap-3">
            <BadgeCheck className="w-5 h-5 text-accent" />
            <div>
              <h3 className="font-semibold text-foreground">Plan y tipo de usuario</h3>
              <p className="text-sm text-muted-foreground">Información de suscripción actual.</p>
            </div>
          </div>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Plan:</span> Professional
            </p>
            <p>
              <span className="font-medium text-foreground">Tipo de usuario:</span>{" "}
              {user?.email?.includes("admin") ? "Administrador" : "Colaborador"}
            </p>
            <p>
              <span className="font-medium text-foreground">Cobertura:</span> 50 licencias activas
            </p>
            <p>
              <span className="font-medium text-foreground">Créditos IA:</span> 12.000 disponibles
            </p>
          </div>
          <Button variant="outline">Gestionar suscripción</Button>
        </div>

        <div className="bg-card rounded-lg border border-border p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-accent" />
            <div>
              <h3 className="font-semibold text-foreground">Empresa asignada</h3>
              <p className="text-sm text-muted-foreground">Entidad empresarial vinculada.</p>
            </div>
          </div>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Empresa:</span> QualiQ Labs
            </p>
            <p>
              <span className="font-medium text-foreground">Rol:</span> {user?.email?.includes("admin") ? "Administrador" : "Colaborador"}
            </p>
            <p>
              <span className="font-medium text-foreground">Unidad:</span> Calidad y cumplimiento
            </p>
          </div>
          <Button variant="outline">Solicitar cambio</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card rounded-lg border border-border p-6 space-y-4">
          <div className="flex items-center gap-3">
            <UserCircle className="w-5 h-5 text-accent" />
            <div>
              <h3 className="font-semibold text-foreground">Perfil del usuario</h3>
              <p className="text-sm text-muted-foreground">Datos de cuenta y acceso.</p>
            </div>
          </div>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Usuario:</span> {user?.email ?? "usuario@empresa.com"}
            </p>
            <p>
              <span className="font-medium text-foreground">Plan actual:</span> Professional Annual
            </p>
            <p>
              <span className="font-medium text-foreground">Último acceso:</span> Hoy, 09:32
            </p>
          </div>
          <Button variant="outline">Actualizar perfil</Button>
        </div>

        <div className="bg-card rounded-lg border border-border p-6 space-y-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-accent" />
            <div>
              <h3 className="font-semibold text-foreground">Seguridad y accesos</h3>
              <p className="text-sm text-muted-foreground">Configuración de seguridad de la cuenta.</p>
            </div>
          </div>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">MFA:</span> Activo
            </p>
            <p>
              <span className="font-medium text-foreground">Sesiones activas:</span> 2 dispositivos
            </p>
            <p>
              <span className="font-medium text-foreground">Política de contraseña:</span> 90 días
            </p>
          </div>
          <Button variant="outline">Revisar seguridad</Button>
        </div>
      </div>
    </div>
  );
}
