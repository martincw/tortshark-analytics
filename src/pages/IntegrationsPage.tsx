
import React, { useEffect, useState, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GoogleAdsIntegration from "@/components/integrations/GoogleAdsIntegration";
import Hyros from "@/components/integrations/Hyros";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { handleOAuthCallback } from "@/services/googleAdsService";
import { toast } from "sonner";

export default function IntegrationsPage() {
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [isProcessingCallback, setIsProcessingCallback] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoading } = useAuth();
  const isNavigatingRef = useRef(false);
  const callbackProcessedRef = useRef(false);
  
  // Handle OAuth callback from Google
  useEffect(() => {
    const processOAuthCallback = async () => {
      if (callbackProcessedRef.current) return;
      
      const searchParams = new URLSearchParams(location.search);
      const code = searchParams.get('code');
      const error = searchParams.get('error');
      
      if (error) {
        console.error("OAuth error:", error);
        toast.error(`Google authentication failed: ${error}`);
        // Clean up URL
        navigate('/integrations?integration=google', { replace: true });
        return;
      }
      
      if (code) {
        callbackProcessedRef.current = true;
        setIsProcessingCallback(true);
        console.log("Processing OAuth callback with code");
        
        try {
          const success = await handleOAuthCallback(code);
          
          if (success) {
            toast.success("Successfully connected to Google Ads!");
            // Force tab to google and clean up URL
            setActiveTab('google');
          } else {
            toast.error("Failed to connect to Google Ads");
          }
        } catch (err) {
          console.error("OAuth callback error:", err);
          toast.error("Failed to process Google authentication");
        } finally {
          setIsProcessingCallback(false);
          // Clean up URL by removing code parameter
          navigate('/integrations?integration=google', { replace: true });
        }
      }
    };
    
    if (!isLoading) {
      processOAuthCallback();
    }
  }, [location.search, navigate, isLoading]);
  
  // Parse URL params on initial load and tab changes
  useEffect(() => {
    if (isLoading || isProcessingCallback) return;
    if (isNavigatingRef.current) return;
    
    const searchParams = new URLSearchParams(location.search);
    const integrationParam = searchParams.get('integration');
    
    // Don't process if there's a code (OAuth callback in progress)
    if (searchParams.get('code')) return;
    
    if (integrationParam && ['hyros', 'google'].includes(integrationParam.toLowerCase())) {
      if (activeTab !== integrationParam.toLowerCase()) {
        setActiveTab(integrationParam.toLowerCase());
      }
    } else if (!activeTab) {
      isNavigatingRef.current = true;
      setActiveTab('hyros');
      
      const newParams = new URLSearchParams(location.search);
      newParams.set('integration', 'hyros');
      navigate(`${location.pathname}?${newParams.toString()}`, { replace: true });
      
      setTimeout(() => {
        isNavigatingRef.current = false;
      }, 100);
    }
  }, [location.search, navigate, isLoading, activeTab, isProcessingCallback]);
  
  const handleTabChange = (value: string) => {
    if (value === activeTab || isNavigatingRef.current) return;
    
    isNavigatingRef.current = true;
    setActiveTab(value);
    
    const searchParams = new URLSearchParams(location.search);
    searchParams.set('integration', value);
    navigate(`${location.pathname}?${searchParams.toString()}`, { replace: true });
    
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 100);
  };
  
  // Show loading during callback processing
  if (isProcessingCallback) {
    return (
      <div className="container mx-auto py-6 space-y-8 max-w-5xl">
        <header>
          <h1 className="text-3xl font-bold">Integrations</h1>
          <p className="text-muted-foreground">Connecting to Google Ads...</p>
        </header>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mr-3"></div>
          <span className="text-lg">Processing authentication...</span>
        </div>
      </div>
    );
  }
  
  if (!activeTab) {
    return (
      <div className="container mx-auto py-6 space-y-8 max-w-5xl">
        <header>
          <h1 className="text-3xl font-bold">Integrations</h1>
          <p className="text-muted-foreground">Loading...</p>
        </header>
        <div className="animate-pulse h-8 w-64 bg-muted rounded"></div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6 space-y-8 max-w-5xl">
      <header>
        <h1 className="text-3xl font-bold">Integrations</h1>
        <p className="text-muted-foreground">Connect your external platforms</p>
      </header>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="hyros">HYROS</TabsTrigger>
          <TabsTrigger value="google">Google Ads</TabsTrigger>
        </TabsList>
        <TabsContent value="hyros">
          <Hyros />
        </TabsContent>
        <TabsContent value="google">
          <GoogleAdsIntegration />
        </TabsContent>
      </Tabs>
    </div>
  );
}
