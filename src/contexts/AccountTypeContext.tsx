import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

export type AccountType = 'admin' | 'member' | 'contractor';

interface AccountTypeContextType {
  accountType: AccountType | null;
  isContractor: boolean;
  isLoading: boolean;
  refreshAccountType: () => Promise<void>;
}

const AccountTypeContext = createContext<AccountTypeContextType | undefined>(undefined);

export const AccountTypeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useAuth();
  const user = auth.user;
  const isAuthenticated = auth.isAuthenticated;

  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAccountType = async () => {
    if (!user || !isAuthenticated) {
      setAccountType(null);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('workspace_members')
        .select('account_type')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error("Error fetching account type:", error);
        setAccountType(null);
      } else {
        setAccountType(data?.account_type || 'member');
      }
    } catch (error) {
      console.error("Error fetching account type:", error);
      setAccountType(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccountType();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAuthenticated]);

  const refreshAccountType = async () => {
    setIsLoading(true);
    await fetchAccountType();
  };

  const isContractor = accountType === 'contractor';

  return (
    <AccountTypeContext.Provider value={{
      accountType,
      isContractor,
      isLoading,
      refreshAccountType
    }}>
      {children}
    </AccountTypeContext.Provider>
  );
};

export const useAccountType = (): AccountTypeContextType => {
  const context = useContext(AccountTypeContext);
  if (context === undefined) {
    throw new Error("useAccountType must be used within an AccountTypeProvider");
  }
  return context;
};
