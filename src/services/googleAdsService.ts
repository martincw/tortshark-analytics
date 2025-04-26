
export const isGoogleAuthValid = async (): Promise<boolean> => {
  try {
    console.log("Checking Google Ads authentication validity...");
    
    // Attempt to fetch accounts as a validation test
    const accounts = await listGoogleAdsAccounts();
    
    console.log(`Google Ads authentication check: Found ${accounts.length} accounts`);
    
    return Array.isArray(accounts) && accounts.length > 0;
  } catch (error) {
    console.warn('Google Ads authentication validation failed:', {
      errorMessage: error.message,
      errorStack: error.stack
    });
    
    // Add more specific error logging
    if (error.message.includes("Failed to fetch")) {
      console.error("Network error or API endpoint unavailable");
    } else if (error.message.includes("Unauthorized")) {
      console.error("Authentication token is invalid or expired");
    }
    
    return false;
  }
};
