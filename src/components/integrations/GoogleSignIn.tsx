
import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import Google from "./Google";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  initiateGoogleAuth, 
  handleOAuthCallback, 
  getGoogleAdsCredentials, 
  isGoogleAuthValid,
  listGoogleAdsAccounts
} from "@/services/googleAdsService";
import { supabase } from "@/integrations/supabase/client";
import { useCampaign } from "@/contexts/CampaignContext";

interface GoogleSignInProps {
  onSuccess: (credentials: { customerId: string; developerToken: string }) => void;
  isConnecting: boolean;
  connectionProgress: number;
}

const GoogleSignIn: React.FC<GoogleSignInProps> = ({ 
  onSuccess, 
  isConnecting,
  connectionProgress 
}) => {
  const isMobile = useIsMobile();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCheckingCredentials, setIsCheckingCredentials] = useState(true);
  const { fetchGoogleAdsAccounts } = useCampaign();
  const [authError, setAuthError] = useState<string | null>(null);
  const callbackProcessed = useRef(false);
  
  // Add timeout state for loading state
  const [loadingTimeout, setLoadingTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setIsLoggedIn(!!data.session);
      } catch (error) {
        console.error("Error checking login status:", error);
        setIsLoggedIn(false);
      }
    };
    
    checkLoginStatus();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session);
    });
    
    return () => {
      subscription.unsubscribe();
      // Clear any pending timeouts when component unmounts
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
    };
  }, []);

  useEffect(() => {
    const checkForCallback = async () => {
      // Check if URL contains code parameter and we haven't processed this callback yet
      if (window.location.search.includes('code=') && !callbackProcessed.current) {
        console.log("OAuth callback detected, processing...");
        callbackProcessed.current = true;
        setIsSigningIn(true);
        setAuthError(null);
        
        // Set a timeout to prevent endless loading
        const timeout = setTimeout(() => {
          setIsSigningIn(false);
          setAuthError("Connection timed out. Please try again.");
          toast.error("Connection timed out");
        }, 30000); // 30 seconds timeout
        
        setLoadingTimeout(timeout);
        
        try {
          // Clear URL parameters immediately to prevent reprocessing
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
          
          const success = await handleOAuthCallback();
          
          if (success) {
            const credentials = await getGoogleAdsCredentials();
            if (credentials) {
              toast.success("Successfully signed in with Google");
              
              try {
                await fetchGoogleAdsAccounts();
                toast.success("Google Ads accounts imported successfully");
              } catch (importError) {
                console.error("Error importing Google Ads accounts:", importError);
                toast.error("Failed to import Google Ads accounts");
              }
              
              onSuccess({
                customerId: credentials.customerId,
                developerToken: credentials.developerToken
              });
            } else {
              toast.error("Failed to get Google Ads credentials");
              setAuthError("Failed to retrieve Google Ads credentials. Please try connecting again.");
            }
          } else {
            toast.error("Failed to complete Google authentication");
            setAuthError("Authentication process completed but validation failed. Please try again.");
          }
        } catch (error) {
          console.error("Error handling OAuth callback:", error);
          setAuthError(error.message || "Failed to complete Google authentication");
          toast.error("Failed to complete Google authentication");
        } finally {
          if (loadingTimeout) clearTimeout(loadingTimeout);
          setIsSigningIn(false);
        }
      }
    };
    
    checkForCallback();
  }, [onSuccess, fetchGoogleAdsAccounts]);

  useEffect(() => {
    const checkExistingAuth = async () => {
      setIsCheckingCredentials(true);
      
      // Set a timeout to prevent endless loading
      const timeout = setTimeout(() => {
        setIsCheckingCredentials(false);
        console.log("Credentials check timed out");
      }, 10000); // 10 seconds timeout
      
      setLoadingTimeout(timeout);
      
      try {
        console.log("Checking if Google Auth is already valid...");
        if (await isGoogleAuthValid()) {
          console.log("Google Auth is valid, getting credentials...");
          const credentials = await getGoogleAdsCredentials();
          if (credentials) {
            console.log("Retrieved credentials successfully");
            toast.success("Already signed in with Google");
            onSuccess({
              customerId: credentials.customerId,
              developerToken: credentials.developerToken
            });
          } else {
            console.warn("isGoogleAuthValid() returned true but no credentials were found");
            setAuthError("Your Google connection appears valid but we couldn't retrieve your account details. Please try reconnecting.");
          }
        } else {
          console.log("Google Auth is not valid");
        }
      } catch (error) {
        console.error("Error checking existing auth:", error);
        setAuthError("Error checking your Google connection status. Please try reconnecting.");
      } finally {
        if (loadingTimeout) clearTimeout(loadingTimeout);
        setIsCheckingCredentials(false);
      }
    };
    
    if (isLoggedIn) {
      checkExistingAuth();
    } else {
      setIsCheckingCredentials(false);
    }
  }, [onSuccess, isLoggedIn]);

  const handleServerSideAuth = async () => {
    setIsSigningIn(true);
    setAuthError(null);
    
    const timeout = setTimeout(() => {
      setIsSigningIn(false);
      setAuthError("Connection timed out. Please try again.");
      toast.error("Connection timed out");
    }, 30000);
    
    setLoadingTimeout(timeout);
    
    try {
      console.log("Initiating Google Auth flow");
      const authResponse = await initiateGoogleAuth();
      
      if (authResponse && authResponse.url) {
        console.log("Redirecting to Google Auth URL:", authResponse.url);
        // Direct browser redirect to Google's auth page
        window.location.href = authResponse.url;
        return; // Important: return here as we're redirecting
      } else {
        throw new Error("Failed to get Google authentication URL");
      }
    } catch (error) {
      console.error("Error initiating Google Auth:", error);
      setAuthError(error.message || "Failed to initiate Google authentication");
      toast.error("Failed to initiate Google authentication");
      setIsSigningIn(false);
      
      if (loadingTimeout) clearTimeout(loadingTimeout);
    }
  };

  const handleGoogleSignIn = () => {
    if (!isLoggedIn) {
      toast.error("Please sign in to your account first");
      return;
    }
    
    handleServerSideAuth();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in with Google</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground mb-4">
          Connect your Google account to access your Google Ads data
        </p>
        
        {authError && (
          <div className="p-3 mb-4 bg-destructive/10 text-destructive rounded-md text-sm">
            <p className="font-medium">Authentication error:</p>
            <p>{authError}</p>
          </div>
        )}
        
        <Button 
          onClick={handleGoogleSignIn}
          disabled={isSigningIn || isConnecting || !isLoggedIn || isCheckingCredentials}
          className="w-full"
          variant="outline"
        >
          <Google className="mr-2 h-4 w-4" />
          {isCheckingCredentials ? "Checking connection..." : 
           isSigningIn ? "Signing in..." : "Sign in with Google"}
        </Button>
        
        {!isLoggedIn && (
          <p className="text-xs text-center mt-2 text-amber-600">
            Please sign in to your account first before connecting Google Ads
          </p>
        )}
        
        {(isConnecting || isSigningIn || isCheckingCredentials) && (
          <div>
            <Progress 
              value={
                isCheckingCredentials ? 20 : 
                isSigningIn ? 50 : connectionProgress
              } 
              className="h-2" 
            />
            <p className="text-xs text-center mt-2 text-muted-foreground">
              {isCheckingCredentials ? "Checking existing connection..." : 
               isSigningIn ? "Authenticating with Google..." : "Connecting to Google Ads..."}
            </p>
          </div>
        )}
        
        <div className="text-xs text-muted-foreground mt-2">
          By signing in, you'll authorize this app to access your Google Ads account information
        </div>
      </CardContent>
    </Card>
  );
};

export default GoogleSignIn;
