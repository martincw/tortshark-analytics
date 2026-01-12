import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sunrise, Loader2, RefreshCw, Target, AlertTriangle, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

const MorningBriefing: React.FC = () => {
  const { currentWorkspace } = useWorkspace();
  const [briefing, setBriefing] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const fetchBriefing = async () => {
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
      fetchBriefing();
    }
  }, [currentWorkspace?.id]);

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
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchBriefing}
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
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default MorningBriefing;
