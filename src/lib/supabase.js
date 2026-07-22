import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://gxlurswsmcydcagxoxpr.supabase.co'
const SUPABASE_KEY = 'sb_publishable_tV8CRhA_d6O_ktHPluNrWg_BBizC8s4'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
