const SUPABASE_URL = "https://iqfwbkfhpjngokwwthfr.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_TcB_isEy54BfKu6LQHKTEw_g4QmO_nu";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);