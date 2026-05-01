import { useGetProfitHeatmap } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { AlertTriangle, Clock } from "lucide-react";

export default function Heatmap() {
  const { data: heatmap } = useGetProfitHeatmap({ query: { refetchInterval: 60000 } });

  if (!heatmap) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 opacity-50 py-20">
         <Clock className="w-16 h-16 animate-spin text-primary" />
         <p className="font-pixel text-2xl text-foreground">CALCULATING PROFIT DYNAMICS...</p>
      </div>
    );
  }

  // 24h heatmap represented as 6 columns x 4 rows
  // To make it look like a 6x4 grid, we need to chunk the 24 hours
  const grid = [];
  for (let i = 0; i < 4; i++) {
    const row = [];
    for (let j = 0; j < 6; j++) {
      const hourIndex = i * 6 + j;
      const hourData = heatmap.hours.find(h => h.hour === hourIndex);
      row.push(hourData);
    }
    grid.push(row);
  }

  return (
    <div className="flex flex-col gap-8 pb-20">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-4xl text-primary drop-shadow-[2px_2px_0_#000] -skew-x-6 uppercase">Profit Heatmap</h2>
      </div>

      <div className="bg-black border-4 border-foreground p-4 lg:p-8 shadow-[6px_6px_0_0_#0ff]">
        <div className="grid grid-cols-6 gap-2 lg:gap-4 mb-8">
          {grid.map((row, r) => (
            row.map((cell, c) => {
               if (!cell) return <div key={`empty-${r}-${c}`} className="aspect-square bg-muted" />;
               
               const isBest = cell.hour === heatmap.bestHour;
               const isWorst = cell.hour === heatmap.worstHour;
               
               // Map score 0-100 to color intensity
               const intensity = Math.max(10, cell.profitScore);
               
               return (
                 <div 
                   key={cell.hour} 
                   className={cn(
                     "aspect-square flex flex-col items-center justify-center relative group border-2 border-black transition-transform hover:scale-105 z-10",
                     isBest && "ring-4 ring-accent ring-offset-4 ring-offset-black z-20"
                   )}
                   style={{ 
                     backgroundColor: `hsl(var(--primary) / ${intensity}%)`,
                   }}
                 >
                   <span className="font-pixel text-xl text-white drop-shadow-[1px_1px_0_#000]">{cell.hour}:00</span>
                   
                   {isBest && (
                     <div className="absolute -top-3 -right-3 bg-accent text-black font-bold text-[10px] px-1 rotate-12 border-2 border-black">
                       PRIME
                     </div>
                   )}
                   
                   {isWorst && (
                     <div className="absolute top-1 left-1 text-destructive">
                       <AlertTriangle className="w-4 h-4" />
                     </div>
                   )}

                   {/* Tooltip */}
                   <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-black border-2 border-primary p-2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-[4px_4px_0_0_#ff00ff]">
                      <p className="text-primary font-bold text-sm uppercase mb-1">{cell.hour}:00 - {cell.hour + 1}:00</p>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Net:</span>
                        <span className={cell.netUsd >= 0 ? "text-secondary" : "text-destructive"}>${cell.netUsd.toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Power:</span>
                        <span className="text-white">${cell.avgPowerCostUsd.toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Score:</span>
                        <span className="text-white">{cell.profitScore} / 100</span>
                      </div>
                   </div>
                 </div>
               );
            })
          ))}
        </div>

        <div className="flex flex-col md:flex-row gap-4 justify-between border-t-2 border-dashed border-muted pt-6">
          <div className="bg-black border-2 border-accent p-4 flex-1">
             <h4 className="text-accent font-bold text-xs uppercase tracking-widest mb-1">BEST TIME TO MINE</h4>
             <p className="font-display text-3xl text-white">{heatmap.bestHour}:00</p>
             <p className="text-muted-foreground text-sm mt-2">Highest profit margin vs electricity cost</p>
          </div>
          
          <div className="bg-black border-2 border-destructive p-4 flex-1">
             <h4 className="text-destructive font-bold text-xs uppercase tracking-widest mb-1">WORST TIME TO MINE</h4>
             <p className="font-display text-3xl text-white">{heatmap.worstHour}:00</p>
             <p className="text-muted-foreground text-sm mt-2">Power is expensive or diff is high</p>
          </div>
        </div>
      </div>
    </div>
  );
}
