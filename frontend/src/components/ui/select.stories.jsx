import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
} from './select';

const meta = {
  title: 'UI/Select',
  component: Select,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
};

export default meta;

export const Default = {
  render: () => (
    <Select>
      <SelectTrigger className="w-56">
        <SelectValue placeholder="Select a category" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="groceries">Groceries</SelectItem>
        <SelectItem value="rent">Rent</SelectItem>
        <SelectItem value="utilities">Utilities</SelectItem>
        <SelectItem value="transport">Transport</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const Grouped = {
  render: () => (
    <Select defaultValue="pkr">
      <SelectTrigger className="w-56">
        <SelectValue placeholder="Select currency" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Local</SelectLabel>
          <SelectItem value="pkr">PKR — Pakistani Rupee</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>International</SelectLabel>
          <SelectItem value="usd">USD — US Dollar</SelectItem>
          <SelectItem value="eur">EUR — Euro</SelectItem>
          <SelectItem value="gbp">GBP — Pound Sterling</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  ),
};

export const Disabled = {
  render: () => (
    <Select disabled>
      <SelectTrigger className="w-56">
        <SelectValue placeholder="Unavailable" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="a">Option A</SelectItem>
      </SelectContent>
    </Select>
  ),
};
