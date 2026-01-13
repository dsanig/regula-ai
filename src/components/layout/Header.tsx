import { Bell, Search, User, HelpCircle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NotificationsDropdown } from "@/components/notifications/NotificationsDropdown";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  title: string;
  subtitle?: string;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
}

export function Header({ title, subtitle, searchQuery, onSearchChange, searchPlaceholder }: HeaderProps) {
  const { user, signOut } = useAuth();

  return (
    <header className="h-16 border-b border-border bg-card px-6 flex items-center justify-between">
      <div>
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder={searchPlaceholder ?? "Buscar documentos, procesos..."}
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            className="w-64 pl-9 bg-secondary border-0"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <HelpCircle className="w-5 h-5" />
          </Button>
          <NotificationsDropdown />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <User className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover">
              <DropdownMenuItem className="text-sm text-muted-foreground cursor-default">
                {user?.email}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar Sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
