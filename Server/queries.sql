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




-- Step 1: Create credit_accounts table
CREATE TABLE IF NOT EXISTS credit_accounts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    balance DECIMAL(10,2) DEFAULT 0.00,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 2: Create credit_transactions table for audit trail
CREATE TABLE IF NOT EXISTS credit_transactions (
    id SERIAL PRIMARY KEY,
    credit_account_id INTEGER REFERENCES credit_accounts(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL, -- Positive for credit, negative for debit
    transaction_type VARCHAR(50) NOT NULL, -- 'manual_add', 'manual_subtract', 'ticket_sale', 'refund'
    description TEXT,
    order_id INTEGER, -- Will reference orders.id when available
    user_id INTEGER, -- Will reference users.id when available
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 3: Link categories to credit accounts
CREATE TABLE IF NOT EXISTS category_credit_accounts (
    id SERIAL PRIMARY KEY,
    category_name VARCHAR(255) NOT NULL,
    credit_account_id INTEGER REFERENCES credit_accounts(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(category_name, credit_account_id)
);

-- Step 4: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_credit_transactions_account ON credit_transactions(credit_account_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created ON credit_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_category_credit_category ON category_credit_accounts(category_name);

-- Step 5: Create trigger to update credit account balance automatically
CREATE OR REPLACE FUNCTION update_credit_balance()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE credit_accounts 
    SET balance = balance + NEW.amount,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.credit_account_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_update_credit_balance ON credit_transactions;

-- Create trigger
CREATE TRIGGER trigger_update_credit_balance
    AFTER INSERT ON credit_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_credit_balance();
    -- Step 1: Add CREDIT to payment_method enum in a separate transaction
BEGIN;
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'CREDIT';
COMMIT;

-- Step 2: Verify the enum was updated
SELECT unnest(enum_range(NULL::payment_method));

-- Step 3: Now add the reference column to payments table
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS reference TEXT;


-- Step 6: Insert sample credit accounts (optional - for testing)


-- Step 7: Link existing categories to credit accounts (adjust category names to match your data)
-- First, let's see what categories you have:
-- SELECT DISTINCT category FROM ticket_types;

-- Example linkage (update category names based on your actual data):
