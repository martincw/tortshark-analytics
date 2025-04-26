
import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import Google from "./Google";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  initiateGoogleAuth, 
  handleOAuthCallback,
  getGoogleAdsCredentials
} from "@/services/googleAdsService";
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
  const [requestState, setRequestState] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  
  useEffect(() => {
    const checkLoginStatus = async () => {
      const { data } = await supabase.auth.getSession();
      setIsLoggedIn(!!data.session);
    };
    
    checkLoginStatus();
  }, []);

  const handleGoogleSignIn = async () => {
    if (!isLoggedIn) {
      toast.error("Please sign in to your account first");
      return;
    }
    
    setIsSigningIn(true);
    setAuthError(null);
    setRequestState('pending');
    
    // Set a timeout to prevent endless loading
    const timeoutId = setTimeout(() => {
      if (requestState === 'pending') {
        setRequestState('error');
        setAuthError("Connection request timed out. Please try again.");
        setIsSigningIn(false);
        toast.error("Connection request timed out");
      }
    }, 30000);
    
    try {
      console.log("Starting Google sign-in process");
      await initiateGoogleAuth();
      // We won't reach here typically because of the redirect
      setRequestState('success');
    } catch (error) {
      console.error("Error initiating Google Auth:", error);
      setAuthError(error.message || "Failed to initiate Google authentication");
      toast.error("Failed to initiate Google authentication");
      setRequestState('error');
      setIsSigningIn(false);
      clearTimeout(timeoutId);
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
            <AlertDescription className="space-y-2">
              <p className="font-medium">Authentication error:</p>
              <p>{authError}</p>
              <div className="text-xs mt-2">
                <p>Troubleshooting steps:</p>
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li>Ensure you're logged in to your Supabase account</li>
                  <li>Check that your Google Cloud OAuth client is properly configured</li>
                  <li>Verify that your browser isn't blocking third-party cookies</li>
                  <li>Disable any ad-blockers or privacy extensions</li>
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
          {isSigningIn ? "Signing in..." : "Sign in with Google"}
        </Button>
        
        {!isLoggedIn && (
          <p className="text-xs text-center mt-2 text-amber-600">
            Please sign in to your account first before connecting Google Ads
          </p>
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
