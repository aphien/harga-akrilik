import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rhuxafuxjdchdrscszuv.supabase.co';
const supabaseAnonKey = 'sb_publishable_dTq-m509MtVC3MygjppRFQ__VYVQ6XC';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
