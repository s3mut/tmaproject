import { supabase } from '../lib/supabase';
import type { Category, Site, AssetStatus } from '../types/inventory';

export interface CSVRowParsed {
  rowNumber: number;
  serial_number: string;
  aktiva: string | null;
  category_input: string;
  brand: string | null;
  model_type: string | null;
  computer_name: string | null;
  site_alias: string | null;
  status: AssetStatus;
  external_id: string | null;
  description: string | null;
  
  // Validation status
  isValid: boolean;
  category_id: number | null;
  category_matched_name: string | null;
  errorMsg?: string;
}

export interface CSVParseResult {
  total: number;
  validRows: CSVRowParsed[];
  invalidRows: CSVRowParsed[];
  unknownCategories: string[];
}

/**
 * Parse teks CSV dari file upload
 */
export function parseCSVText(csvText: string, categories: Category[], sites: Site[] = []): CSVParseResult {
  const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length < 2) {
    throw new Error('File CSV kosong atau tidak memiliki data.');
  }

  // Parse header
  const header = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
  
  const snIdx       = header.indexOf('serial_number');
  const aktivaIdx   = header.indexOf('aktiva');
  const catIdx      = header.indexOf('category');
  const brandIdx    = header.indexOf('brand');
  const modelIdx    = header.indexOf('model_type');
  const compIdx     = header.indexOf('computer_name');
  const siteIdx     = header.indexOf('site_alias');
  const statusIdx   = header.indexOf('status');
  const extIdx      = header.indexOf('external_id');
  const descIdx     = header.indexOf('description');

  if (snIdx === -1 || catIdx === -1) {
    throw new Error('Header CSV wajib memiliki minimal kolom "serial_number" dan "category".');
  }

  // Helper parser 1 baris CSV (menangani koma dalam kutip jika ada)
  const parseLine = (line: string): string[] => {
    const values: string[] = [];
    let insideQuote = false;
    let current = '';
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' || char === "'") {
        insideQuote = !insideQuote;
      } else if (char === ',' && !insideQuote) {
        values.push(current.trim().replace(/^["']|["']$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim().replace(/^["']|["']$/g, ''));
    return values;
  };

  const categoryMap = new Map<string, Category>();
  categories.forEach(c => {
    categoryMap.set(c.name.trim().toUpperCase(), c);
  });

  // Map sites (mencocokkan site_alias maupun site_code)
  const siteMap = new Map<string, string>();
  sites.forEach(s => {
    if (s.site_alias) siteMap.set(s.site_alias.trim().toUpperCase(), s.site_alias);
    if (s.site_code) siteMap.set(s.site_code.trim().toUpperCase(), s.site_alias || s.site_code);
  });

  const validRows: CSVRowParsed[] = [];
  const invalidRows: CSVRowParsed[] = [];
  const unknownCatSet = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i]);
    const sn = cols[snIdx] ? cols[snIdx].trim() : '';
    const catInput = cols[catIdx] ? cols[catIdx].trim() : '';

    if (!sn) continue; // Skip baris tanpa serial number

    const aktiva      = aktivaIdx !== -1 && cols[aktivaIdx] ? cols[aktivaIdx].trim() : null;
    const brand       = brandIdx !== -1 && cols[brandIdx] ? cols[brandIdx].trim() : null;
    const modelType   = modelIdx !== -1 && cols[modelIdx] ? cols[modelIdx].trim() : null;
    const compName    = compIdx !== -1 && cols[compIdx] ? cols[compIdx].trim() : null;
    const rawSite     = siteIdx !== -1 && cols[siteIdx] ? cols[siteIdx].trim() : null;
    const rawStatus   = statusIdx !== -1 && cols[statusIdx] ? cols[statusIdx].trim() : 'Active';
    const extId       = extIdx !== -1 && cols[extIdx] ? cols[extIdx].trim() : null;
    const desc        = descIdx !== -1 && cols[descIdx] ? cols[descIdx].trim() : null;

    // Normalisasi site_alias terhadap tabel sites agar tidak melanggar FK constraint fk_asset_site
    let validSiteAlias: string | null = null;
    if (rawSite) {
      const matchedSite = siteMap.get(rawSite.toUpperCase());
      if (matchedSite) {
        validSiteAlias = matchedSite;
      } else {
        // Jika site_alias di CSV tidak ditemukan di tabel sites, set null agar aman
        validSiteAlias = null;
      }
    }

    // Normalisasi status
    const validStatuses: AssetStatus[] = ['Active', 'Backup', 'Repair', 'Disposed', 'In Transit', 'Retired'];
    const matchedStatus = validStatuses.find(s => s.toLowerCase() === rawStatus.toLowerCase()) || 'Active';

    // Check category match
    const matchedCat = categoryMap.get(catInput.toUpperCase());

    const parsedRow: CSVRowParsed = {
      rowNumber: i + 1,
      serial_number: sn,
      aktiva: aktiva || null,
      category_input: catInput,
      brand: brand || null,
      model_type: modelType || null,
      computer_name: compName || null,
      site_alias: validSiteAlias,
      status: matchedStatus,
      external_id: extId || null,
      description: desc || null,
      isValid: !!matchedCat,
      category_id: matchedCat ? matchedCat.id : null,
      category_matched_name: matchedCat ? matchedCat.name : null,
      errorMsg: !matchedCat ? `Kategori "${catInput}" tidak terdaftar di master_categories` : undefined
    };

    if (matchedCat) {
      validRows.push(parsedRow);
    } else {
      invalidRows.push(parsedRow);
      if (catInput) unknownCatSet.add(catInput);
    }
  }

  return {
    total: validRows.length + invalidRows.length,
    validRows,
    invalidRows,
    unknownCategories: Array.from(unknownCatSet)
  };
}

