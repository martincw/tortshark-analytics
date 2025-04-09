
import React, { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import Google from "./Google";
import { useIsMobile } from "@/hooks/use-mobile";

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

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    
    try {
      // Simulate Google Sign-In process
      // In a real implementation, this would use the Google Identity Services SDK
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock successful sign-in with auto-filled credentials
      const mockCredentials = {
        customerId: "123-456-7890",
        developerToken: "Ngh3IukgQ3ovdkH3M0smUg"
      };
      
      toast.success("Successfully signed in with Google");
      onSuccess(mockCredentials);
    } catch (error) {
      toast.error("Failed to sign in with Google");
      console.error("Google Sign-In error:", error);
    } finally {
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
        
        {isConnecting && (
          <div>
            <Progress value={connectionProgress} className="h-2" />
            <p className="text-xs text-center mt-2 text-muted-foreground">
              Connecting to Google Ads...
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
