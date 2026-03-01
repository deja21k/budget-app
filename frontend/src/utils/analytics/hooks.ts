/**
 * Analytics Hook
 * Custom hook for fetching and managing analytics data
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { AnalyticsData, DateRange, AnalyticsFilters } from '../../types/analytics';
import { generateMockAnalyticsData, getDateRangeForPreset } from './mockData';

// Flag to use mock data (set to false when API is ready)
const USE_MOCK_DATA = true;

interface UseAnalyticsReturn {
  data: AnalyticsData | null;
  isLoading: boolean;
  error: string | null;
  filters: AnalyticsFilters;
  setFilters: (filters: AnalyticsFilters | ((prev: AnalyticsFilters) => AnalyticsFilters)) => void;
  refresh: () => void;
}

export const useAnalytics = (initialDateRange: DateRange = 'month'): UseAnalyticsReturn => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<AnalyticsFilters>(() => {
    const dateRange = initialDateRange === 'custom' 
      ? { start: '', end: '' }
      : getDateRangeForPreset(initialDateRange);
    return {
      dateRange: initialDateRange,
      startDate: dateRange.start,
      endDate: dateRange.end,
    };
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  const fetchAnalyticsData = useCallback(async () => {
    // Cancel previous request
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      let analyticsData: AnalyticsData;

      if (USE_MOCK_DATA) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        if (!isMountedRef.current) return;

        const dateRange = {
          start: filters.startDate || (filters.dateRange !== 'custom' ? getDateRangeForPreset(filters.dateRange).start : ''),
          end: filters.endDate || (filters.dateRange !== 'custom' ? getDateRangeForPreset(filters.dateRange).end : ''),
        };

        analyticsData = generateMockAnalyticsData(dateRange);
      } else {
        // Real API call - replace with actual endpoint
        const response = await fetch(
          `/api/analytics?start=${filters.startDate}&end=${filters.endDate}`,
          { signal: abortControllerRef.current.signal }
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch analytics data');
        }

        analyticsData = await response.json();
      }

      if (isMountedRef.current) {
        setData(analyticsData);
      }
    } catch (err) {
      if (isMountedRef.current) {
        if (err instanceof Error && err.name === 'AbortError') {
          return; // Request was cancelled, don't update state
        }
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [filters]);

  // Set filters with proper typing
  const setFilters = useCallback((
    newFilters: AnalyticsFilters | ((prev: AnalyticsFilters) => AnalyticsFilters)
  ) => {
    setFiltersState((prev: AnalyticsFilters) => {
      const updated = typeof newFilters === 'function' ? newFilters(prev) : newFilters;
      return { ...prev, ...updated };
    });
  }, []);

  // Refresh data
  const refresh = useCallback(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  // Fetch data on filter change
  useEffect(() => {
    isMountedRef.current = true;
    fetchAnalyticsData();

    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, [fetchAnalyticsData]);

  return {
    data,
    isLoading,
    error,
    filters,
    setFilters,
    refresh,
  };
};

// Helper to get trend color based on value
export const getTrendColor = (value: number, type: 'income' | 'expense' | 'neutral' = 'neutral'): string => {
  if (type === 'income') {
    return value >= 0 ? 'text-success-600' : 'text-danger-600';
  }
  if (type === 'expense') {
    return value <= 0 ? 'text-success-600' : 'text-danger-600';
  }
  return value >= 0 ? 'text-success-600' : 'text-danger-600';
};

// Helper to format trend with arrow
export const formatTrend = (value: number): string => {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
};

export default useAnalytics;
