-- Migration: Add flag to track if "out of credits" email has been sent
-- This ensures we only send the email once per user

-- Add column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS out_of_credits_email_sent BOOLEAN DEFAULT FALSE;

-- Add timestamp to track when it was sent
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS out_of_credits_email_sent_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add index for performance when querying users who haven't received the email
CREATE INDEX IF NOT EXISTS idx_users_out_of_credits_email_sent 
ON users(out_of_credits_email_sent) 
WHERE out_of_credits_email_sent = FALSE;

-- Add comment to document the purpose
COMMENT ON COLUMN users.out_of_credits_email_sent IS 'Flag to track if the user has received the "out of credits" email when they first attempted to generate a playlist with 0 remaining uses';
COMMENT ON COLUMN users.out_of_credits_email_sent_at IS 'Timestamp when the out of credits email was sent';


