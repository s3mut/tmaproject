import { useState, useCallback } from 'react';
import {
  getLoanReport, getAssetKPI, getMutationTrend,
  getAuditTrail, getOverdueLoans, getSiteRanking, getAssetUtilization,
} from '../services/reportService';
import type {
  LoanReportRow, AssetKPI, MutationTrendRow,
  AuditTrailRow, OverdueLoan, SiteLoanRankRow, AssetUtilizationRow, ReportFilter,
} from '../services/reportService';

export function useReport() {
  const [loanReport,    setLoanReport]    = useState<LoanReportRow[]>([]);
  const [kpi,           setKpi]           = useState<AssetKPI | null>(null);
  const [mutationTrend, setMutationTrend] = useState<MutationTrendRow[]>([]);
  const [auditTrail,    setAuditTrail]    = useState<AuditTrailRow[]>([]);
  const [overdueLoans,  setOverdueLoans]  = useState<OverdueLoan[]>([]);
  const [siteRanking,   setSiteRanking]   = useState<SiteLoanRankRow[]>([]);
  const [utilization,   setUtilization]   = useState<AssetUtilizationRow[]>([]);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState<string | null>(null);

  const fetchKPI = useCallback(async (region?: string | null) => {
    setLoading(true);
    try {
      const [kpiData, overdueData, rankData, utilizationData, trendData] = await Promise.allSettled([
        getAssetKPI(region),
        getOverdueLoans(),
        getSiteRanking(10),
        getAssetUtilization(),
        getMutationTrend(),
      ]);
      if (kpiData.status === 'fulfilled')         setKpi(kpiData.value);
      if (overdueData.status === 'fulfilled')     setOverdueLoans(overdueData.value);
      if (rankData.status === 'fulfilled')        setSiteRanking(rankData.value);
      if (utilizationData.status === 'fulfilled') setUtilization(utilizationData.value);
      if (trendData.status === 'fulfilled')       setMutationTrend(trendData.value);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLoanReport = useCallback(async (filter: ReportFilter) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getLoanReport(filter);
      setLoanReport(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAuditTrail = useCallback(async (params: Parameters<typeof getAuditTrail>[0]) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAuditTrail(params);
      setAuditTrail(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const refetchOverdue = useCallback(async () => {
    const data = await getOverdueLoans();
    setOverdueLoans(data);
    return data;
  }, []);

  return {
    loanReport,
    kpi,
    mutationTrend,
    auditTrail,
    overdueLoans,
    siteRanking,
    utilization,
    loading,
    error,
    fetchKPI,
    fetchLoanReport,
    fetchAuditTrail,
    refetchOverdue,
  };
}
