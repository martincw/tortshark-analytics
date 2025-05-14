
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";

interface UseStatsSubmissionProps {
  fetchCampaigns: () => Promise<void>;
  onClose: () => void;
}

export const useStatsSubmission = ({ fetchCampaigns, onClose }: UseStatsSubmissionProps) => {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const submitStats = async (
    selectedCampaignId: string,
    statsDate: Date,
    leads: number,
    cases: number,
    adSpend: number,
    revenue: number
  ) => {
    if (!selectedCampaignId) {
      toast.error("Please select a campaign");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const dateString = statsDate.toISOString().split('T')[0];
      
      // Check if there's existing data for this date and campaign
      const { data: existingData, error: checkError } = await supabase
        .from('campaign_stats_history')
        .select('id')
        .eq('campaign_id', selectedCampaignId)
        .eq('date', dateString)
        .maybeSingle();
        
      if (checkError) {
        console.error("Error checking for existing stats:", checkError);
        toast.error("Error checking for existing data");
        return;
      }
      
      if (existingData) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('campaign_stats_history')
          .update({
            leads,
            cases,
            retainers: cases, // Using cases as retainers
            revenue,
            ad_spend: adSpend
          })
          .eq('id', existingData.id);
          
        if (updateError) {
          throw new Error(`Error updating stats: ${updateError.message}`);
        }
        
        toast.success("Stats updated successfully");
      } else {
        // Insert new record
        const { error: insertError } = await supabase
          .from('campaign_stats_history')
          .insert({
            id: uuidv4(),
            campaign_id: selectedCampaignId,
            date: dateString,
            leads,
            cases,
            retainers: cases, // Using cases as retainers
            revenue,
            ad_spend: adSpend
          });
          
        if (insertError) {
          throw new Error(`Error adding stats: ${insertError.message}`);
        }
        
        toast.success("Stats added successfully");
      }
      
      // Check if we should update the campaign's manual stats 
      // Only update if this is a more recent date than what's currently stored
      const { data: currentManualStats, error: manualStatsError } = await supabase
        .from('campaign_manual_stats')
        .select('date')
        .eq('campaign_id', selectedCampaignId)
        .single();
      
      if (manualStatsError && manualStatsError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error("Error checking manual stats:", manualStatsError);
      }
      
      // Only update manual stats if:
      // 1. There are no existing manual stats, or
      // 2. This new date is more recent than the existing date
      const shouldUpdateManualStats = !currentManualStats || 
        !currentManualStats.date ||
        new Date(dateString) >= new Date(currentManualStats.date);
      
      if (shouldUpdateManualStats) {
        console.log("Updating manual stats with newer date:", dateString);
        
        const { error: manualStatsUpdateError } = await supabase
          .from('campaign_manual_stats')
          .upsert({
            campaign_id: selectedCampaignId,
            leads,
            cases,
            retainers: cases,
            revenue,
            date: dateString
          }, {
            onConflict: 'campaign_id'
          });
        
        if (manualStatsUpdateError) {
          console.error("Error updating manual stats:", manualStatsUpdateError);
        }
      } else {
        console.log("Skipping manual stats update as the new date is older:", dateString);
      }
      
      // Refresh data
      await fetchCampaigns();
      
      // Close dialog
      onClose();
    } catch (error) {
      console.error("Error submitting stats:", error);
      toast.error("Error saving stats: " + (error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return { submitStats, isSubmitting };
};
