
import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import Google from "./Google";
import { useIsMobile } from "@/hooks/use-mobile";
import { initiateGoogleAdsConnection, processOAuthCallback, validateConnection } from "@/services/googleAdsConnection";
import { supabase } from "@/integrations/supabase/client";

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
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [retryAttempt, setRetryAttempt] = useState(0);
  
  useEffect(() => {
    const checkLoginStatus = async () => {
      const { data } = await supabase.auth.getSession();
      setIsLoggedIn(!!data.session);
      
      if (data.session) {
        // Validate existing connection
        const isValid = await validateConnection();
        console.log("Connection validation result:", isValid);
      }
    };
    
    checkLoginStatus();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    if (!isLoggedIn) {
      toast.error("Please sign in to your account first");
      return;
    }
    
    setIsSigningIn(true);
    setAuthError(null);
    
    try {
      console.log("Starting Google sign-in process", { attempt: retryAttempt + 1 });
      const { url } = await initiateGoogleAdsConnection();
      
      // Redirect to Google auth URL
      window.location.href = url;
    } catch (error) {
      console.error("Error initiating Google Auth:", error);
      setAuthError(error instanceof Error ? error.message : "Failed to initiate Google authentication");
      
      if (retryAttempt < 2) {
        toast.error("Connection failed, retrying...");
        setRetryAttempt(prev => prev + 1);
        setTimeout(() => handleGoogleSignIn(), 1000);
      } else {
        toast.error("Failed to connect to Google Ads");
        setIsSigningIn(false);
        setRetryAttempt(0);
      }
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
        
        {authError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {authError}
              <div className="text-xs mt-2">
                <p>Troubleshooting steps:</p>
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li>Sign in to your account first</li>
                  <li>Check your internet connection</li>
                  <li>Clear your browser cache</li>
                  <li>Try using a different browser</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}
        
        <Button 
          onClick={handleGoogleSignIn}
          disabled={isSigningIn || isConnecting || !isLoggedIn}
          className="w-full"
          variant="outline"
        >
          <Google className="mr-2 h-4 w-4" />
          {isSigningIn ? "Connecting..." : "Connect Google Ads"}
        </Button>
        
        {!isLoggedIn && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please sign in to your account first before connecting Google Ads
            </AlertDescription>
          </Alert>
        )}
        
        {(isConnecting || isSigningIn) && (
          <div>
            <Progress 
              value={isSigningIn ? 50 : connectionProgress} 
              className="h-2" 
            />
            <p className="text-xs text-center mt-2 text-muted-foreground">
              {isSigningIn ? "Redirecting to Google..." : "Connecting to Google Ads..."}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GoogleSignIn;
