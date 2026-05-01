import { useGetMinerConfig, useUpdateMinerConfig, getGetMinerConfigQueryKey, getGetMinerStatusQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useRef } from "react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Settings, Save, TerminalSquare } from "lucide-react";

const configSchema = z.object({
  mode: z.enum(["demo", "real"]),
  buddyName: z.string().min(1, "Buddy needs a name"),
  walletAddress: z.string().optional(),
  poolUrl: z.string().min(1, "Pool URL required"),
  workerName: z.string().min(1, "Worker name required"),
  electricityCostKwh: z.coerce.number().min(0),
  pcMinerEnabled: z.boolean(),
});

type ConfigFormValues = z.infer<typeof configSchema>;

export default function Setup() {
  const queryClient = useQueryClient();
  const { data: config, isLoading } = useGetMinerConfig();
  const updateConfig = useUpdateMinerConfig();
  const initRef = useRef(false);

  const form = useForm<ConfigFormValues>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      mode: "demo",
      buddyName: "Feral Pi",
      walletAddress: "",
      poolUrl: "stratum+tcp://pool.example.com:3333",
      workerName: "worker1",
      electricityCostKwh: 0.12,
      pcMinerEnabled: false
    }
  });

  useEffect(() => {
    if (config && !initRef.current) {
      form.reset({
        mode: config.mode,
        buddyName: config.buddyName,
        walletAddress: config.walletAddress || "",
        poolUrl: config.poolUrl,
        workerName: config.workerName,
        electricityCostKwh: config.electricityCostKwh,
        pcMinerEnabled: config.pcMinerEnabled
      });
      initRef.current = true;
    }
  }, [config, form]);

  function onSubmit(data: ConfigFormValues) {
    updateConfig.mutate(
      { data },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMinerConfigQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetMinerStatusQueryKey() });
          toast.success("CONFIG FLASHED TO ROM");
        },
        onError: () => {
          toast.error("ROM FLASH FAILED");
        }
      }
    );
  }

  if (isLoading) {
    return <div className="p-8 text-primary font-pixel text-2xl text-center">MOUNTING FS...</div>;
  }

  return (
    <div className="flex flex-col gap-8 pb-20 max-w-3xl mx-auto">
      <div className="flex items-center gap-4 border-b-4 border-primary pb-4">
        <Settings className="w-10 h-10 text-primary" />
        <h2 className="font-display text-4xl text-primary drop-shadow-[2px_2px_0_#000] uppercase -skew-x-6">Rig Setup</h2>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          
          <div className="bg-card border-4 border-foreground p-6 shadow-[6px_6px_0_0_#ff00ff]">
             <h3 className="font-display text-2xl text-foreground mb-6 uppercase">Identity & Mode</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="buddyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-primary uppercase">Buddy Name</FormLabel>
                      <FormControl>
                        <Input {...field} className="bg-black border-2 border-muted focus-visible:ring-primary focus-visible:border-primary font-pixel text-xl rounded-none h-12" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="mode"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between bg-black border-2 border-muted p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base font-bold font-mono uppercase">REAL MODE</FormLabel>
                        <FormDescription className="font-mono text-xs">
                          Disable demo to actually mine
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value === "real"}
                          onCheckedChange={(checked) => field.onChange(checked ? "real" : "demo")}
                          className="data-[state=checked]:bg-destructive"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
             </div>
          </div>

          <div className="bg-card border-4 border-secondary p-6 shadow-[6px_6px_0_0_#00ff00]">
             <h3 className="font-display text-2xl text-secondary mb-6 uppercase">Stratum Config</h3>
             <div className="space-y-6">
               <FormField
                  control={form.control}
                  name="poolUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-secondary uppercase">Pool URL</FormLabel>
                      <FormControl>
                        <Input {...field} className="bg-black border-2 border-muted font-mono rounded-none" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="walletAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono text-secondary uppercase">Wallet Address</FormLabel>
                        <FormControl>
                          <Input {...field} className="bg-black border-2 border-muted font-mono rounded-none" placeholder="bc1q..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="workerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono text-secondary uppercase">Worker Name</FormLabel>
                        <FormControl>
                          <Input {...field} className="bg-black border-2 border-muted font-mono rounded-none" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card border-4 border-accent p-6 shadow-[6px_6px_0_0_#ffff00]">
               <h3 className="font-display text-xl text-accent mb-4 uppercase">Economics</h3>
               <FormField
                  control={form.control}
                  name="electricityCostKwh"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-accent uppercase">Cost per kWh (USD)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-muted-foreground">$</span>
                          <Input {...field} type="number" step="0.01" className="bg-black border-2 border-muted font-mono rounded-none pl-8" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>

            <div className="bg-card border-4 border-primary p-6 shadow-[6px_6px_0_0_#ff00ff]">
               <h3 className="font-display text-xl text-primary mb-4 uppercase">PC Miner</h3>
               <FormField
                  control={form.control}
                  name="pcMinerEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between bg-black border-2 border-muted p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base font-bold font-mono uppercase text-primary">Enable Web/PC Miner</FormLabel>
                        <FormDescription className="font-mono text-[10px]">
                          Uses local resources
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="data-[state=checked]:bg-primary"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
            </div>
          </div>

          <Button 
            type="submit" 
            disabled={updateConfig.isPending}
            className="w-full font-display text-3xl py-8 rounded-none uppercase bg-foreground text-black hover:bg-white border-4 border-black shadow-[8px_8px_0_0_#000] hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0_0_#000] transition-all"
          >
            {updateConfig.isPending ? "SAVING..." : <><Save className="mr-2 w-6 h-6" /> SAVE CONFIG</>}
          </Button>

        </form>
      </Form>

      {/* Raspberry Pi Setup Instructions */}
      <div className="bg-black border-4 border-muted border-dashed p-6 mt-8">
        <div className="flex items-center gap-3 mb-4">
          <TerminalSquare className="w-8 h-8 text-muted-foreground" />
          <h3 className="font-display text-2xl text-muted-foreground uppercase">Connect Hardware</h3>
        </div>
        <p className="font-mono text-sm text-muted-foreground mb-4 leading-relaxed">
          Running a Raspberry Pi or ESP32 rig? Copy this one-liner to your terminal to install the Guama-Yotchi telemetry daemon and link it to this dashboard.
        </p>
        <div className="bg-card border-2 border-muted p-4 relative group">
          <code className="font-mono text-secondary text-sm break-all">
            curl -sSL https://raw.githubusercontent.com/username/guama-yotchi/main/pi/install.sh | bash -s -- --endpoint {window.location.origin}{import.meta.env.BASE_URL}
          </code>
          <button 
            onClick={() => {
              navigator.clipboard.writeText(`curl -sSL https://raw.githubusercontent.com/username/guama-yotchi/main/pi/install.sh | bash -s -- --endpoint ${window.location.origin}${import.meta.env.BASE_URL}`);
              toast.success("COPIED TO CLIPBOARD");
            }}
            className="absolute top-2 right-2 bg-black border border-muted px-2 py-1 text-xs font-bold uppercase text-muted-foreground hover:text-white hover:border-white transition-colors"
          >
            COPY
          </button>
        </div>
      </div>

    </div>
  );
}
