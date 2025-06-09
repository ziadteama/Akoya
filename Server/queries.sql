-- ENUMs
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'age_group') THEN
        CREATE TYPE age_group AS ENUM ('child', 'adult', 'senior');
    END IF;
END$$;

-- TABLE: users
CREATE TABLE IF NOT EXISTS public.users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'accountant', 'cashier'))
);

-- TABLE: orders
CREATE TABLE IF NOT EXISTS public.orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    gross_total NUMERIC(10,2) DEFAULT 0
);

-- TABLE: meals
CREATE TABLE IF NOT EXISTS public.meals (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL,
    age_group age_group NOT NULL,
    archived BOOLEAN DEFAULT false
);

-- TABLE: order_meals
CREATE TABLE IF NOT EXISTS public.order_meals (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    meal_id INTEGER NOT NULL REFERENCES public.meals(id),
    quantity INTEGER DEFAULT 1 NOT NULL,
    price_at_order NUMERIC(10,2) NOT NULL,
    total_price NUMERIC(10,2)
);

-- TABLE: ticket_types
CREATE TABLE IF NOT EXISTS public.ticket_types (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    price NUMERIC(10,2) NOT NULL
);

-- TABLE: tickets
CREATE TABLE IF NOT EXISTS public.tickets (
    id SERIAL PRIMARY KEY,
    ticket_type_id INTEGER REFERENCES public.ticket_types(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'sold')),
    valid BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sold_at TIMESTAMP,
    sold_price NUMERIC(10,2),
    order_id INTEGER REFERENCES public.orders(id) ON DELETE CASCADE
);

-- FUNCTIONS
CREATE OR REPLACE FUNCTION public.calculate_order_meal_total()
RETURNS trigger AS $$
BEGIN
    NEW.total_price := NEW.price_at_order * NEW.quantity;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_order_total()
RETURNS trigger AS $$
BEGIN
    UPDATE public.orders
    SET total_amount = COALESCE((
        SELECT SUM(COALESCE(total_price, 0)) FROM public.order_meals WHERE order_id = NEW.order_id
    ), 0)
    + COALESCE((
        SELECT SUM(COALESCE(sold_price, 0)) FROM public.tickets WHERE order_id = NEW.order_id
    ), 0)
    WHERE id = NEW.order_id;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_order_gross_total()
RETURNS trigger AS $$
BEGIN
    UPDATE public.orders
    SET gross_total = COALESCE((
        SELECT COUNT(*) FROM public.tickets WHERE order_id = NEW.order_id
    ), 0) * 100  -- placeholder logic
    WHERE id = NEW.order_id;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_sold_ticket()
RETURNS trigger AS $$
BEGIN
    IF NEW.status = 'sold' AND OLD.status <> 'sold' THEN
        NEW.sold_at := NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.reset_sold_details()
RETURNS trigger AS $$
BEGIN
    IF NEW.status = 'available' THEN
        NEW.sold_at := NULL;
        NEW.sold_price := NULL;
        NEW.order_id := NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.set_created_at()
RETURNS trigger AS $$
BEGIN
    IF NEW.created_at IS NULL THEN
        NEW.created_at := NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_sold_at()
RETURNS trigger AS $$
BEGIN
    IF NEW.status = 'sold' THEN
        NEW.sold_at := CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TRIGGERS
CREATE TRIGGER set_total_price_on_insert
BEFORE INSERT OR UPDATE ON public.order_meals
FOR EACH ROW EXECUTE FUNCTION public.calculate_order_meal_total();

CREATE TRIGGER meal_total_trigger
AFTER INSERT OR DELETE OR UPDATE ON public.order_meals
FOR EACH ROW EXECUTE FUNCTION public.update_order_total();

CREATE TRIGGER trg_update_order_total_meals_delete
AFTER DELETE ON public.order_meals
FOR EACH ROW WHEN (OLD.order_id IS NOT NULL)
EXECUTE FUNCTION public.update_order_total();

