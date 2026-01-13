import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LandingPage } from "@/components/landing/LandingPage";
import { AppLayout } from "@/components/layout/AppLayout";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { DocumentsView } from "@/components/documents/DocumentsView";
import { IncidentsView } from "@/components/incidents/IncidentsView";
import { ChatbotView } from "@/components/chatbot/ChatbotView";
import { useAuth } from "@/hooks/useAuth";
import { FilterModal, type FiltersState } from "@/components/filters/FilterModal";
import { PendingActionsView } from "@/components/dashboard/PendingActionsView";
import { CompanyView } from "@/components/company/CompanyView";
import { SettingsView } from "@/components/settings/SettingsView";

const moduleConfig: Record<string, { title: string; subtitle?: string }> = {
  dashboard: { title: "Panel de Control", subtitle: "Visión general del estado de cumplimiento" },
  documents: { title: "Gestión Documental", subtitle: "SOPs, PNTs y documentación de calidad" },
  processes: { title: "Procesos / PNT", subtitle: "Gestión de procedimientos normalizados" },
  incidents: { title: "Incidencias", subtitle: "No conformidades, desviaciones y CAPAs" },
  analytics: { title: "Analíticas", subtitle: "Indicadores y métricas de cumplimiento" },
  chatbot: { title: "Asistente IA", subtitle: "Consultas basadas en documentación y normativa" },
  company: { title: "Empresa", subtitle: "Configuración y datos de la organización" },
  settings: { title: "Configuración", subtitle: "Preferencias y ajustes del sistema" },
  "pending-actions": { title: "Acciones Pendientes", subtitle: "Seguimiento completo de tareas y aprobaciones" },
};

type IncidentType = "non-conformity" | "deviation" | "incident" | "complaint" | "capa";

const Index = () => {
  const [showApp, setShowApp] = useState(false);
  const [activeModule, setActiveModule] = useState("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<FiltersState>({
    category: "all",
    documentStatus: "all",
    incidentArea: "all",
    incidentStatus: "all",
    incidentPriority: "all",
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isNewDocumentOpen, setIsNewDocumentOpen] = useState(false);
  const [isNewIncidentOpen, setIsNewIncidentOpen] = useState(false);
  const [incidentTypeSeed, setIncidentTypeSeed] = useState<IncidentType | undefined>(undefined);
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      setShowApp(true);
    }
  }, [user]);

  const handleGetStarted = () => {
    navigate("/auth");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  if (!showApp) {
    return <LandingPage onGetStarted={handleGetStarted} />;
  }

  const currentModule = moduleConfig[activeModule] || moduleConfig.dashboard;
  const searchPlaceholder = (() => {
    switch (activeModule) {
      case "documents":
        return "Buscar documentos...";
      case "processes":
        return "Buscar procesos...";
      case "incidents":
        return "Buscar incidencias...";
      default:
        return "Buscar documentos, procesos...";
    }
  })();

  const handleQuickAction = (action: string) => {
    switch (action) {
      case "Nuevo PNT":
        setActiveModule("processes");
        setIsNewDocumentOpen(true);
        break;
      case "Registrar Incidencia":
        setActiveModule("incidents");
        setIncidentTypeSeed("incident");
        setIsNewIncidentOpen(true);
        break;
      case "Crear CAPA":
        setActiveModule("incidents");
        setIncidentTypeSeed("capa");
        setIsNewIncidentOpen(true);
        break;
      case "Ver Informes":
        setActiveModule("analytics");
        break;
      default:
        break;
    }
  };

  const handleViewPendingActions = () => {
    setActiveModule("pending-actions");
  };

  const handleViewIncidents = () => {
    setActiveModule("incidents");
  };

  const renderModule = () => {
    switch (activeModule) {
      case "dashboard":
        return (
          <DashboardView
            onQuickAction={handleQuickAction}
            onViewPendingActions={handleViewPendingActions}
            onViewIncidents={handleViewIncidents}
          />
        );
      case "documents":
        return (
          <DocumentsView
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            filters={filters}
            onFiltersChange={setFilters}
            onOpenFilters={() => setIsFilterOpen(true)}
            isNewDocumentOpen={isNewDocumentOpen}
            onNewDocumentOpenChange={setIsNewDocumentOpen}
          />
        );
      case "processes":
        return (
          <DocumentsView
            mode="processes"
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            filters={filters}
            onFiltersChange={setFilters}
            onOpenFilters={() => setIsFilterOpen(true)}
            isNewDocumentOpen={isNewDocumentOpen}
            onNewDocumentOpenChange={setIsNewDocumentOpen}
          />
        );
      case "incidents":
        return (
          <IncidentsView
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            filters={filters}
            onFiltersChange={setFilters}
            onOpenFilters={() => setIsFilterOpen(true)}
            isNewIncidentOpen={isNewIncidentOpen}
            onNewIncidentOpenChange={setIsNewIncidentOpen}
            initialIncidentType={incidentTypeSeed}
          />
        );
      case "chatbot":
        return <ChatbotView />;
      case "analytics":
        return (
          <div className="flex items-center justify-center h-64 bg-card rounded-lg border border-border">
            <p className="text-muted-foreground">Módulo de Analíticas - Disponible en plan Excellence</p>
          </div>
        );
      case "company":
        return <CompanyView />;
      case "settings":
        return <SettingsView />;
      case "pending-actions":
        return <PendingActionsView />;
      default:
        return (
          <div className="flex items-center justify-center h-64 bg-card rounded-lg border border-border">
            <p className="text-muted-foreground">Módulo en desarrollo</p>
          </div>
        );
    }
  };

  return (
    <AppLayout
      activeModule={activeModule}
      onModuleChange={setActiveModule}
      title={currentModule.title}
      subtitle={currentModule.subtitle}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder={searchPlaceholder}
    >
      {renderModule()}
      <FilterModal
        open={isFilterOpen}
        onOpenChange={setIsFilterOpen}
        filters={filters}
        onFiltersChange={setFilters}
      />
    </AppLayout>
  );
};

export default Index;
