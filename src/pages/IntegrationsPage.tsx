import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import GoogleAdsIntegration from "@/components/integrations/GoogleAdsIntegration";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Info, ExternalLink } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { handleOAuthCallback, isGoogleAuthValid } from "@/services/googleAdsService";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useCampaign } from "@/contexts/CampaignContext";

// Don't use hardcoded placeholder, get from env or leave empty
const GOOGLE_CLIENT_ID = ""; // Will be set in the Supabase edge function

const IntegrationsPage = () => {
  const [activeTab, setActiveTab] = useState<string>("google-ads");
  const [isProcessingOAuth, setIsProcessingOAuth] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [networkError, setNetworkError] = useState<boolean>(false);
  const [authStatus, setAuthStatus] = useState<'checking' | 'authenticated' | 'unauthenticated'>('checking');
  
  const { user, isLoading } = useAuth();
  const campaignContext = useCampaign();
  const fetchGoogleAdsAccounts = campaignContext?.fetchGoogleAdsAccounts;
  const navigate = useNavigate();
  const callbackProcessed = useRef(false);
  
  const PROJECT_URL = "https://app.tortshark.com";
  
  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/auth");
    } else if (user) {
      setAuthStatus('authenticated');
    } else {
      setAuthStatus('unauthenticated');
    }
  }, [user, isLoading, navigate]);
  
  // Check for Google Auth status when the component loads
  useEffect(() => {
    const checkGoogleAuthStatus = async () => {
      if (user) {
        try {
          const isValid = await isGoogleAuthValid();
          console.log("Google Auth status:", isValid ? "valid" : "invalid");
          
          if (!isValid) {
            // Clear any stale auth data
            localStorage.removeItem("googleAds_access_token");
            localStorage.removeItem("googleAds_refresh_token");
            localStorage.removeItem("googleAds_token_expiry");
          }
        } catch (error) {
          console.error("Error checking Google Auth status:", error);
        }
      }
    };
    
    checkGoogleAuthStatus();
  }, [user]);
  
  useEffect(() => {
    const processOAuthCallback = async () => {
      // Check if we have code parameter in URL and haven't processed it yet
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');
      
      if (!code || callbackProcessed.current) {
        return;
      }

      console.log("OAuth callback detected, starting processing...");
      callbackProcessed.current = true;
      setIsProcessingOAuth(true);
      setAuthError(null);
      
      try {
        if (!user) {
          throw new Error("You must be logged in to connect Google Ads");
        }
        
        // Clean URL before processing
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
        
        const success = await handleOAuthCallback(code);
        
        if (success) {
          toast.success("Successfully connected to Google Ads");
          
          if (fetchGoogleAdsAccounts) {
            try {
              console.log("Fetching Google Ads accounts");
              const accounts = await fetchGoogleAdsAccounts();
              
              if (accounts.length > 0) {
                toast.success(`Found ${accounts.length} Google Ads accounts`);
              } else {
                toast.info("No Google Ads accounts found");
              }
            } catch (accountsError) {
              console.error("Error fetching accounts:", accountsError);
              toast.error("Connected to Google but failed to fetch accounts");
            }
          }
        } else {
          setAuthError("Failed to process authentication. Please try again.");
        }
      } catch (error) {
        console.error("Error processing OAuth callback:", error);
        setAuthError(error instanceof Error ? error.message : "Unknown error occurred");
        toast.error("Failed to connect to Google Ads");
      } finally {
        setIsProcessingOAuth(false);
      }
    };

    if (user) {
      processOAuthCallback();
    }
  }, [user, fetchGoogleAdsAccounts]);
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mr-2"></div>
        <span>Loading...</span>
      </div>
    );
  }
  
  if (!user) {
    return null;
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground mt-2">
          Connect external platforms and services to enhance your campaigns
        </p>
      </div>
      
      {isProcessingOAuth && (
        <Alert className="bg-blue-50 border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-500" />
          <AlertDescription className="text-blue-800">
            Processing authentication callback...
          </AlertDescription>
        </Alert>
      )}
      
      {authError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Authentication Error</AlertTitle>
          <AlertDescription>{authError}</AlertDescription>
          {networkError && (
            <div className="mt-4 p-3 bg-destructive/10 rounded text-sm">
              <p className="font-medium mb-2">Troubleshooting steps:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Check your internet connection</li>
                <li>Ensure your browser isn't blocking third-party cookies</li>
                <li>Try using a different browser</li>
                <li>Check if any browser extensions might be blocking the connection</li>
                <li>Verify that accounts.google.com is not blocked by your network/firewall</li>
              </ul>
            </div>
          )}
          {debugInfo && (
            <div className="mt-2 text-xs overflow-auto max-h-32 bg-destructive/10 p-2 rounded">
              <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
            </div>
          )}
        </Alert>
      )}
      
      <Alert className="bg-amber-50 border-amber-200">
        <Info className="h-4 w-4 text-amber-500" />
        <AlertDescription className="text-amber-800">
          <p className="mb-2">When setting up the Google Cloud OAuth client, make sure to use:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Client ID:</strong>
              <code className="mx-1 px-1 bg-amber-100 rounded">{GOOGLE_CLIENT_ID}</code>
            </li>
            <li>
              <strong>Authorized JavaScript origins:</strong>
              <code className="mx-1 px-1 bg-amber-100 rounded">{PROJECT_URL}</code>
            </li>
            <li>
              <strong>Authorized redirect URI:</strong>
              <code className="mx-1 px-1 bg-amber-100 rounded">{PROJECT_URL}/integrations</code>
            </li>
          </ul>
          <Button 
            variant="link" 
            className="text-amber-700 p-0 mt-2 h-auto" 
            onClick={() => window.open("https://console.cloud.google.com/apis/credentials", "_blank")}
          >
            Open Google Cloud Console <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        </AlertDescription>
      </Alert>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full mb-6">
          <TabsTrigger value="google-ads" className="flex-1">Google Ads</TabsTrigger>
          <TabsTrigger value="facebook" className="flex-1" disabled>Facebook Ads</TabsTrigger>
          <TabsTrigger value="analytics" className="flex-1" disabled>Analytics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="google-ads">
          <GoogleAdsIntegration />
        </TabsContent>
        
        <TabsContent value="facebook">
          <div className="text-center py-12 text-muted-foreground">
            Facebook Ads integration coming soon
          </div>
        </TabsContent>
        
        <TabsContent value="analytics">
          <div className="text-center py-12 text-muted-foreground">
            Analytics integration coming soon
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default IntegrationsPage;
