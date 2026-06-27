import { RadioGroup, RadioGroupItem } from './radio-group';
import { Label } from './label';

const meta = {
  title: 'UI/RadioGroup',
  component: RadioGroup,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
};

export default meta;

export const Default = {
  render: () => (
    <RadioGroup defaultValue="monthly">
      <div className="flex items-center gap-2">
        <RadioGroupItem value="weekly" id="r-weekly" />
        <Label htmlFor="r-weekly" className="cursor-pointer">Weekly</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="monthly" id="r-monthly" />
        <Label htmlFor="r-monthly" className="cursor-pointer">Monthly</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="yearly" id="r-yearly" />
        <Label htmlFor="r-yearly" className="cursor-pointer">Yearly</Label>
      </div>
    </RadioGroup>
  ),
};

export const WithDisabledOption = {
  render: () => (
    <RadioGroup defaultValue="card">
      <div className="flex items-center gap-2">
        <RadioGroupItem value="card" id="p-card" />
        <Label htmlFor="p-card" className="cursor-pointer">Bank card</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="cash" id="p-cash" />
        <Label htmlFor="p-cash" className="cursor-pointer">Cash</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="crypto" id="p-crypto" disabled />
        <Label htmlFor="p-crypto" className="opacity-50">Crypto (coming soon)</Label>
      </div>
    </RadioGroup>
  ),
};
