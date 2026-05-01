import { useListMissions, useListAchievements } from "@workspace/api-client-react";
import { CheckCircle2, CircleDashed, Trophy, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Missions() {
  const { data: missions } = useListMissions({ query: { refetchInterval: 5000 } });
  const { data: achievements } = useListAchievements();

  return (
    <div className="flex flex-col gap-12 pb-20">
      
      {/* Daily Missions */}
      <section>
        <h2 className="font-display text-4xl text-secondary drop-shadow-[2px_2px_0_#000] -skew-x-6 uppercase mb-6">Daily Quests</h2>
        <div className="grid grid-cols-1 gap-4">
          {!missions ? (
             <div className="text-muted-foreground font-pixel text-xl">LOADING MISSIONS...</div>
          ) : missions.map(mission => (
             <div 
               key={mission.id}
               className={cn(
                 "bg-black border-4 p-4 flex flex-col md:flex-row md:items-center gap-4 transition-all",
                 mission.completed ? "border-secondary bg-secondary/5" : "border-muted"
               )}
             >
               <div className="flex-1">
                 <div className="flex items-center gap-2 mb-2">
                   {mission.completed ? <CheckCircle2 className="text-secondary w-5 h-5" /> : <CircleDashed className="text-muted-foreground w-5 h-5" />}
                   <h3 className={cn("font-display text-xl uppercase", mission.completed ? "text-secondary" : "text-foreground")}>{mission.title}</h3>
                 </div>
                 <div className="flex items-center gap-4">
                   <div className="flex-1 bg-black border-2 border-black h-4">
                     <div 
                       className={cn("h-full transition-all duration-500", mission.completed ? "bg-secondary" : "bg-primary")}
                       style={{ width: `${Math.min(100, (mission.current / mission.target) * 100)}%` }}
                     />
                   </div>
                   <span className="font-mono text-sm whitespace-nowrap">
                     {mission.current} / {mission.target} {mission.unit}
                   </span>
                 </div>
               </div>
               
               <div className="bg-card border-2 border-black px-4 py-2 shrink-0 text-center">
                 <span className="block text-xs uppercase font-bold text-muted-foreground">REWARD</span>
                 <span className="font-pixel text-xl text-accent">+{mission.rewardXp} XP</span>
               </div>
             </div>
          ))}
        </div>
      </section>

      {/* Sticker Book (Achievements) */}
      <section>
        <h2 className="font-display text-4xl text-primary drop-shadow-[2px_2px_0_#000] -skew-x-6 uppercase mb-6 flex items-center gap-4">
          <Trophy className="w-8 h-8 text-accent" /> Sticker Book
        </h2>
        
        <div className="bg-card border-4 border-foreground p-8 shadow-[8px_8px_0_0_#ff00ff] relative halftone-bg min-h-[400px]">
           <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
             {!achievements ? (
                <div className="col-span-full text-muted-foreground font-pixel text-xl">LOADING STICKERS...</div>
             ) : achievements.map(ach => (
                <div 
                  key={ach.id} 
                  className={cn(
                    "flex flex-col items-center text-center group",
                    !ach.earnedAt && "opacity-40 grayscale hover:grayscale-0 transition-all duration-500"
                  )}
                >
                  <div className="relative w-24 h-24 mb-4">
                    {/* Replace with actual stickers generated earlier or fallback to text if sticker map isn't 1:1.
                        For now, we'll use a placeholder div that looks like a sticker. */}
                    <div className={cn(
                      "w-full h-full rounded-full border-4 flex items-center justify-center bg-black shadow-[4px_4px_0_0_#000] rotate-[-5deg]",
                      ach.earnedAt ? "border-primary" : "border-muted border-dashed"
                    )}>
                      {!ach.earnedAt && <Lock className="w-8 h-8 text-muted-foreground" />}
                      {ach.earnedAt && <span className="font-pixel text-4xl">{ach.sticker}</span>}
                    </div>
                  </div>
                  
                  <h4 className="font-display text-lg text-white uppercase leading-tight mb-1">{ach.name}</h4>
                  <p className="text-xs text-muted-foreground font-mono">{ach.description}</p>
                  
                  {!ach.earnedAt && ach.progress > 0 && (
                    <div className="w-full mt-2 bg-black h-1.5 border border-muted">
                      <div className="bg-accent h-full" style={{ width: `${ach.progress * 100}%`}} />
                    </div>
                  )}
                </div>
             ))}
           </div>
        </div>
      </section>

    </div>
  );
}
