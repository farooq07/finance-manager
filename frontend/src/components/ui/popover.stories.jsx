import { Popover, PopoverTrigger, PopoverContent } from './popover';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';

const meta = {
  title: 'UI/Popover',
  component: Popover,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
};

export default meta;

export const Default = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button color="secondary">Open</Button>
      </PopoverTrigger>
      <PopoverContent>
        <p className="text-sm text-muted-foreground">
          Quick info shown in a floating panel anchored to the trigger.
        </p>
      </PopoverContent>
    </Popover>
  ),
};

export const WithForm = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button>Set budget</Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="grid gap-4">
          <div className="space-y-1">
            <h4 className="font-medium leading-none">Monthly budget</h4>
            <p className="text-sm text-muted-foreground">Set a cap for this category.</p>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cap">Amount (PKR)</Label>
            <Input id="cap" type="number" placeholder="50000" />
          </div>
          <Button size="sm">Save</Button>
        </div>
      </PopoverContent>
    </Popover>
  ),
};