CREATE TRIGGER gross_total_meal_trigger
AFTER INSERT OR DELETE OR UPDATE ON public.order_meals
FOR EACH ROW EXECUTE FUNCTION public.update_order_gross_total();

CREATE TRIGGER ticket_total_trigger
AFTER INSERT OR DELETE OR UPDATE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.update_order_total();

CREATE TRIGGER trg_update_order_total_delete
AFTER DELETE ON public.tickets
FOR EACH ROW WHEN (OLD.order_id IS NOT NULL)
EXECUTE FUNCTION public.update_order_total();

CREATE TRIGGER gross_total_ticket_trigger
AFTER INSERT OR DELETE OR UPDATE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.update_order_gross_total();

CREATE TRIGGER ticket_status_update
BEFORE UPDATE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.update_sold_ticket();

CREATE TRIGGER trigger_reset_sold_details
BEFORE UPDATE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.reset_sold_details();

CREATE TRIGGER trigger_set_created_at
BEFORE INSERT ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.set_created_at();

CREATE TRIGGER trigger_update_sold_at
BEFORE UPDATE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.update_sold_at();

-- USERS
INSERT INTO public.users (name, username, password_hash, role) VALUES
('Admin User', 'admin', 'hashed_password1', 'admin'),
('Accountant User', 'accountant', 'hashed_password2', 'accountant');

-- BULK TICKETS
DO $$
BEGIN
  FOR i IN 1..50000 LOOP
    INSERT INTO public.tickets (status, valid) VALUES ('available', true);
  END LOOP;
END$$;




-- =====================================================
-- COMPLETE CREDIT SYSTEM SETUP WITH FIXED TRIGGER
-- =====================================================

-- Step 1: Drop any existing credit system components
DROP TRIGGER IF EXISTS credit_transaction_trigger ON credit_transactions;
DROP TRIGGER IF EXISTS trigger_update_credit_balance ON credit_transactions;
DROP FUNCTION IF EXISTS update_credit_balance() CASCADE;
DROP TABLE IF EXISTS category_credit_accounts CASCADE;
DROP TABLE IF EXISTS credit_transactions CASCADE;
DROP TABLE IF EXISTS credit_accounts CASCADE;

-- Step 2: Add CREDIT to payment_method enum if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'CREDIT' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'payment_method')) THEN
        ALTER TYPE payment_method ADD VALUE 'CREDIT';
    END IF;
END $$;

-- Step 3: Add reference column to payments table if not exists
ALTER TABLE payments ADD COLUMN IF NOT EXISTS reference TEXT;

