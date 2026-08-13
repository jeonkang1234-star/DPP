import { useCallback } from 'react';
import { passportApi, scanApi, settingsApi } from '../api/services.js';
import { useQuery, useMutation } from './useAsync.js';

export function useScans(query = '') {
  const result = useQuery(() => scanApi.list(query), [query], { keepPreviousData: true });
  return {
    ...result,
    scans: result.data?.items ?? [],
    total: result.data?.total ?? 0
  };
}

export function usePassport(passportId) {
  const result = useQuery(() => passportApi.detail(passportId), [passportId], {
    enabled: Boolean(passportId)
  });
  return { ...result, passport: result.data };
}

export function useDeleteScan(onDeleted) {
  const mutator = useCallback(
    async (scanId) => {
      const res = await scanApi.remove(scanId);
      onDeleted?.(scanId);
      return res;
    },
    [onDeleted]
  );
  return useMutation(mutator);
}

export function useSubmitScanCode() {
  return useMutation(useCallback((code) => scanApi.submitCode(code), []));
}

export function useUpdateSettings() {
  return useMutation(useCallback((patch) => settingsApi.update(patch), []));
}