import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 타입은 나중에 supabase gen types로 생성
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
