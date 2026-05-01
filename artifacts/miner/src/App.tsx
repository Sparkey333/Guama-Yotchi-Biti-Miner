import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";

// Pages
import Home from "@/pages/home";
import Stats from "@/pages/stats";
import Heatmap from "@/pages/heatmap";
import Power from "@/pages/power";
import Missions from "@/pages/missions";
import Ai from "@/pages/ai";
import Setup from "@/pages/setup";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/stats" component={Stats} />
        <Route path="/heatmap" component={Heatmap} />
        <Route path="/power" component={Power} />
        <Route path="/missions" component={Missions} />
        <Route path="/ai" component={Ai} />
        <Route path="/setup" component={Setup} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
