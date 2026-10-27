import { useQuery } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import api from '../services/api';
import { TableSkeleton } from '../components/Skeleton';

// What each built-in role can do. These are the only roles the server
// enforces; assign them to people from the Users tab.
const ABILITIES = {
  user: 'Their own finances: accounts, imports, investments, Zakat, AI assistant.',
  admin: 'Everything a user can do, plus adding users, resetting their passwords and deactivating regular users.',
  'super.admin': 'Everything an admin can do, plus managing admins and which menu items each person sees.',
};

export default function RolesManagement() {
  const { data, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => (await api.get('/roles')).data,
  });
  const roles = data?.roles || [];

  return (
    <div className="flex-1 overflow-auto py-6 space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-400 max-w-2xl">
        FSWealth Axis has three fixed roles. Custom roles are not available — pick one of these for each person in the Users tab.
      </p>
      {isLoading ? (
        <TableSkeleton rows={3} cols={3} />
      ) : (
        <div className="bg-white dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-800 divide-y divide-gray-200 dark:divide-neutral-800">
          {roles.map((role) => (
            <div key={role.slug} className="flex items-start gap-3 p-4">
              <ShieldCheck className="w-5 h-5 mt-0.5 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">{role.name}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{ABILITIES[role.slug] || role.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
