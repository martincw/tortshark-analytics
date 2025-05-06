
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { campaignText, selectedCampaignId, selectedCampaignName } = await req.json();
    
    if (!campaignText || typeof campaignText !== 'string') {
      throw new Error('Campaign text is required and must be a string');
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key is not configured');
    }

    // Prepare context with selected campaign information
    let systemPrompt = `Extract tort coverage information from the provided text.`;
    
    // Add campaign context if available
    if (selectedCampaignId) {
      systemPrompt += `\nThe text is about Campaign ID: ${selectedCampaignId}`;
      if (selectedCampaignName) {
        systemPrompt += ` (${selectedCampaignName})`;
      }
    }
    
    systemPrompt += `\nReturn a JSON object with these fields:
    - campaignId (string, required): The ID of the campaign
    - campaignName (string, optional): The name of the campaign
    - amount (number, required): Payout amount per case
    - inboundDid (string, optional): Inbound DID number
    - transferDid (string, optional): Transfer DID number
    - intakeCenter (string, optional): Intake center name
    - campaignKey (string, optional): Campaign key
    - notes (string, optional): Any notes about the tort
    - specSheetUrl (string, optional): URL to spec sheet
    - campaignUrl (string, optional): URL for the campaign
    - label (string, optional): Label for distinguishing multiple entries

    Return null for fields that cannot be determined from the text.
    Ensure the JSON object is properly formatted and includes all fields.`;

    // Call OpenAI API to extract structured information
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: campaignText
          }
        ],
        temperature: 0.1
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to extract information from OpenAI');
    }

    let extractedData;
    try {
      const content = data.choices[0].message.content;
      // Try to parse the response as JSON directly
      extractedData = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      // If direct parsing fails, try to extract JSON from the content
      const jsonMatch = data.choices[0].message.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          extractedData = JSON.parse(jsonMatch[0]);
        } catch (e) {
          throw new Error('Failed to parse structured data from OpenAI response');
        }
      } else {
        throw new Error('No JSON data found in OpenAI response');
      }
    }

    // If a campaign was selected, make sure the extracted data uses that ID
    if (selectedCampaignId && !extractedData.campaignId) {
      extractedData.campaignId = selectedCampaignId;
    }
    
    if (selectedCampaignName && !extractedData.campaignName) {
      extractedData.campaignName = selectedCampaignName;
    }

    console.log('Extracted data:', extractedData);

    return new Response(JSON.stringify({
      success: true,
      data: extractedData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in extract-tort-coverage function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
