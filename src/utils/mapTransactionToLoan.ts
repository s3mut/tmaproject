import type { TransactionDetail, Site } from '../types/inventory';

export function mapTransactionToLoan(
  trx: TransactionDetail,
  siteLookup?: Pick<Site, 'site_code' | 'site_alias' | 'site_name' | 'region'> | null
) {
  return {
    ...trx, // sertakan field asli sebagai fallback aman untuk field lain yang mungkin dibaca
    loan_code: trx.transaction_code,
    category_name: trx.asset_category_name,
    created_at: trx.requested_at,
    returned_at: trx.received_at ?? trx.completed_at ?? null,
    site_alias: siteLookup?.site_alias ?? trx.to_site_code,
    site_code: siteLookup?.site_code ?? trx.to_site_code,
    site_name: siteLookup?.site_name ?? trx.to_site_name,
    site_region: siteLookup?.region ?? trx.to_site_region,
  };
}
