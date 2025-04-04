
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { handleGoogleAuthCallback, storeAuthTokens } from "@/services/googleAdsService";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

const GoogleAuthCallback = () => {
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const processAuth = async () => {
      try {
        const queryParams = new URLSearchParams(location.search);
        const code = queryParams.get("code");
        const errorMsg = queryParams.get("error");
        
        if (errorMsg) {
          setError(`Google returned an error: ${errorMsg}`);
          setIsProcessing(false);
          return;
        }
        
        if (!code) {
          setError("Authorization code not found");
          setIsProcessing(false);
          return;
        }

        // Exchange code for tokens
        const tokens = await handleGoogleAuthCallback(code);
        
        if (!tokens) {
          setError("Failed to authenticate with Google");
          setIsProcessing(false);
          return;
        }

        // Store tokens securely
        storeAuthTokens(tokens);
        
        toast.success("Successfully connected to Google Ads");
        navigate("/accounts");
      } catch (error) {
        console.error("Error during auth callback:", error);
        const errorMessage = error instanceof Error 
          ? error.message 
          : "Authentication failed";
          
        setError(errorMessage);
        setIsProcessing(false);
      }
    };

    processAuth();
  }, [location.search, navigate]);

  const handleContinue = () => {
    if (error) {
      toast.error("Failed to connect Google Ads, but you can still create campaigns manually");
    }
    navigate("/accounts");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      {isProcessing ? (
        <>
          <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <h1 className="text-2xl font-bold">Processing Google Authentication</h1>
          <p className="text-muted-foreground mt-2">Please wait while we connect your account...</p>
        </>
      ) : error ? (
        <div className="w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg space-y-4">
          <div className="flex items-center gap-2 text-error-DEFAULT">
            <AlertCircle className="h-6 w-6" />
            <h1 className="text-xl font-semibold">Authentication Error</h1>
          </div>
          <p className="text-muted-foreground">{error}</p>
          <p className="text-sm">
            {error.includes("not configured") 
              ? "Please make sure you've set up the VITE_GOOGLE_CLIENT_ID environment variable." 
              : "This error commonly occurs when the Google API client configuration is incorrect or missing permissions."}
          </p>
          <div className="pt-4">
            <Button onClick={handleContinue} className="w-full">
              Continue to Accounts Page
            </Button>
            <p className="text-center mt-4 text-sm text-muted-foreground">
              You can still create and manage campaigns manually
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default GoogleAuthCallback;
