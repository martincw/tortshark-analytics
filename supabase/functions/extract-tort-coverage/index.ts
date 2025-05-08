
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Set up CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Handle CORS preflight requests
const handleCors = (req: Request): Response | null => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  return null;
};

// Extract phone numbers from text
const extractPhoneNumbers = (text: string): string[] => {
  // This regex matches various phone number formats
  const phoneRegex = /\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})/g;
  const matches = [...text.matchAll(phoneRegex)];
  
  return matches.map((match) => {
    // Format consistently as (XXX) XXX-XXXX
    const areaCode = match[1];
    const prefix = match[2];
    const lineNumber = match[3];
    return `(${areaCode}) ${prefix}-${lineNumber}`;
  });
};

// Extract URLs from text
const extractUrls = (text: string): string[] => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = [...text.matchAll(urlRegex)];
  return matches.map(m => m[0]);
};

// Extract monetary values from text
const extractMoneyValues = (text: string): number[] => {
  // Look for dollar amounts, with or without commas, with or without cents
  const moneyRegex = /\$\s?([0-9,]+(\.[0-9]{2})?)/g;
  const matches = [...text.matchAll(moneyRegex)];
  return matches.map(m => parseFloat(m[1].replace(/,/g, '')));
};

// Extract campaign keys (usually alphanumeric codes)
const extractCampaignKeys = (text: string): string[] => {
  // Look for potential campaign keys (capital letters + numbers)
  const keyRegex = /([A-Z]{2,}[0-9]{1,}|[A-Z]{2,}-[0-9]{1,})/g;
  const matches = [...text.matchAll(keyRegex)];
  return matches.map(m => m[0]);
};

// Extract intake center names (common patterns)
const extractIntakeCenters = (text: string): string[] => {
  const lowerText = text.toLowerCase();
  const centers = [];
  
  // Common intake center indicators
  const indicators = [
    "intake center", "call center", "transfer to", "route to",
    "legal intake", "processing center", "qualification center"
  ];
  
  for (const indicator of indicators) {
    if (lowerText.includes(indicator)) {
      // Look for a name near the indicator (simplistic approach)
      const position = lowerText.indexOf(indicator);
      const surroundingText = text.substring(
        Math.max(0, position - 30), 
        Math.min(text.length, position + 30)
      );
      
      // Extract potential center name - look for capitalized words
      const centerMatch = surroundingText.match(/([A-Z][a-z]+ )+/);
      if (centerMatch && !centers.includes(centerMatch[0].trim())) {
        centers.push(centerMatch[0].trim());
      }
    }
  }
  
  return centers;
};

// Main parser function
const parseTortCoverageData = (
  text: string, 
  campaignId: string, 
  campaignName: string
): Record<string, any> => {
  const phoneNumbers = extractPhoneNumbers(text);
  const urls = extractUrls(text);
  const moneyValues = extractMoneyValues(text);
  const campaignKeys = extractCampaignKeys(text);
  const centers = extractIntakeCenters(text);
  
  // Start building the parsed data
  const parsed: Record<string, any> = {};
  
  // Get payout amount (usually the largest money value, or first one)
  if (moneyValues.length > 0) {
    // Sort descending and take largest value for payout
    parsed.amount = Math.max(...moneyValues);
  }
  
  // Try to identify inbound and transfer DIDs
  if (phoneNumbers.length >= 2) {
    // Logic: First is often inbound, second is transfer
    parsed.inboundDid = phoneNumbers[0];
    parsed.transferDid = phoneNumbers[1];
  } else if (phoneNumbers.length === 1) {
    // If only one phone, use it as inbound
    parsed.inboundDid = phoneNumbers[0];
  }
  
  // Set campaign URL if found
  if (urls.length > 0) {
    for (const url of urls) {
      if (url.includes('sheet') || url.includes('doc') || url.includes('drive')) {
        parsed.specSheetUrl = url;
      } else {
        parsed.campaignUrl = url;
      }
    }
  }
  
  // Set campaign key if found
  if (campaignKeys.length > 0) {
    parsed.campaignKey = campaignKeys[0];
  }
  
  // Set intake center if found
  if (centers.length > 0) {
    parsed.intakeCenter = centers[0];
  }
  
  // Set campaign ID and suggested label
  parsed.campaignId = campaignId;
  
  // Extract notes - look for sections that might be relevant instructions
  const noteIndicators = [
    "please note", "important", "instructions", "requirements",
    "qualification", "criteria", "notes"
  ];
  
  const lowerText = text.toLowerCase();
  for (const indicator of noteIndicators) {
    if (lowerText.includes(indicator)) {
      const position = lowerText.indexOf(indicator);
      const endPosition = lowerText.indexOf("\n\n", position);
      const noteText = text.substring(
        position,
        endPosition > position ? endPosition : position + 100
      );
      
      if (noteText.length > 10) {
        parsed.notes = (parsed.notes ? parsed.notes + "\n" : "") + noteText.trim();
      }
    }
  }
  
  return parsed;
};

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // Parse request body
  try {
    const { campaignText, selectedCampaignId, selectedCampaignName } = await req.json();
    
    if (!campaignText) {
      return new Response(
        JSON.stringify({ success: false, error: "No campaign text provided" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!selectedCampaignId) {
      return new Response(
        JSON.stringify({ success: false, error: "No campaign ID provided" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Parse the campaign text to extract relevant tort coverage data
    const extractedData = parseTortCoverageData(
      campaignText, 
      selectedCampaignId,
      selectedCampaignName || "Unknown Campaign"
    );
    
    // Return the extracted data
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: extractedData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
