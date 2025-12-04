-- Update all existing records to 17%
UPDATE campaign_portfolio_settings SET split_percentage = 17;

-- Change the default value for new records
ALTER TABLE campaign_portfolio_settings ALTER COLUMN split_percentage SET DEFAULT 17;