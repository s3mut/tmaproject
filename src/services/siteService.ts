import { supabase } from '../lib/supabase';
import type { Site } from '../types/inventory';

export async function getSites(): Promise<Site[]> {
  const { data, error } = await supabase
    .from('sites')
    .select('*')
    .order('site_code', { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createSite(site: Omit<Site, 'created_at'>): Promise<Site> {
  const { data, error } = await supabase
    .from('sites')
    .insert(site)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}
