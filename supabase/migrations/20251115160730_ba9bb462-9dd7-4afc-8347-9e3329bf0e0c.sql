-- Add is_active and display_order columns to case_buyers table
ALTER TABLE case_buyers 
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;

-- Create index for better performance on active buyers queries
CREATE INDEX IF NOT EXISTS idx_case_buyers_active ON case_buyers(is_active);
CREATE INDEX IF NOT EXISTS idx_case_buyers_display_order ON case_buyers(display_order);