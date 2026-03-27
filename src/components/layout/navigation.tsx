"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, GitCompareArrows, LayoutDashboard, Trophy, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "ホーム", icon: LayoutDashboard },
  { href: "/standings", label: "順位表", icon: Trophy },
  { href: "/games", label: "試合", icon: Calendar },
  { href: "/players", label: "選手", icon: Users },
  { href: "/compare", label: "比較", icon: GitCompareArrows },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <header
      className="sticky top-0 z-50 w-full backdrop-blur"
      style={{ borderBottom: "1px solid #262626", background: "rgba(10,10,10,0.95)" }}
    >
      <div className="container mx-auto flex h-14 items-center px-4">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <span className="text-lg font-bold">MLB Data</span>
        </Link>
        <nav className="flex items-center space-x-1 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                  isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground",
                )}
                style={
                  isActive
                    ? { background: "#1f1f1f", color: "#f5f5f5" }
                    : { color: "#a3a3a3" }
                }
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
