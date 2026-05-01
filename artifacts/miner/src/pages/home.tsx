import { useGetMinerStatus, useStartMiner, useStopMiner, useFeedBuddy, useTriggerOverclock } from "@workspace/api-client-react";
import { useState, useEffect, useRef } from "react";
import { Battery, BatteryCharging, Flame, Activity, Zap, ShieldAlert, Cpu } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import buddyHappy from "@/assets/buddy-happy.png";
import buddyHungry from "@/assets/buddy-hungry.png";
import buddySleepy from "@/assets/buddy-sleepy.png";
import buddyHyped from "@/assets/buddy-hyped.png";
import buddySad from "@/assets/buddy-sad.png";
import buddySick from "@/assets/buddy-sick.png";
import { motion, AnimatePresence } from "framer-motion";

function BuddyImage({ mood, running }: { mood: string, running: boolean }) {
  let img = buddyHappy;
  if (!running || mood === 'offline') img = buddySleepy;
  else if (mood === 'hungry') img = buddyHungry;
  else if (mood === 'hyped') img = buddyHyped;
  else if (mood === 'sad') img = buddySad;
  else if (mood === 'sick') img = buddySick;
  
  return (
    <motion.div 
      className="relative w-64 h-64 mx-auto"
      animate={{ 
        y: running ? [0, -10, 0] : 0,
        rotate: running && mood === 'hyped' ? [-2, 2, -2] : 0
      }}
      transition={{ 
        repeat: Infinity, 
        duration: running ? (mood === 'hyped' ? 0.2 : 0.8) : 2,
        ease: "easeInOut" 
      }}
    >
      <img src={img} alt={`Buddy mood: ${mood}`} className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(0,255,255,0.8)]" />
      {mood === 'hyped' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Flame className="w-full h-full text-accent animate-pulse opacity-50" />
        </div>
      )}
    </motion.div>
  );
}