/**
 * Upload batch data aset yang sudah divalidasi ke Supabase dalam batch (chunking)
 */
export async function uploadValidatedCSVAssets(
  rows: CSVRowParsed[], 
  onProgress?: (processed: number, total: number) => void
): Promise<{ count: number }> {
  if (rows.length === 0) return { count: 0 };

  const payload = rows.map(r => ({
    serial_number: r.serial_number,
    aktiva: r.aktiva,
    category_id: r.category_id!,
    category: r.category_matched_name!,
    brand: r.brand,
    model_type: r.model_type,
    computer_name: r.computer_name,
    site_alias: r.site_alias,
    status: r.status,
    external_id: r.external_id,
    description: r.description
  }));

  const CHUNK_SIZE = 250;
  let totalUploaded = 0;

  for (let i = 0; i < payload.length; i += CHUNK_SIZE) {
    const chunk = payload.slice(i, i + CHUNK_SIZE);
    const { data, error } = await supabase
      .from('master_assets')
      .upsert(chunk, { onConflict: 'serial_number' })
      .select('id');

    if (error) {
      console.error(`Error batch insert batch ${i / CHUNK_SIZE + 1}:`, error);
      throw new Error(`Gagal upload pada baris ${i + 1}-${i + chunk.length}: ${error.message}`);
    }

    totalUploaded += data?.length || chunk.length;
    if (onProgress) {
      onProgress(Math.min(i + CHUNK_SIZE, payload.length), payload.length);
    }
  }

  return { count: totalUploaded };
}

/**
 * Buat kategori baru di Supabase jika Admin memutuskan membuat kategori baru langsung dari modal
 */
export async function createCategoryFromAdmin(name: string): Promise<Category> {
  const { data, error } = await supabase
    .from('master_categories')
    .insert([{
      name: name.trim(),
      icon: 'fa-box',
      color_text: 'text-slate-400',
      color_bg: 'bg-slate-500/20'
    }])
    .select()
    .single();

  if (error) {
    throw new Error(`Gagal menambah kategori "${name}": ${error.message}`);
  }

  return data;
}
