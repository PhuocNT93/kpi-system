import { useQuery } from '@tanstack/react-query';
import { getApi } from './shared/api/api-client';

interface HealthStatus {
  status: string;
}

function App() {
  const healthQuery = useQuery({
    queryKey: ['health'],
    queryFn: () => getApi<HealthStatus>('/health')
  });

  return (
    <main>
      <h1>KPI System</h1>
      <p>
        API status: {healthQuery.isPending ? 'Checking...' : healthQuery.data?.status ?? 'Unavailable'}
      </p>
    </main>
  );
}

export default App;
