import { useGetMinerHistory, useListDevices } from "@workspace/api-client-react";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Activity, Cpu, Server, Wifi, Zap } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function Stats() {
  const [minutes, setMinutes] = useState(60);
  const { data: history } = useGetMinerHistory({ minutes }, { query: { refetchInterval: 10000 } });
  const { data: devices } = useListDevices({ query: { refetchInterval: 5000 } });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-black border-2 border-primary p-3">
          <p className="text-white font-pixel text-lg mb-2">{new Date(label).toLocaleTimeString()}</p>
          {payload.map((p: any) => (
            <p key={p.name} className="font-mono text-sm uppercase" style={{ color: p.color }}>
              {p.name}: {p.value.toFixed(2)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col gap-8 pb-20">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-4xl text-primary drop-shadow-[2px_2px_0_#000] -skew-x-6">RIG STATS</h2>
        <div className="flex gap-2">
           {[15, 60, 1440].map(m => (
             <button
               key={m}
               onClick={() => setMinutes(m)}
               className={cn(
                 "px-4 py-1 font-bold border-2 border-primary text-sm uppercase transition-all",
                 minutes === m ? "bg-primary text-black shadow-[2px_2px_0_#fff] translate-x-[-2px] translate-y-[-2px]" : "bg-black text-primary hover:bg-muted"
               )}
             >
               {m === 15 ? '15m' : m === 60 ? '1h' : '24h'}
             </button>
           ))}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border-4 border-foreground p-4 shadow-[6px_6px_0_0_#ff00ff]">
          <h3 className="font-display text-2xl text-foreground mb-4 uppercase">HASHRATE (GH/s)</h3>
          <div className="h-[250px] w-full">
            {history ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="colorHash" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="t" tickFormatter={(t) => new Date(t).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} stroke="#666" />
                  <YAxis stroke="#666" />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="step" dataKey="hashrateGhs" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorHash)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
               <div className="w-full h-full flex items-center justify-center text-muted-foreground font-pixel text-xl">LOADING HISTORY...</div>
            )}
          </div>
        </div>

        <div className="bg-card border-4 border-accent p-4 shadow-[6px_6px_0_0_#ffff00]">
          <h3 className="font-display text-2xl text-accent mb-4 uppercase">POWER DRAW (W)</h3>
          <div className="h-[250px] w-full">
            {history ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="t" tickFormatter={(t) => new Date(t).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} stroke="#666" />
                  <YAxis stroke="#666" />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="step" dataKey="powerWatts" stroke="hsl(var(--accent))" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
               <div className="w-full h-full flex items-center justify-center text-muted-foreground font-pixel text-xl">LOADING HISTORY...</div>
            )}
          </div>
        </div>
      </div>

      {/* Devices */}
      <div>
         <h2 className="font-display text-3xl text-secondary mb-4 drop-shadow-[2px_2px_0_#000] -skew-x-6">WORKERS</h2>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {!devices ? (
               <div className="col-span-full text-center py-8 text-muted-foreground font-pixel text-xl">SCANNING NETWORK...</div>
            ) : devices.length === 0 ? (
               <div className="col-span-full text-center py-8 text-muted-foreground font-pixel text-xl">NO WORKERS FOUND</div>
            ) : (
              devices.map(device => (
                <div key={device.id} className="bg-black border-2 border-secondary p-4 flex flex-col gap-3 relative overflow-hidden group">
                   <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                     {device.kind === 'pi' ? <Server className="w-16 h-16" /> : <Cpu className="w-16 h-16" />}
                   </div>
                   <div className="flex items-center justify-between z-10">
                     <span className="font-display text-xl text-white uppercase">{device.label}</span>
                     {device.online ? (
                       <span className="flex items-center gap-1 text-secondary text-xs font-bold px-2 py-1 bg-secondary/10 border border-secondary"><Wifi className="w-3 h-3"/> ONLINE</span>
                     ) : (
                       <span className="flex items-center gap-1 text-destructive text-xs font-bold px-2 py-1 bg-destructive/10 border border-destructive"><Wifi className="w-3 h-3 opacity-50"/> OFFLINE</span>
                     )}
                   </div>
                   <div className="flex justify-between items-end z-10 mt-4">
                     <div>
                       <p className="text-xs text-muted-foreground uppercase font-bold">HASHRATE</p>
                       <p className="font-pixel text-2xl text-primary">{device.hashrateGhs.toFixed(2)} GH/s</p>
                     </div>
                     <div className="text-right">
                       <p className="text-xs text-muted-foreground uppercase font-bold">POWER</p>
                       <p className="font-pixel text-xl text-accent">{device.powerWatts} W</p>
                     </div>
                   </div>
                </div>
              ))
            )}
         </div>
      </div>

    </div>
  );
}
