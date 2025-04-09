
import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import Google from "./Google";
import { useIsMobile } from "@/hooks/use-mobile";
import { initiateGoogleAuth, getGoogleAdsCredentials, isGoogleAuthValid } from "@/services/googleAdsService";

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

  // Check for existing auth on component mount
  useEffect(() => {
    if (isGoogleAuthValid()) {
      const credentials = getGoogleAdsCredentials();
      if (credentials) {
        toast.success("Already signed in with Google");
        onSuccess({
          customerId: credentials.customerId,
          developerToken: credentials.developerToken
        });
      }
    }
  }, [onSuccess]);

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    
    try {
      // Initiate Google OAuth flow
      initiateGoogleAuth();
      
      // Check for credentials periodically (simulating OAuth callback)
      const checkInterval = setInterval(() => {
        const credentials = getGoogleAdsCredentials();
        if (credentials) {
          clearInterval(checkInterval);
          setIsSigningIn(false);
          
          toast.success("Successfully signed in with Google");
          onSuccess({
            customerId: credentials.customerId,
            developerToken: credentials.developerToken
          });
        }
      }, 1000);
      
      // Clear interval after 20 seconds to prevent infinite checking
      setTimeout(() => {
        clearInterval(checkInterval);
        if (isSigningIn) {
          setIsSigningIn(false);
          toast.error("Google sign-in timed out. Please try again.");
        }
      }, 20000);
      
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
          Connect your Google account to automatically retrieve your Google Ads credentials
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
