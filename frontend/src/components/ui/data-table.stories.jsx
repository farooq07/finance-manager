import { useState } from 'react';
import { DataTable } from './data-table';
import { Badge } from './badge';
import { Button } from './button';
import { Plus } from 'lucide-react';

const meta = {
  title: 'UI/DataTable',
  component: DataTable,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};

export default meta;

const data = [
  { ref: 'TX-1042', date: '24 Jun 2026', desc: 'Grocery — Imtiaz', amount: 'PKR 8,450', status: 'Paid' },
  { ref: 'TX-1041', date: '22 Jun 2026', desc: 'Electricity bill', amount: 'PKR 14,200', status: 'Pending' },
  { ref: 'TX-1040', date: '20 Jun 2026', desc: 'Salary credit', amount: 'PKR 320,000', status: 'Paid' },
  { ref: 'TX-1039', date: '18 Jun 2026', desc: 'Internet — StormFiber', amount: 'PKR 4,000', status: 'Overdue' },
];

const statusVariant = { Paid: 'default', Pending: 'secondary', Overdue: 'destructive' };

const columns = [
  { header: 'Reference', accessorKey: 'ref' },
  { header: 'Date', accessorKey: 'date' },
  { header: 'Description', accessorKey: 'desc' },
  { header: 'Status', cell: (row) => <Badge variant={statusVariant[row.status]}>{row.status}</Badge> },
  { header: 'Amount', accessorKey: 'amount' },
];

export const Default = {
  render: () => (
    <DataTable
      title="Transactions"
      description="All entries for June 2026."
      columns={columns}
      data={data}
    />
  ),
};

export const WithSearchAndAction = {
  render: () => (
    <DataTable
      title="Transactions"
      globalSearch
      headerAction={<Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add</Button>}
      columns={columns}
      data={data}
    />
  ),
};

export const WithPagination = {
  render: () => {
    const [pageIndex, setPageIndex] = useState(0);
    const pageSize = 2;
    const paged = data.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
    return (
      <DataTable
        title="Transactions"
        columns={columns}
        data={paged}
        pagination={{
          pageSize,
          pageIndex,
          totalCount: data.length,
          canPreviousPage: pageIndex > 0,
          canNextPage: (pageIndex + 1) * pageSize < data.length,
          previousPage: () => setPageIndex((i) => Math.max(0, i - 1)),
          nextPage: () => setPageIndex((i) => i + 1),
        }}
      />
    );
  },
};

export const Empty = {
  render: () => <DataTable title="Transactions" columns={columns} data={[]} />,
};
