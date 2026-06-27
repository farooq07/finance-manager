import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from './table';
import { Badge } from './badge';

const meta = {
  title: 'UI/Table',
  component: Table,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};

export default meta;

const rows = [
  { id: 'TX-1042', date: '24 Jun 2026', desc: 'Grocery — Imtiaz', amount: 'PKR 8,450', status: 'Paid' },
  { id: 'TX-1041', date: '22 Jun 2026', desc: 'Electricity bill', amount: 'PKR 14,200', status: 'Pending' },
  { id: 'TX-1040', date: '20 Jun 2026', desc: 'Salary credit', amount: 'PKR 320,000', status: 'Paid' },
  { id: 'TX-1039', date: '18 Jun 2026', desc: 'Internet — StormFiber', amount: 'PKR 4,000', status: 'Overdue' },
];

const statusVariant = { Paid: 'default', Pending: 'secondary', Overdue: 'destructive' };

export const Default = {
  render: () => (
    <Table>
      <TableCaption>Recent transactions for June 2026.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Reference</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell className="font-medium">{r.id}</TableCell>
            <TableCell>{r.date}</TableCell>
            <TableCell>{r.desc}</TableCell>
            <TableCell>
              <Badge variant={statusVariant[r.status]}>{r.status}</Badge>
            </TableCell>
            <TableCell className="text-right">{r.amount}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={4}>Total</TableCell>
          <TableCell className="text-right">PKR 346,650</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  ),
};