export default function Home() {
  const queryClient = useQueryClient();
  const { data: status } = useGetMinerStatus({ query: { refetchInterval: 2000 } });
  
  const startMiner = useStartMiner({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/miner/status"] })
    }
  });
  
  const stopMiner = useStopMiner({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/miner/status"] })
    }
  });
  
  const feedBuddy = useFeedBuddy({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/miner/status"] })
    }
  });
  
  const triggerOverclock = useTriggerOverclock({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/miner/status"] })
    }
  });

  const [clicks, setClicks] = useState(0);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleOverclockClick = () => {
    setClicks(c => c + 1);
    
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }
    
    clickTimeoutRef.current = setTimeout(() => {
      triggerOverclock.mutate({ data: { clicks } });
      setClicks(0);
    }, 1500);
  };

  if (!status) return null;

  return (
    <div className="flex flex-col gap-6 pb-20">
      
      {/* Top HUD */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-black border-2 border-primary p-3 flex flex-col items-center">
          <span className="text-primary text-xs uppercase font-bold tracking-widest">HASHRATE</span>
          <span className="text-foreground font-display text-2xl drop-shadow-[2px_2px_0_#ff00ff]">{status.hashrateGhs.toFixed(2)} GH/s</span>
        </div>
        <div className="bg-black border-2 border-accent p-3 flex flex-col items-center">
          <span className="text-accent text-xs uppercase font-bold tracking-widest">POWER</span>
          <span className="text-white font-display text-2xl">{status.powerWatts} W</span>
        </div>
        <div className="bg-black border-2 border-secondary p-3 flex flex-col items-center">
          <span className="text-secondary text-xs uppercase font-bold tracking-widest">PROFIT / DAY</span>
          <span className="text-white font-display text-2xl">${status.estDailyUsd.toFixed(2)}</span>
        </div>
        <div className="bg-black border-2 border-primary p-3 flex flex-col items-center">
          <span className="text-primary text-xs uppercase font-bold tracking-widest">BTC PRICE</span>
          <span className="text-white font-display text-2xl">${status.btcPriceUsd.toLocaleString()}</span>
        </div>
      </div>

      {/* Main Buddy Area */}
      <div className="relative border-4 border-foreground bg-card p-8 min-h-[400px] flex flex-col items-center justify-center halftone-bg overflow-hidden shadow-[8px_8px_0_0_#ff00ff]">
        <div className="absolute top-4 left-4 flex gap-2">
           <div className="bg-black border-2 border-primary px-3 py-1 flex items-center gap-2">
              <span className="text-primary font-bold text-sm">LVL</span>
              <span className="text-white font-pixel text-xl">{status.buddyLevel}</span>
           </div>
           <div className="bg-black border-2 border-secondary px-3 py-1 flex items-center gap-2">
              <span className="text-secondary font-bold text-sm">XP</span>
              <span className="text-white font-pixel text-xl">{status.buddyXp}</span>
           </div>
        </div>

        <div className="absolute top-4 right-4 text-right">
           <div className="bg-black border-2 border-accent px-3 py-1 mb-2">
             <span className="text-accent font-bold text-sm mr-2">HUNGER</span>
             <span className="text-white font-pixel text-xl">{status.buddyHunger}%</span>
           </div>
        </div>

        <BuddyImage mood={status.mood} running={status.running} />

        <div className="mt-8 text-center bg-black border-2 border-primary px-6 py-2 rotate-[-2deg]">
          <h2 className="font-pixel text-3xl text-foreground uppercase">{status.buddyName}</h2>
          <p className="font-bold text-primary tracking-widest uppercase text-sm">STATUS: {status.mood}</p>
        </div>

        {/* Start/Stop Button */}
        <div className="absolute bottom-4 left-4 right-4 flex justify-center">
           <button
            onClick={() => status.running ? stopMiner.mutate() : startMiner.mutate()}
            disabled={startMiner.isPending || stopMiner.isPending}
            className={cn(
              "font-display text-4xl px-8 py-3 border-4 uppercase transition-all shadow-[6px_6px_0_0_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-[2px_2px_0_0_#000]",
              status.running 
                ? "bg-destructive border-black text-black hover:bg-red-600" 
                : "bg-secondary border-black text-black hover:bg-green-500"
            )}
           >
            {status.running ? "STOP MINING" : "START MINING"}
           </button>
        </div>
      </div>

      {/* Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Interaction Panel */}
        <div className="bg-black border-2 border-foreground p-4">
          <h3 className="font-display text-xl text-foreground mb-4 uppercase drop-shadow-[2px_2px_0_#000]">CARE ACTIONS</h3>
          <div className="grid grid-cols-3 gap-4">
             <button 
              onClick={() => feedBuddy.mutate({ data: { action: 'feed' } })}
              disabled={feedBuddy.isPending}
              className="bg-card border-2 border-primary p-4 flex flex-col items-center gap-2 hover:bg-primary hover:text-black transition-colors"
             >
                <Battery className="w-8 h-8" />
                <span className="font-bold">FEED</span>
             </button>
             <button 
              onClick={() => feedBuddy.mutate({ data: { action: 'pet' } })}
              disabled={feedBuddy.isPending}
              className="bg-card border-2 border-secondary p-4 flex flex-col items-center gap-2 hover:bg-secondary hover:text-black transition-colors"
             >
                <Activity className="w-8 h-8" />
                <span className="font-bold">PET</span>
             </button>
             <button 
              onClick={() => feedBuddy.mutate({ data: { action: 'clean' } })}
              disabled={feedBuddy.isPending}
              className="bg-card border-2 border-accent p-4 flex flex-col items-center gap-2 hover:bg-accent hover:text-black transition-colors"
             >
                <ShieldAlert className="w-8 h-8" />
                <span className="font-bold">CLEAN</span>
             </button>
          </div>
        </div>

        {/* Overclock Panel */}
        <div className="bg-black border-2 border-destructive p-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-destructive/10 animate-pulse pointer-events-none" />
          <h3 className="font-display text-xl text-destructive mb-2 uppercase">OVERCLOCK PAD</h3>
          <div className="flex justify-between mb-4">
            <span className="text-white font-bold text-sm">HEAT: {status.overclockHeat}%</span>
            <span className="text-white font-bold text-sm">MULT: {status.overclockMultiplier.toFixed(1)}x</span>
          </div>
          
          <div className="w-full bg-card h-4 border-2 border-black mb-4">
            <div 
              className={cn("h-full transition-all duration-300", status.overclockHeat > 80 ? "bg-destructive animate-pulse" : "bg-accent")} 
              style={{ width: `${Math.min(status.overclockHeat, 100)}%` }} 
            />
          </div>

          <button 
            onClick={handleOverclockClick}
            disabled={!status.running || status.overclockCooldownSec > 0}
            className={cn(
              "w-full font-display text-3xl py-6 border-4 border-black uppercase transition-all select-none shadow-[4px_4px_0_0_rgba(255,0,0,0.5)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
              status.running && status.overclockCooldownSec === 0 ? "bg-destructive text-white hover:bg-red-600" : "bg-muted text-gray-500 border-gray-600"
            )}
          >
            {status.overclockCooldownSec > 0 ? `COOLDOWN ${status.overclockCooldownSec}s` : "MASH TO OVERCLOCK"}
          </button>
        </div>

      </div>

    </div>
  );
}
