
import React, { useState, useEffect } from "react";
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
  listGoogleAdsAccounts // Changed from fetchGoogleAdsAccounts to listGoogleAdsAccounts
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
  const { fetchGoogleAdsAccounts } = useCampaign();

  // Check if user is logged in with Supabase
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
    };
  }, []);

  // Check for OAuth callback on component mount
  useEffect(() => {
    const checkForCallback = async () => {
      // Check if this is a callback from Google OAuth
      if (window.location.search.includes('code=')) {
        setIsSigningIn(true);
        
        try {
          const success = await handleOAuthCallback();
          
          if (success) {
            const credentials = await getGoogleAdsCredentials();
            if (credentials) {
              toast.success("Successfully signed in with Google");
              
              // After successful sign-in, import Google Ads accounts
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
            }
          } else {
            toast.error("Failed to complete Google authentication");
          }
        } catch (error) {
          console.error("Error handling OAuth callback:", error);
          toast.error("Failed to complete Google authentication");
        } finally {
          setIsSigningIn(false);
        }
      }
    };
    
    checkForCallback();
  }, [onSuccess, fetchGoogleAdsAccounts]);

  // Check for existing auth on component mount
  useEffect(() => {
    const checkExistingAuth = async () => {
      try {
        if (await isGoogleAuthValid()) {
          const credentials = await getGoogleAdsCredentials();
          if (credentials) {
            toast.success("Already signed in with Google");
            onSuccess({
              customerId: credentials.customerId,
              developerToken: credentials.developerToken
            });
          }
        }
      } catch (error) {
        console.error("Error checking existing auth:", error);
      }
    };
    
    checkExistingAuth();
  }, [onSuccess]);

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    
    try {
      // Initiate Google OAuth flow - this will redirect the page
      await initiateGoogleAuth();
    } catch (error) {
      toast.error("Failed to sign in with Google");
      console.error("Google Sign-In error:", error);
      setIsSigningIn(false);
    }
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
        
        <Button 
          onClick={handleGoogleSignIn}
          disabled={isSigningIn || isConnecting}
          className="w-full"
          variant="outline"
        >
          <Google className="mr-2 h-4 w-4" />
          {isSigningIn ? "Signing in..." : "Sign in with Google"}
        </Button>
        
        {(isConnecting || isSigningIn) && (
          <div>
            <Progress value={isSigningIn ? 50 : connectionProgress} className="h-2" />
            <p className="text-xs text-center mt-2 text-muted-foreground">
              {isSigningIn ? "Authenticating with Google..." : "Connecting to Google Ads..."}
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
