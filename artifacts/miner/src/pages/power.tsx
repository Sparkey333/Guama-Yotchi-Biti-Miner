import { useGetPowerProfile, useSetPowerProfile, useGetMinerStatus } from "@workspace/api-client-react";
import { Slider } from "@/components/ui/slider";
import { Zap, Sun, Leaf, Flame, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

export default function Power() {
  const queryClient = useQueryClient();
  const { data: profileState } = useGetPowerProfile();
  const { data: status } = useGetMinerStatus({ query: { refetchInterval: 2000 } });
  
  const setProfile = useSetPowerProfile({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/miner/profile"] });
        queryClient.invalidateQueries({ queryKey: ["/api/miner/status"] });
      }
    }
  });

  const handleProfileChange = (profile: "eco" | "balanced" | "turbo" | "solar") => {
    setProfile.mutate({ data: { profile, batteryPercent: profileState?.batteryPercent } });
  };

  const handleBatteryChange = (val: number[]) => {
    if (profileState?.profile === 'solar') {
      setProfile.mutate({ data: { profile: 'solar', batteryPercent: val[0] } });
    }
  };

  if (!profileState || !status) {
    return (
      <div className="flex items-center justify-center h-full opacity-50 py-20">
         <Activity className="w-16 h-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-20">
      <h2 className="font-display text-4xl text-accent drop-shadow-[2px_2px_0_#000] -skew-x-6 uppercase">Power Management</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Profile Selector */}
        <div className="flex flex-col gap-4">
           {[
             { id: 'eco', label: 'ECO MODE', icon: Leaf, color: 'text-secondary', border: 'border-secondary', desc: 'Low wattage, max efficiency' },
             { id: 'balanced', label: 'BALANCED', icon: Zap, color: 'text-primary', border: 'border-primary', desc: 'Standard operating mode' },
             { id: 'turbo', label: 'TURBO', icon: Flame, color: 'text-destructive', border: 'border-destructive', desc: 'Max hashrate, damn the heat' },
             { id: 'solar', label: 'SOLAR', icon: Sun, color: 'text-accent', border: 'border-accent', desc: 'Scale with battery capacity' }
           ].map((p) => {
              const isActive = profileState.profile === p.id;
              const Icon = p.icon;
              return (
                <button
                  key={p.id}
                  onClick={() => handleProfileChange(p.id as any)}
                  className={cn(
                    "flex items-center p-4 border-4 transition-all text-left group",
                    isActive 
                      ? cn("bg-black shadow-[4px_4px_0_0_#fff] translate-x-[-2px] translate-y-[-2px]", p.border)
                      : "bg-black border-muted hover:border-foreground"
                  )}
                >
                  <div className={cn("p-3 border-2 border-black mr-4", isActive ? p.border : "bg-muted")}>
                    <Icon className={cn("w-6 h-6", isActive ? p.color : "text-black")} />
                  </div>
                  <div>
                    <h3 className={cn("font-display text-2xl uppercase", isActive ? p.color : "text-muted-foreground group-hover:text-foreground")}>{p.label}</h3>
                    <p className="text-sm font-mono text-muted-foreground">{p.desc}</p>
                  </div>
                </button>
              )
           })}
        </div>

        {/* Readout & Solar Controls */}
        <div className="flex flex-col gap-6">
          <div className="bg-card border-4 border-foreground p-6 shadow-[6px_6px_0_0_#0ff]">
             <h3 className="font-display text-xl text-foreground mb-6 uppercase">Target Telemetry</h3>
             
             <div className="flex flex-col gap-6">
               <div>
                 <div className="flex justify-between mb-2">
                   <span className="font-bold text-sm uppercase text-muted-foreground">Target Watts</span>
                   <span className="font-pixel text-xl text-accent">{profileState.targetWatts} W</span>
                 </div>
                 <div className="w-full bg-black h-2 border border-muted">
                    <div className="bg-accent h-full" style={{ width: `${Math.min(100, (profileState.targetWatts / 2000) * 100)}%` }} />
                 </div>
               </div>

               <div>
                 <div className="flex justify-between mb-2">
                   <span className="font-bold text-sm uppercase text-muted-foreground">Target Hashrate</span>
                   <span className="font-pixel text-xl text-primary">{profileState.targetHashrateGhs.toFixed(2)} GH/s</span>
                 </div>
                 <div className="w-full bg-black h-2 border border-muted">
                    <div className="bg-primary h-full" style={{ width: `${Math.min(100, (profileState.targetHashrateGhs / 200) * 100)}%` }} />
                 </div>
               </div>
             </div>
          </div>

          <div className={cn("bg-black border-4 p-6 transition-colors", profileState.profile === 'solar' ? "border-accent shadow-[6px_6px_0_0_#ff0]" : "border-muted opacity-50")}>
             <h3 className={cn("font-display text-xl mb-4 uppercase", profileState.profile === 'solar' ? "text-accent" : "text-muted-foreground")}>
               Solar Battery Link
             </h3>
             <p className="text-sm font-mono mb-6 text-muted-foreground">
               Simulate Goal Zero battery %. In solar mode, hashrate scales dynamically with available battery capacity.
             </p>
             
             <div className="flex items-center gap-4">
               <Sun className={profileState.profile === 'solar' ? "text-accent" : "text-muted-foreground"} />
               <Slider 
                 disabled={profileState.profile !== 'solar'}
                 defaultValue={[profileState.batteryPercent]}
                 max={100}
                 step={1}
                 onValueChange={handleBatteryChange}
                 className="flex-1"
               />
               <span className={cn("font-pixel text-2xl w-12 text-right", profileState.profile === 'solar' ? "text-accent" : "text-muted-foreground")}>
                 {profileState.batteryPercent}%
               </span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
