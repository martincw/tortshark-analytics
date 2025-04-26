
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
    
    try {
      await initiateGoogleAuth();
    } catch (error) {
      console.error("Error initiating Google Auth:", error);
      setAuthError(error.message || "Failed to initiate Google authentication");
      toast.error("Failed to initiate Google authentication");
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
        
        {authError && (
          <div className="p-3 mb-4 bg-destructive/10 text-destructive rounded-md text-sm">
            <p className="font-medium">Authentication error:</p>
            <p>{authError}</p>
          </div>
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
