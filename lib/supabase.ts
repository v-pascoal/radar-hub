
// Como estamos em um ambiente de demonstração, simulamos o cliente Supabase 
// que se conectaria ao seu projeto real.
// Para usar no mundo real: import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = 'https://seu-projeto.supabase.co';
export const SUPABASE_ANON_KEY = 'sua-anon-key-aqui';

// Mock do Supabase Client para garantir que o código compile e funcione na demo
export const supabase = {
    from: (table: string) => ({
        select: (query: string) => ({
            eq: (col: string, val: any) => Promise.resolve({ data: [], error: null }),
            order: (col: string) => Promise.resolve({ data: [], error: null })
        }),
        insert: (data: any) => Promise.resolve({ data, error: null }),
        update: (data: any) => ({
            eq: (col: string, val: any) => Promise.resolve({ data, error: null })
        }),
        upsert: (data: any) => Promise.resolve({ data, error: null })
    })
};
