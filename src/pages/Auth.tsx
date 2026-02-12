import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Eye, EyeOff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const emailSchema = z.string().email("Email inválido");
const passwordSchema = z.string().min(6, "La contraseña debe tener al menos 6 caracteres");

type AuthMode = "login" | "signup" | "demo";

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [demoCode, setDemoCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; demoCode?: string }>({});
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        navigate("/");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const validateForm = () => {
    const newErrors: typeof errors = {};
    
    try {
      emailSchema.parse(email);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.email = e.errors[0].message;
      }
    }

    try {
      passwordSchema.parse(password);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.password = e.errors[0].message;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({
          title: "Error de inicio de sesión",
          description: error.message === "Invalid login credentials" 
            ? "Credenciales incorrectas" 
            : error.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Ha ocurrido un error inesperado",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName || email.split("@")[0],
          },
        },
      });

      if (error) {
        if (error.message.includes("already registered")) {
          toast({
            title: "Usuario existente",
            description: "Este email ya está registrado. Por favor, inicie sesión.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error de registro",
            description: error.message,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "¡Registro exitoso!",
          description: "Cuenta creada correctamente. Ya puede acceder.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Ha ocurrido un error inesperado",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoCode.trim()) {
      setErrors({ demoCode: "Ingrese un código de demo" });
      return;
    }

    // Basic client-side validation
    if (demoCode.length > 50) {
      setErrors({ demoCode: "Código inválido" });
      return;
    }

    setIsLoading(true);
    try {
      // Validate demo code via edge function (secure server-side validation)
      const { data, error } = await supabase.functions.invoke("validate-demo-code", {
        body: { code: demoCode.trim() },
      });

      if (error) {
        toast({
          title: "Error",
          description: "Ha ocurrido un error al validar el código",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      if (!data?.valid) {
        toast({
          title: "Código inválido",
          description: data?.error || "El código no existe, ya ha sido utilizado o ha expirado.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Code is valid, switch to signup mode with demo indicator
      toast({
        title: "¡Código válido!",
        description: "Complete su registro para acceder a la demo.",
      });
      setMode("signup");
    } catch (error) {
      toast({
        title: "Error",
        description: "Ha ocurrido un error al validar el código",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
            <Shield className="w-7 h-7 text-accent-foreground" />
          </div>
          <span className="font-bold text-2xl tracking-tight text-foreground">QualiQ</span>
        </div>

        {/* Card */}
        <div className="bg-card rounded-xl border border-border p-8 shadow-lg">
          <h1 className="text-2xl font-bold text-foreground text-center mb-2">
            {mode === "login" && "Iniciar Sesión"}
            {mode === "signup" && "Crear Cuenta"}
            {mode === "demo" && "Acceso Demo"}
          </h1>
          <p className="text-muted-foreground text-center mb-6">
            {mode === "login" && "Acceda a su plataforma de cumplimiento"}
            {mode === "signup" && "Regístrese para comenzar"}
            {mode === "demo" && "Ingrese su código de demo"}
          </p>

          {mode === "demo" && (
            <form onSubmit={handleDemoAccess} className="space-y-4">
              <div>
                <Label htmlFor="demoCode">Código de Demo</Label>
                <Input
                  id="demoCode"
                  type="text"
                  value={demoCode}
                  onChange={(e) => setDemoCode(e.target.value)}
                  placeholder="Ingrese su código"
                  className="mt-1"
                  maxLength={50}
                />
                {errors.demoCode && (
                  <p className="text-destructive text-sm mt-1">{errors.demoCode}</p>
                )}
              </div>
              <Button type="submit" variant="accent" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Validar Código
              </Button>
            </form>
          )}

          {(mode === "login" || mode === "signup") && (
            <form onSubmit={mode === "login" ? handleLogin : handleSignup} className="space-y-4">
              {mode === "signup" && (
                <div>
                  <Label htmlFor="fullName">Nombre Completo</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Su nombre"
                    className="mt-1"
                  />
                </div>
              )}
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  data-testid="auth-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="correo@empresa.com"
                  className="mt-1"
                />
                {errors.email && (
                  <p className="text-destructive text-sm mt-1">{errors.email}</p>
                )}
              </div>
              <div>
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative mt-1">
                  <Input
                    id="password"
                    data-testid="auth-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-destructive text-sm mt-1">{errors.password}</p>
                )}
              </div>
              <Button type="submit" variant="accent" className="w-full" disabled={isLoading} data-testid="auth-submit">
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {mode === "login" ? "Iniciar Sesión" : "Crear Cuenta"}
              </Button>
            </form>
          )}

          {/* Mode Switcher */}
          <div className="mt-6 pt-6 border-t border-border text-center space-y-3">
            {mode === "login" && (
              <>
                <p className="text-sm text-muted-foreground">
                  ¿No tiene cuenta?{" "}
                  <button
                    onClick={() => setMode("signup")}
                    className="text-accent hover:underline font-medium"
                  >
                    Regístrese
                  </button>
                </p>
                <p className="text-sm text-muted-foreground">
                  ¿Tiene un código de demo?{" "}
                  <button
                    onClick={() => setMode("demo")}
                    className="text-accent hover:underline font-medium"
                  >
                    Acceder a Demo
                  </button>
                </p>
              </>
            )}
            {mode === "signup" && (
              <p className="text-sm text-muted-foreground">
                ¿Ya tiene cuenta?{" "}
                <button
                  onClick={() => setMode("login")}
                  className="text-accent hover:underline font-medium"
                >
                  Iniciar Sesión
                </button>
              </p>
            )}
            {mode === "demo" && (
              <p className="text-sm text-muted-foreground">
                ¿Ya tiene cuenta?{" "}
                <button
                  onClick={() => setMode("login")}
                  className="text-accent hover:underline font-medium"
                >
                  Iniciar Sesión
                </button>
              </p>
            )}
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          © 2024 QualiQ. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
}
