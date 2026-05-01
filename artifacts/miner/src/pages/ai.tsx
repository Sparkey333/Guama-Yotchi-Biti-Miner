import { useState, useRef, useEffect } from "react";
import { useListAiPresets } from "@workspace/api-client-react";
import { Send, Bot, User, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function Ai() {
  const [model, setModel] = useState<"claude" | "gpt">("claude");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: presets } = useListAiPresets();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isStreaming) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsStreaming(true);

    try {
      const base = import.meta.env.BASE_URL;
      const res = await fetch(`${base}api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, model })
      });

      if (!res.body) throw new Error("No body in response");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";

      // Add empty assistant message to be filled
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6);
            if (!dataStr) continue;

            try {
              const data = JSON.parse(dataStr);
              if (data.content) {
                assistantMessage += data.content;
                setMessages(prev => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1].content = assistantMessage;
                  return newMessages;
                });
              }
              if (data.done) {
                break;
              }
            } catch (err) {
              console.error("Error parsing SSE:", err);
            }
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: "assistant", content: "[CONNECTION ERROR - BUDDY IS CONFUSED]" }]);
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] gap-4 pb-4">
      <div className="flex items-center justify-between shrink-0">
        <h2 className="font-display text-4xl text-primary drop-shadow-[2px_2px_0_#000] -skew-x-6 uppercase flex items-center gap-3">
          <Bot className="w-8 h-8" /> AI Buddy
        </h2>

        {/* Model Toggle */}
        <div className="flex bg-black border-2 border-primary p-1">
          <button
            onClick={() => setModel('claude')}
            className={cn(
              "px-4 py-1 font-bold text-sm uppercase transition-all",
              model === 'claude' ? "bg-primary text-black" : "text-primary hover:bg-muted"
            )}
          >
            Claude
          </button>
          <button
            onClick={() => setModel('gpt')}
            className={cn(
              "px-4 py-1 font-bold text-sm uppercase transition-all",
              model === 'gpt' ? "bg-primary text-black" : "text-primary hover:bg-muted"
            )}
          >
            GPT
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 bg-black border-4 border-foreground overflow-hidden flex flex-col shadow-[8px_8px_0_0_#ff00ff]">
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {messages.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center opacity-50 space-y-4">
               <Bot className="w-16 h-16 text-primary animate-pulse" />
               <p className="font-pixel text-2xl text-foreground text-center">I'M AWAKE. WHAT DO WE OVERCLOCK FIRST?</p>
             </div>
          ) : (
            messages.map((msg, i) => (
              <div 
                key={i} 
                className={cn(
                  "flex gap-3 max-w-[85%]",
                  msg.role === 'user' ? "self-end flex-row-reverse" : "self-start"
                )}
              >
                <div className={cn(
                  "w-8 h-8 shrink-0 flex items-center justify-center border-2",
                  msg.role === 'user' ? "bg-accent border-black text-black" : "bg-black border-primary text-primary"
                )}>
                  {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                </div>
                <div className={cn(
                  "p-3 border-2 font-mono text-sm leading-relaxed whitespace-pre-wrap",
                  msg.role === 'user' 
                    ? "bg-accent/10 border-accent text-accent" 
                    : "bg-primary/5 border-primary text-white"
                )}>
                  {msg.content}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-card border-t-2 border-foreground p-4 flex flex-col gap-3 shrink-0">
          
          {/* Presets */}
          {presets && presets.length > 0 && (
             <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
               {presets.map(p => (
                 <button
                   key={p.id}
                   onClick={() => setInput(p.prompt)}
                   className="shrink-0 px-3 py-1 bg-black border border-muted-foreground text-xs font-mono text-muted-foreground hover:text-white hover:border-white transition-colors whitespace-nowrap flex items-center gap-1 uppercase"
                 >
                   <Sparkles className="w-3 h-3" /> {p.label}
                 </button>
               ))}
             </div>
          )}

          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="ASK YOUR BUDDY..."
              disabled={isStreaming}
              className="flex-1 bg-black border-2 border-foreground px-4 py-2 font-mono text-white focus:outline-none focus:border-primary placeholder:text-muted-foreground uppercase"
            />
            <button 
              type="submit"
              disabled={!input.trim() || isStreaming}
              className="bg-primary text-black px-6 py-2 border-2 border-primary font-bold uppercase hover:bg-transparent hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