-- Step 4: Create credit_accounts table
CREATE TABLE credit_accounts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    balance DECIMAL(10,2) DEFAULT 0.00,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 5: Create credit_transactions table for audit trail
CREATE TABLE credit_transactions (
    id SERIAL PRIMARY KEY,
    credit_account_id INTEGER REFERENCES credit_accounts(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL, -- Positive for deposits, negative for withdrawals
    transaction_type VARCHAR(50) NOT NULL, -- 'DEPOSIT', 'WITHDRAWAL', 'SALE', 'REFUND', 'ADJUSTMENT', 'INITIAL_BALANCE'
    description TEXT,
    order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 6: Create category linking table
CREATE TABLE category_credit_accounts (
    id SERIAL PRIMARY KEY,
    category_name VARCHAR(255) NOT NULL,
    credit_account_id INTEGER REFERENCES credit_accounts(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(category_name, credit_account_id)
);

-- Step 7: Create indexes for performance
CREATE INDEX idx_credit_transactions_account ON credit_transactions(credit_account_id);
CREATE INDEX idx_credit_transactions_created ON credit_transactions(created_at DESC);
CREATE INDEX idx_credit_transactions_type ON credit_transactions(transaction_type);
CREATE INDEX idx_category_credit_category ON category_credit_accounts(category_name);
CREATE INDEX idx_category_credit_account ON category_credit_accounts(credit_account_id);

-- Step 8: Create the FIXED trigger function (no double processing)
CREATE OR REPLACE FUNCTION update_credit_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update balance once, no double processing
    UPDATE credit_accounts 
    SET balance = balance + NEW.amount,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.credit_account_id;
    
    -- Return NEW to continue with the transaction insert
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Create the trigger (fires AFTER INSERT only)
CREATE TRIGGER credit_transaction_trigger
    AFTER INSERT ON credit_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_credit_balance();

-- Step 10: Insert sample credit accounts for testing
INSERT INTO credit_accounts (name, balance, description) VALUES
('Adults Credit Account', 0.00, 'Credit account for adult ticket purchases'),
('Children Credit Account', 0.00, 'Credit account for children ticket purchases'),
('Senior Credit Account', 0.00, 'Credit account for senior ticket purchases'),
('General Credit Account', 0.00, 'General purpose credit account')
ON CONFLICT (name) DO NOTHING;

-- Step 11: Get available categories from ticket_types and show them
DO $$
DECLARE
    category_record RECORD;
BEGIN
    RAISE NOTICE 'Available categories in your system:';
    FOR category_record IN 
        SELECT DISTINCT category FROM ticket_types WHERE category IS NOT NULL ORDER BY category
    LOOP
        RAISE NOTICE '- %', category_record.category;
    END LOOP;
END $$;

-- Step 12: Link categories to credit accounts (UPDATE THESE BASED ON YOUR ACTUAL CATEGORIES)
-- First check what categories you have:
SELECT DISTINCT category FROM ticket_types ORDER BY category;

-- Example category linkages (update category names to match your actual data):
-- INSERT INTO category_credit_accounts (category_name, credit_account_id) VALUES
-- ('Adult', 1),
-- ('Child', 2), 
-- ('Senior', 3)
-- ON CONFLICT (category_name, credit_account_id) DO NOTHING;

-- Step 13: Create a view for easy credit account overview
CREATE OR REPLACE VIEW credit_accounts_overview AS
SELECT 
    ca.id,
    ca.name,
    ca.balance,
    ca.description,
    ca.created_at,
    ca.updated_at,
    COALESCE(
        JSON_AGG(
            DISTINCT cca.category_name
        ) FILTER (WHERE cca.category_name IS NOT NULL),
        '[]'::json
    ) as linked_categories,
    COUNT(ct.id) as total_transactions,
    COALESCE(SUM(CASE WHEN ct.amount > 0 THEN ct.amount ELSE 0 END), 0) as total_deposits,
    COALESCE(SUM(CASE WHEN ct.amount < 0 THEN ABS(ct.amount) ELSE 0 END), 0) as total_withdrawals
FROM credit_accounts ca
LEFT JOIN category_credit_accounts cca ON ca.id = cca.credit_account_id
LEFT JOIN credit_transactions ct ON ca.id = ct.credit_account_id
GROUP BY ca.id, ca.name, ca.balance, ca.description, ca.created_at, ca.updated_at
ORDER BY ca.name;

-- Step 14: Verify the setup
SELECT 'Tables created successfully' as status;
SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'credit_%';

-- Test the trigger by inserting a sample transaction
INSERT INTO credit_transactions (credit_account_id, amount, transaction_type, description, user_id)
VALUES (1, 100.00, 'INITIAL_BALANCE', 'Test initial balance', 1);

-- Check if the balance was updated correctly
SELECT name, balance FROM credit_accounts WHERE id = 1;

-- Step 15: Clean up test transaction (optional)
-- DELETE FROM credit_transactions WHERE description = 'Test initial balance';
-- UPDATE credit_accounts SET balance = 0.00 WHERE id = 1;

-- Final verification
SELECT 'Credit system setup completed successfully!' as message;