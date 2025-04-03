
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { handleGoogleAuthCallback, storeAuthTokens } from "@/services/googleAdsService";
import { toast } from "sonner";

const GoogleAuthCallback = () => {
  const [isProcessing, setIsProcessing] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const processAuth = async () => {
      try {
        const queryParams = new URLSearchParams(location.search);
        const code = queryParams.get("code");
        
        if (!code) {
          toast.error("Authorization code not found");
          navigate("/accounts");
          return;
        }

        // Exchange code for tokens
        const tokens = await handleGoogleAuthCallback(code);
        
        if (!tokens) {
          toast.error("Failed to authenticate with Google");
          navigate("/accounts");
          return;
        }

        // Store tokens securely
        storeAuthTokens(tokens);
        
        toast.success("Successfully connected to Google Ads");
        navigate("/accounts");
      } catch (error) {
        console.error("Error during auth callback:", error);
        toast.error("Authentication failed");
        navigate("/accounts");
      } finally {
        setIsProcessing(false);
      }
    };

    processAuth();
  }, [location.search, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      {isProcessing && (
        <>
          <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <h1 className="text-2xl font-bold">Processing Google Authentication</h1>
          <p className="text-muted-foreground mt-2">Please wait while we connect your account...</p>
        </>
      )}
    </div>
  );
};

export default GoogleAuthCallback;
