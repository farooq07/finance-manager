import { Input } from './input';
import { Label } from './label';

const meta = {
  title: 'UI/Input',
  component: Input,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  args: { placeholder: 'Enter a value' },
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'search', 'date'],
    },
    disabled: { control: 'boolean' },
  },
  decorators: [(Story) => <div className="w-72"><Story /></div>],
};

export default meta;

export const Default = {};

export const Disabled = {
  args: { disabled: true, value: 'Read only', readOnly: true },
};

export const WithLabel = {
  render: (args) => (
    <div className="grid gap-1.5">
      <Label htmlFor="amount">Amount (PKR)</Label>
      <Input id="amount" type="number" placeholder="0.00" {...args} />
    </div>
  ),
};

export const File = {
  args: { type: 'file' },
};
