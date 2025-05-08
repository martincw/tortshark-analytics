
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InfoIcon, Key, Mail, User, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";

const AuthPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    // Clear any stale error state
    setError(null);
    
    // Check if already signed in
    const checkAuth = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("Session check error:", sessionError);
          // Don't set error for typical auth flow errors
          if (!sessionError.message.includes("Invalid Refresh Token") && !sessionError.message.includes("not found")) {
            setError(sessionError.message);
          }
          return;
        }
        
        if (session) {
          // Already signed in, redirect to home
          navigate("/");
        }
      } catch (err) {
        console.error("Auth check error:", err);
      }
    };
    
    checkAuth();
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate("/");
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!email || !password) {
      toast.error("Please enter both email and password");
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        console.error("Login error:", error);
        setError(error.message);
        toast.error(error.message || "Failed to sign in");
        return;
      }
      
      if (data.session) {
        toast.success("Signed in successfully");
        navigate("/");
      }
    } catch (error: any) {
      console.error("Login error:", error);
      setError(error.message || "An unexpected error occurred");
      toast.error("An unexpected error occurred during login");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!email || !password) {
      toast.error("Please enter both email and password");
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name || email.split("@")[0]
          }
        }
      });
      
      if (error) {
        console.error("Registration error:", error);
        setError(error.message);
        toast.error(error.message || "Failed to register");
        return;
      }
      
      if (data.user) {
        toast.success("Registration successful! Please check your email for verification.");
        // Switch to login tab after successful registration
        setActiveTab("login");
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      setError(error.message || "An unexpected error occurred");
      toast.error("An unexpected error occurred during registration");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleTabChange = (value: string) => {
    setActiveTab(value as "login" | "register");
    // Clear error when switching tabs
    setError(null);
  };
  
  const tryAgainWithCacheClear = () => {
    // Clear local storage and session storage
    try {
      localStorage.clear();
      sessionStorage.clear();
      
      // Reload the page
      window.location.reload();
      toast.success("Cache cleared, trying again...");
    } catch (error) {
      console.error("Error clearing cache:", error);
      toast.error("Failed to clear cache. Try manually clearing your browser data.");
    }
  };
  
  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-muted/30">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">TortShark</h1>
          <p className="text-muted-foreground">Mass Tort Campaign Management</p>
        </div>
        
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="space-y-2">
              <p>Authentication error: {error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={tryAgainWithCacheClear}
                className="mt-2"
              >
                Clear Cache & Try Again
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
        <Card>
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin}>
                <CardHeader>
                  <CardTitle>Welcome Back</CardTitle>
                  <CardDescription>
                    Sign in to your TortShark account
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        placeholder="you@example.com"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Signing In..." : "Sign In"}
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>
            
            <TabsContent value="register">
              <form onSubmit={handleRegister}>
                <CardHeader>
                  <CardTitle>Create Account</CardTitle>
                  <CardDescription>
                    Sign up for a new TortShark account
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-name">Name (Optional)</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="register-name"
                        placeholder="Your Name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="register-email"
                        placeholder="you@example.com"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Password</Label>
                    <div className="relative">
                      <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="register-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex-col space-y-4">
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Creating Account..." : "Create Account"}
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
        
        <Alert variant="default" className="bg-primary/5 border border-primary/20">
          <InfoIcon className="h-4 w-4 text-primary" />
          <AlertDescription>
            For faster development, you may want to disable email verification in the Supabase dashboard.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
};

export default AuthPage;
