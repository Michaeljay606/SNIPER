import { useConfig } from '../context/ConfigContext';

export function useClientConfig() {
  const { config, loading, refresh } = useConfig();
  return { config, loading, refresh };
}
