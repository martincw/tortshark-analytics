import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Sunrise, Loader2, RefreshCw, Target, AlertTriangle, ChevronDown, ChevronUp, Send, MessageCircle } from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { ScrollArea } from "@/components/ui/scroll-area";

type AnalysisPeriod = "yesterday" | "trailing7";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const MorningBriefing: React.FC = () => {
  const { currentWorkspace } = useWorkspace();
  const [briefing, setBriefing] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [period, setPeriod] = useState<AnalysisPeriod>("yesterday");
  
  // Chat state
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchBriefing = async (selectedPeriod: AnalysisPeriod = period) => {
    if (!currentWorkspace?.id) return;

    setIsLoading(true);
    setBriefing("");

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/campaign-analyst`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            workspaceId: currentWorkspace.id,
            briefingMode: true,
            analysisPeriod: selectedPeriod,
            clientDate: new Date().toLocaleDateString('en-CA'), // YYYY-MM-DD format
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 429) {
          toast.error("Rate limit exceeded. Please wait and try again.");
        } else if (response.status === 402) {
          toast.error("AI credits depleted. Please add credits.");
        } else {
          toast.error(errorData.error || "Failed to load briefing");
        }
        setIsLoading(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let textBuffer = "";
      let briefingText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              briefingText += content;
              setBriefing(briefingText);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              briefingText += content;
              setBriefing(briefingText);
            }
          } catch { /* ignore */ }
        }
      }

      setHasLoaded(true);
    } catch (error) {
      console.error("Briefing error:", error);
      toast.error("Failed to load morning briefing");
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-load on mount
  useEffect(() => {
    if (currentWorkspace?.id && !hasLoaded && !isLoading) {
      fetchBriefing(period);
    }
  }, [currentWorkspace?.id]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handlePeriodChange = (newPeriod: AnalysisPeriod) => {
    setPeriod(newPeriod);
    fetchBriefing(newPeriod);
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || !currentWorkspace?.id || isChatLoading) return;

    const userMessage: Message = { role: "user", content: chatInput.trim() };
    const newMessages = [...chatMessages, userMessage];
    setChatMessages(newMessages);
    setChatInput("");
    setIsChatLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/campaign-analyst`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            workspaceId: currentWorkspace.id,
            messages: newMessages,
            analysisPeriod: period,
            clientDate: new Date().toLocaleDateString('en-CA'), // YYYY-MM-DD format
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 429) {
          toast.error("Rate limit exceeded. Please wait and try again.");
        } else if (response.status === 402) {
          toast.error("AI credits depleted. Please add credits.");
        } else {
          toast.error(errorData.error || "Failed to get response");
        }
        setIsChatLoading(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let textBuffer = "";
      let assistantContent = "";

      // Add empty assistant message that we'll update
      setChatMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setChatMessages(prev => {
                const updated = [...prev];
                if (updated.length > 0 && updated[updated.length - 1].role === "assistant") {
                  updated[updated.length - 1] = { role: "assistant", content: assistantContent };
                }
                return updated;
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setChatMessages(prev => {
                const updated = [...prev];
                if (updated.length > 0 && updated[updated.length - 1].role === "assistant") {
                  updated[updated.length - 1] = { role: "assistant", content: assistantContent };
                }
                return updated;
              });
            }
          } catch { /* ignore */ }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast.error("Failed to get response");
    } finally {
      setIsChatLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <Card className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-rose-500/10 border-amber-500/30">
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <Sunrise className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg flex items-center gap-2">
                {getGreeting()}!
                <Badge variant="secondary" className="bg-amber-500/20 text-amber-700 text-xs">
                  Today's Priority
                </Badge>
              </h3>
              <p className="text-sm text-muted-foreground">
                Your #1 focus based on performance data and recent changes
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border bg-muted/50 p-0.5">
              <Button
                variant={period === "yesterday" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => handlePeriodChange("yesterday")}
                disabled={isLoading}
                className="h-7 text-xs px-3"
              >
                Yesterday
              </Button>
              <Button
                variant={period === "trailing7" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => handlePeriodChange("trailing7")}
                disabled={isLoading}
                className="h-7 text-xs px-3"
              >
                Trailing 7 Days
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchBriefing(period)}
              disabled={isLoading}
              className="gap-1"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {isExpanded && (
          <>
            {isLoading && !briefing && (
              <div className="flex items-center gap-3 py-6 justify-center text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Analyzing your campaigns...</span>
              </div>
            )}

            {briefing && (
              <div className="prose prose-sm dark:prose-invert max-w-none mt-2">
                <ReactMarkdown
                  components={{
                    h2: ({ children }) => (
                      <h2 className="text-base font-bold mt-3 mb-2 flex items-center gap-2">
                        <Target className="h-4 w-4 text-amber-600" />
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-sm font-semibold mt-2 mb-1">{children}</h3>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc list-inside space-y-1 my-2 text-sm">{children}</ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal list-inside space-y-1 my-2 text-sm">{children}</ol>
                    ),
                    li: ({ children }) => (
                      <li className="text-sm">{children}</li>
                    ),
                    p: ({ children }) => (
                      <p className="my-1.5 text-sm">{children}</p>
                    ),
                    strong: ({ children }) => (
                      <strong className="font-semibold text-foreground">{children}</strong>
                    ),
                    table: ({ children }) => (
                      <div className="overflow-x-auto my-3 rounded-lg border">
                        <table className="min-w-full text-xs">{children}</table>
                      </div>
                    ),
                    thead: ({ children }) => (
                      <thead className="bg-muted">{children}</thead>
                    ),
                    tbody: ({ children }) => (
                      <tbody className="divide-y">{children}</tbody>
                    ),
                    tr: ({ children }) => (
                      <tr className="hover:bg-muted/50">{children}</tr>
                    ),
                    th: ({ children }) => (
                      <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">{children}</th>
                    ),
                    td: ({ children }) => (
                      <td className="px-3 py-2 whitespace-nowrap">{children}</td>
                    ),
                  }}
                >
                  {briefing}
                </ReactMarkdown>
              </div>
            )}

            {!isLoading && !briefing && hasLoaded && (
              <div className="text-center py-4 text-muted-foreground">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Could not load briefing. Click refresh to try again.</p>
              </div>
            )}

            {/* Chat Toggle */}
            {briefing && !showChat && (
              <div className="mt-4 pt-4 border-t border-amber-500/20">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowChat(true)}
                  className="w-full gap-2 text-amber-700 border-amber-500/30 hover:bg-amber-500/10"
                >
                  <MessageCircle className="h-4 w-4" />
                  Ask follow-up questions about your data
                </Button>
              </div>
            )}

            {/* Chat Interface */}
            {showChat && (
              <div className="mt-4 pt-4 border-t border-amber-500/20">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-amber-600" />
                    Chat with your data
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowChat(false);
                      setChatMessages([]);
                    }}
                    className="text-xs h-6"
                  >
                    Close chat
                  </Button>
                </div>

                {/* Chat Messages */}
                {chatMessages.length > 0 && (
                  <ScrollArea className="h-[300px] mb-3 rounded-lg border bg-background/50 p-3">
                    <div className="space-y-4">
                      {chatMessages.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-lg px-3 py-2 ${
                              msg.role === "user"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                          >
                            {msg.role === "assistant" ? (
                              <div className="prose prose-sm dark:prose-invert max-w-none">
                                <ReactMarkdown
                                  components={{
                                    p: ({ children }) => <p className="my-1 text-sm">{children}</p>,
                                    ul: ({ children }) => <ul className="list-disc list-inside my-1 text-sm">{children}</ul>,
                                    ol: ({ children }) => <ol className="list-decimal list-inside my-1 text-sm">{children}</ol>,
                                    li: ({ children }) => <li className="text-sm">{children}</li>,
                                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                                  }}
                                >
                                  {msg.content || "..."}
                                </ReactMarkdown>
                              </div>
                            ) : (
                              <p className="text-sm">{msg.content}</p>
                            )}
                          </div>
                        </div>
                      ))}
                      <div ref={chatEndRef} />
                    </div>
                  </ScrollArea>
                )}

                {/* Chat Input */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Ask about campaigns, performance, trends..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendChatMessage();
                      }
                    }}
                    disabled={isChatLoading}
                    className="flex-1"
                  />
                  <Button
                    size="icon"
                    onClick={sendChatMessage}
                    disabled={!chatInput.trim() || isChatLoading}
                  >
                    {isChatLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {chatMessages.length === 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[
                      "Which campaign should I scale today?",
                      "What's my best performing campaign?",
                      "Show me campaigns losing money",
                    ].map((suggestion) => (
                      <Button
                        key={suggestion}
                        variant="outline"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => {
                          setChatInput(suggestion);
                        }}
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default MorningBriefing;
