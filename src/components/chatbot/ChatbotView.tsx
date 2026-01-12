import { useState } from "react";
import { Send, Bot, User, FileText, Scale, Sparkles, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  references?: { type: "document" | "regulation"; title: string; code: string }[];
  timestamp: Date;
}

const initialMessages: Message[] = [
  {
    id: "1",
    role: "assistant",
    content: "Bienvenido al Asistente IA de QualiQ. Estoy aquí para ayudarle con consultas de cumplimiento normativo basadas en la documentación de su empresa y la legislación española y europea aplicable.\n\n¿En qué puedo ayudarle hoy?",
    timestamp: new Date(),
  },
];

const suggestedQuestions = [
  "¿Qué PNT cubre el control de temperatura?",
  "¿Cuál es el procedimiento para gestionar una no conformidad?",
  "¿Qué dice la normativa española sobre etiquetado?",
  "¿Está actualizado el Manual de Calidad?",
];

export function ChatbotView() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Según la documentación de su empresa, el control de temperatura está regulado por el procedimiento PNT-ALM-003 \"Control de Almacén y Stock\", versión 1.5.\n\nEste procedimiento establece:\n\n• Rangos de temperatura aceptables por zona\n• Frecuencia de monitorización\n• Acciones en caso de desviación\n• Registros a mantener\n\nAdemás, según el Real Decreto 824/2010 sobre laboratorios farmacéuticos, se exige un control documentado de las condiciones ambientales de almacenamiento.",
        references: [
          { type: "document", title: "Control de Almacén y Stock", code: "PNT-ALM-003 v1.5" },
          { type: "regulation", title: "Real Decreto 824/2010", code: "BOE-A-2010-10827" },
        ],
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-6 animate-fade-in">
      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-card rounded-lg border border-border overflow-hidden">
        {/* Chat Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-secondary/30">
          <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center">
            <Bot className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Asistente de Cumplimiento IA</h3>
            <p className="text-xs text-muted-foreground">Basado en documentación de empresa y normativa española</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                message.role === "user" && "justify-end"
              )}
            >
              {message.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-accent" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[70%] rounded-lg px-4 py-3",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary"
                )}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                
                {message.references && message.references.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Referencias:</p>
                    {message.references.map((ref, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 text-xs bg-card/50 rounded px-2 py-1.5"
                      >
                        {ref.type === "document" ? (
                          <FileText className="w-3 h-3 text-accent" />
                        ) : (
                          <Scale className="w-3 h-3 text-accent" />
                        )}
                        <span className="font-mono text-accent">{ref.code}</span>
                        <span className="text-muted-foreground">{ref.title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {message.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-accent" />
              </div>
              <div className="bg-secondary rounded-lg px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" />
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse delay-100" />
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse delay-200" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-border">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Escriba su consulta de cumplimiento..."
              className="flex-1 px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
            <Button onClick={handleSend} variant="accent" size="icon" className="h-10 w-10">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-80 space-y-4 hidden xl:block">
        {/* Suggested Questions */}
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-accent" />
            <h4 className="font-semibold text-foreground text-sm">Preguntas Sugeridas</h4>
          </div>
          <div className="space-y-2">
            {suggestedQuestions.map((question, idx) => (
              <button
                key={idx}
                onClick={() => setInput(question)}
                className="w-full text-left text-sm text-muted-foreground hover:text-foreground p-2 rounded-lg hover:bg-secondary transition-colors"
              >
                {question}
              </button>
            ))}
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-accent/5 rounded-lg border border-accent/20 p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-foreground text-sm mb-1">Sobre este asistente</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Las respuestas se basan exclusivamente en la documentación de su empresa y la normativa española/europea aplicable. No se utilizan fuentes externas ni genéricas.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
