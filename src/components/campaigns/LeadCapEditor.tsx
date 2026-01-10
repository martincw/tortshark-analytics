import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Save, Target } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface LeadCapEditorProps {
  campaignId: string;
}

const LeadCapEditor: React.FC<LeadCapEditorProps> = ({ campaignId }) => {
  const [targetLeadsPerDay, setTargetLeadsPerDay] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalValue, setOriginalValue] = useState<string>("");

  useEffect(() => {
    const fetchTarget = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("campaign_targets")
        .select("target_leads_per_day")
        .eq("campaign_id", campaignId)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching target:", error);
      }

      const value = data?.target_leads_per_day?.toString() || "0";
      setTargetLeadsPerDay(value);
      setOriginalValue(value);
      setIsLoading(false);
    };

    if (campaignId) {
      fetchTarget();
    }
  }, [campaignId]);

  const handleChange = (value: string) => {
    setTargetLeadsPerDay(value);
    setHasChanges(value !== originalValue);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const numericValue = parseInt(targetLeadsPerDay) || 0;
      
      const { error } = await supabase
        .from("campaign_targets")
        .update({ target_leads_per_day: numericValue })
        .eq("campaign_id", campaignId);

      if (error) {
        throw error;
      }

      setOriginalValue(targetLeadsPerDay);
      setHasChanges(false);
      toast.success("Daily lead cap updated successfully");
    } catch (error) {
      console.error("Error saving target:", error);
      toast.error("Failed to save daily lead cap");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Loading lead cap...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-4 w-4" />
          Daily Lead Cap
        </CardTitle>
        <CardDescription>
          Set your target leads per day for tracking on the dashboard
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-3">
          <div className="flex-1 space-y-2">
            <Label htmlFor="targetLeadsPerDay">Target Leads/Day</Label>
            <Input
              id="targetLeadsPerDay"
              type="number"
              min="0"
              value={targetLeadsPerDay}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="e.g., 30"
            />
          </div>
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || isSaving}
            size="default"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save
          </Button>
        </div>
        {parseInt(targetLeadsPerDay) > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            Weekly target: {parseInt(targetLeadsPerDay) * 7} leads
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default LeadCapEditor;
