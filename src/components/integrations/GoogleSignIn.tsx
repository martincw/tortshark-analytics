
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
  listGoogleAdsAccounts
} from "@/services/googleAdsService";
import { supabase } from "@/integrations/supabase/client";
import { useCampaign } from "@/contexts/CampaignContext";
import { useGoogleLogin } from '@react-oauth/google';
import { gapi } from 'gapi-script';

interface GoogleSignInProps {
  onSuccess: (credentials: { customerId: string; developerToken: string }) => void;
  isConnecting: boolean;
  connectionProgress: number;
}

// Google client ID - should match what's in your Google Cloud Console
const GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID"; // This should be replaced with your actual client ID

const GoogleSignIn: React.FC<GoogleSignInProps> = ({ 
  onSuccess, 
  isConnecting,
  connectionProgress 
}) => {
  const isMobile = useIsMobile();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { fetchGoogleAdsAccounts } = useCampaign();

  // Initialize Google API client
  useEffect(() => {
    const initGoogleAPI = async () => {
      try {
        gapi.load('client:auth2', () => {
          console.log('Google API client loaded');
        });
      } catch (error) {
        console.error('Error initializing Google API client', error);
      }
    };
    
    initGoogleAPI();
  }, []);

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

  // Configure Google login with scope for Google Ads
  const googleLogin = useGoogleLogin({
    onSuccess: async (response) => {
      setIsSigningIn(true);
      
      try {
        console.log('Google login successful', response);
        
        // Store the access token temporarily
        localStorage.setItem("googleAds_access_token", response.access_token);
        
        // Now we'll use our existing logic to process this token
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
      } catch (error) {
        console.error("Google Sign-In error:", error);
        toast.error("Failed to complete Google authentication");
      } finally {
        setIsSigningIn(false);
      }
    },
    onError: (error) => {
      console.error("Google Sign-In error:", error);
      toast.error("Failed to sign in with Google");
    },
    scope: 'https://www.googleapis.com/auth/adwords',
    flow: 'implicit'
  });

  const handleGoogleSignIn = () => {
    // Use the React OAuth Google login 
    googleLogin();
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
