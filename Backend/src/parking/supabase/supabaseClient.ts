import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config(); // โหลดค่า .env ก่อน

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);