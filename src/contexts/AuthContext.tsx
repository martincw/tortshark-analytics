
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import { toast } from "sonner";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean; // New clear boolean to check auth state
  signOut: () => Promise<void>;
  authError: string | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    console.log("Setting up auth state listener");
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        console.log("Auth state changed:", event, newSession ? "Session found" : "No session");
        
        if (event === 'TOKEN_REFRESHED') {
          console.log("Token refreshed successfully");
        } else if (event === 'SIGNED_OUT') {
          console.log("User signed out");
          setIsAuthenticated(false);
        } else if (event === 'SIGNED_IN' && newSession) {
          console.log("User signed in");
          setIsAuthenticated(true);
        } else if (event === 'USER_UPDATED' && newSession) {
          console.log("User updated");
          setIsAuthenticated(true);
        }
        
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        // Clear auth error when session state changes
        setAuthError(null);
      }
    );

    // THEN check for existing session
    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        console.log("Initial session check complete", initialSession ? "Session found" : "No session");
        
        if (error) {
          console.error("Session retrieval error:", error);
          setAuthError(error.message);
          setIsAuthenticated(false);
          
          // Clear corrupted session data
          if (error.message.includes("Invalid Refresh Token") || 
              error.message.includes("not found") ||
              error.message.includes("Failed to fetch")) {
            console.log("Clearing corrupted session data");
            await supabase.auth.signOut();
          } else {
            toast.error(`Authentication error: ${error.message}`);
          }
        } else {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
          setIsAuthenticated(!!initialSession);
        }
      } catch (error: any) {
        console.error("Unexpected error during session check:", error);
        setAuthError(error.message);
        setIsAuthenticated(false);
        
        // Clear session on network/fetch failures to prevent infinite retry loop
        if (error.message?.includes("Failed to fetch") || error.message?.includes("fetch")) {
          console.log("Network error - clearing potentially corrupted session");
          try {
            await supabase.auth.signOut();
          } catch (e) {
            // Ignore sign out errors during cleanup
            console.log("Cleanup signout failed, clearing local storage");
            localStorage.removeItem('sb-msgqsgftjwpbnqenhfmc-auth-token');
          }
        }
      } finally {
        // Always end loading state
        setIsLoading(false);
      }
    };
    
    initializeAuth();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Function to handle token refresh errors and retry
  const refreshSession = async () => {
    try {
      console.log("Attempting to refresh session");
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error("Failed to refresh session:", error);
        setIsAuthenticated(false);
        return false;
      }
      
      setIsAuthenticated(!!data.session);
      return !!data.session;
    } catch (error) {
      console.error("Error refreshing session:", error);
      setIsAuthenticated(false);
      return false;
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      await supabase.auth.signOut();
      // Clear any cached API keys
      if (window.localStorage) {
        localStorage.removeItem('lp_api_key');
      }
      setIsAuthenticated(false);
      toast.success("Signed out successfully");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to sign out properly. Try clearing your browser cache.");
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    session,
    user,
    isLoading,
    isAuthenticated,
    signOut,
    authError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
