"use client";

import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, type ComponentType } from "react";
import {
  LayoutDashboard,
  Package,
  PackageCheck,
  FileText,
  BarChart3,
  Wallet,
  Users,
  BookText,
  CheckSquare,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  User,
} from "lucide-react";
import { cn } from "lib/utils";
import { useCardsCopy } from "lib/cards-copy";
import { useUser } from "lib/user-context";
import { hasAnyRole, type UserRole } from "lib/rbac";
import { Button } from "components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "components/ui/dropdown-menu";

type NavItem = {
  name: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  roles: UserRole[];
};

const SIDEBAR_COLLAPSED_STORAGE_KEY = "omari.sidebar-collapsed";

export function Sidebar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const copy = useCardsCopy();
  const { user, logout } = useUser();
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "true";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      SIDEBAR_COLLAPSED_STORAGE_KEY,
      String(isCollapsed),
    );
  }, [isCollapsed]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navigation: NavItem[] = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      roles: ["VIEWER", "USER", "ADMIN", "SUPER_ADMIN"],
    },
    {
      name: copy.receiveNavLabel,
      href: "/cards/receive",
      icon: Package,
      roles: ["USER", "ADMIN", "SUPER_ADMIN"],
    },
    {
      name: copy.issueNavLabel,
      href: "/cards/issue",
      icon: PackageCheck,
      roles: ["USER", "ADMIN", "SUPER_ADMIN"],
    },
    {
      name: "Transactions",
      href: "/transactions",
      icon: FileText,
      roles: ["VIEWER", "USER", "ADMIN", "SUPER_ADMIN"],
    },
    {
      name: "Reports",
      href: "/reports",
      icon: BarChart3,
      roles: ["VIEWER", "USER", "ADMIN", "SUPER_ADMIN"],
    },
    {
      name: "Financials",
      href: "/financials",
      icon: Wallet,
      roles: ["ADMIN", "SUPER_ADMIN"],
    },
    {
      name: "Adjustments",
      href: "/adjustments",
      icon: CheckSquare,
      roles: ["USER", "ADMIN", "SUPER_ADMIN"],
    },
    {
      name: "Audit Logs",
      href: "/audit-logs",
      icon: BookText,
      roles: ["ADMIN", "SUPER_ADMIN"],
    },
    {
      name: "Users",
      href: "/users",
      icon: Users,
      roles: ["ADMIN", "SUPER_ADMIN"],
    },
  ];

  const filteredNavigation = navigation.filter((item) =>
    hasAnyRole(user, item.roles),
  );

  const displayName = user?.fullname || user?.username || "Account";
  const collapseLabel = isCollapsed ? "Expand sidebar" : "Collapse sidebar";

  return (
    <aside
      className={cn(
        "app-sidebar flex h-screen shrink-0 flex-col border-r border-border bg-card transition-all duration-200",
        isCollapsed ? "w-20" : "w-64",
      )}
    >
      <div
        className={cn(
          "relative flex items-center border-b border-border",
          isCollapsed ? "h-16 justify-center px-2" : "h-16 justify-between px-4",
        )}
      >
        <div
          className={cn(
            "flex min-w-0 items-center",
            isCollapsed ? "justify-center" : "justify-start",
          )}
        >
          <img
            src="/images/20251022_100241_OMARI_LOGO_WITH_AFFILLIATE_STATEMENT_GRADIENT_GREEN_HORIZONTAL_VECTOR_05_page-0001.jpg.png"
            alt="Omari Logo"
            width={isCollapsed ? 32 : 120}
            height={40}
            className="object-contain"
          />
        </div>
        {!isCollapsed && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(true)}
            aria-label={collapseLabel}
            title={collapseLabel}
            className="h-9 w-9 shrink-0"
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        )}
        {isCollapsed && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(false)}
            aria-label={collapseLabel}
            title={collapseLabel}
            className="absolute top-3 right-2 h-9 w-9"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </Button>
        )}
      </div>

      <nav
        className={cn(
          "flex-1 space-y-1 overflow-y-auto py-4",
          isCollapsed ? "px-2" : "px-3",
        )}
      >
        {filteredNavigation.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.name}
              to={item.href}
              aria-label={item.name}
              title={isCollapsed ? item.name : undefined}
              className={cn(
                "app-nav-link flex items-center rounded-lg text-sm font-medium transition-colors",
                isCollapsed ? "justify-center px-0 py-3" : "gap-3 px-3 py-2.5",
                isActive
                  ? "app-nav-link--active bg-emerald-600 text-white shadow-sm dark:shadow-[0_0_0_1px_rgba(255,255,255,0.12)]"
                  : "text-foreground/80 hover:bg-muted/60 hover:text-foreground",
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!isCollapsed && <span className="truncate">{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      <div
        className={cn(
          "mt-auto border-t border-border",
          isCollapsed ? "px-2 py-3" : "px-3 py-4",
        )}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "app-account-trigger w-full border border-transparent text-left shadow-none hover:bg-muted/60",
                isCollapsed
                  ? "h-12 justify-center px-0"
                  : "h-auto justify-start px-3 py-3",
              )}
              aria-label="Account"
              title={isCollapsed ? "Account" : undefined}
            >
              <User className="h-5 w-5 shrink-0" />
              {!isCollapsed && (
                <div className="ml-3 min-w-0 text-left">
                  <p className="text-sm font-medium text-foreground">Account</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {displayName}
                  </p>
                </div>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side={isCollapsed ? "right" : "top"}
            align="end"
            className="w-56"
          >
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{displayName}</p>
                {user?.email && (
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                )}
                {user?.role && (
                  <p className="text-xs text-muted-foreground">{user.role}</p>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-red-600 dark:text-red-400"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
