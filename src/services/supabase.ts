import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vskjncgcwrdoiplfcrpr.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZza2puY2djd3Jkb2lwbGZjcnByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2NjcyOTMsImV4cCI6MjA2NjI0MzI5M30.KM1CtFz9q-EhUU8ZpZrh1Ua3wv_lHF6VlaJItDJ_DK0'

export const supabase = createClient(supabaseUrl, supabaseKey)
