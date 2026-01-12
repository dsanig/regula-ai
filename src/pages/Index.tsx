import { useState } from "react";
import { LandingPage } from "@/components/landing/LandingPage";
import { AppLayout } from "@/components/layout/AppLayout";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { DocumentsView } from "@/components/documents/DocumentsView";
import { IncidentsView } from "@/components/incidents/IncidentsView";
import { ChatbotView } from "@/components/chatbot/ChatbotView";

const moduleConfig: Record<string, { title: string; subtitle?: string }> = {
  dashboard: { title: "Panel de Control", subtitle: "Visión general del estado de cumplimiento" },
  documents: { title: "Gestión Documental", subtitle: "SOPs, PNTs y documentación de calidad" },
  processes: { title: "Procesos / PNT", subtitle: "Gestión de procedimientos normalizados" },
  incidents: { title: "Incidencias", subtitle: "No conformidades, desviaciones y CAPAs" },
  analytics: { title: "Analíticas", subtitle: "Indicadores y métricas de cumplimiento" },
  chatbot: { title: "Asistente IA", subtitle: "Consultas basadas en documentación y normativa" },
  company: { title: "Empresa", subtitle: "Configuración y datos de la organización" },
  settings: { title: "Configuración", subtitle: "Preferencias y ajustes del sistema" },
};

const Index = () => {
  const [showApp, setShowApp] = useState(false);
  const [activeModule, setActiveModule] = useState("dashboard");

  if (!showApp) {
    return <LandingPage onGetStarted={() => setShowApp(true)} />;
  }

  const currentModule = moduleConfig[activeModule] || moduleConfig.dashboard;

  const renderModule = () => {
    switch (activeModule) {
      case "dashboard":
        return <DashboardView />;
      case "documents":
        return <DocumentsView />;
      case "processes":
        return <DocumentsView />; // Reuse for now
      case "incidents":
        return <IncidentsView />;
      case "chatbot":
        return <ChatbotView />;
      case "analytics":
        return (
          <div className="flex items-center justify-center h-64 bg-card rounded-lg border border-border">
            <p className="text-muted-foreground">Módulo de Analíticas - Disponible en plan Excellence</p>
          </div>
        );
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
    >
      {renderModule()}
    </AppLayout>
  );
};

export default Index;
