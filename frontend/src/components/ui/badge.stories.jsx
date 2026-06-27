import { Badge } from './badge';

const meta = {
  title: 'UI/Badge',
  component: Badge,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  args: { children: 'Badge' },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'destructive', 'outline'],
    },
  },
};

export default meta;

export const Default = {};

export const All = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <Badge>Paid</Badge>
      <Badge variant="secondary">Pending</Badge>
      <Badge variant="destructive">Overdue</Badge>
      <Badge variant="outline">Draft</Badge>
    </div>
  ),
};
