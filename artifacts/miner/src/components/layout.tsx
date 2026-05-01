import { Link, useLocation } from "wouter";
import { useGetMinerStatus } from "@workspace/api-client-react";
import { Activity, Zap, Cpu, Map, Target, Bot, Settings, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "BUDDY", icon: Activity },
  { href: "/stats", label: "STATS", icon: Zap },
  { href: "/heatmap", label: "HEATMAP", icon: Map },
  { href: "/power", label: "POWER", icon: Cpu },
  { href: "/missions", label: "MISSIONS", icon: Target },
  { href: "/ai", label: "AI", icon: Bot },
  { href: "/setup", label: "SETUP", icon: Settings },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: status } = useGetMinerStatus({ query: { refetchInterval: 2000 } });

  return (
    <div className="min-h-screen bg-black text-foreground crt-scanlines selection:bg-primary selection:text-black flex flex-col font-mono relative overflow-hidden">
      {/* Decorative background grid */}
      <div className="absolute inset-0 halftone opacity-20 pointer-events-none" />
      
      <div className="flex-1 w-full max-w-5xl mx-auto flex flex-col z-10 relative">
        <header className="border-b-4 border-primary p-4 flex flex-col md:flex-row items-center justify-between gap-4 bg-black/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="flex items-center gap-4">
            <h1 className="text-4xl font-display uppercase tracking-widest text-primary drop-shadow-[0_0_10px_rgba(255,0,255,0.8)] -skew-x-6">
              Guama<span className="text-foreground">Yotchi</span>
            </h1>
            {status?.mode === 'demo' && (
              <span className="px-2 py-1 bg-accent text-black font-bold text-xs uppercase animate-pulse border-2 border-black -rotate-6 shadow-[2px_2px_0px_#fff]">
                DEMO MODE
              </span>
            )}
          </div>
          
          <nav className="flex flex-wrap justify-center gap-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href} className="no-underline">
                  <div
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 border-2 border-primary font-bold uppercase transition-all",
                      isActive
                        ? "bg-primary text-black shadow-[4px_4px_0px_0px_rgba(0,255,255,1)] translate-x-[-2px] translate-y-[-2px]"
                        : "bg-black text-primary hover:bg-muted hover:text-foreground hover:border-foreground"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </nav>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-y-auto relative">
          {!status && location !== "/setup" ? (
             <div className="flex flex-col items-center justify-center h-full gap-4 opacity-50">
                <Activity className="w-16 h-16 animate-spin text-primary" />
                <p className="font-pixel text-2xl text-foreground">BOOTING OS...</p>
             </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
