import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
} from './dropdown-menu';
import { Button } from './button';
import { User, Settings, LogOut, Download } from 'lucide-react';

const meta = {
  title: 'UI/DropdownMenu',
  component: DropdownMenu,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
};

export default meta;

export const Basic = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button color="secondary">Open menu</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <User /> Profile
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Settings /> Settings
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Download /> Export data
          <DropdownMenuShortcut>⌘E</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive focus:text-destructive">
          <LogOut /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};

export const WithCheckboxes = {
  render: () => {
    const [showIncome, setShowIncome] = useState(true);
    const [showExpenses, setShowExpenses] = useState(false);
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button color="secondary">Columns</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-48">
          <DropdownMenuLabel>Show columns</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem checked={showIncome} onCheckedChange={setShowIncome}>
            Income
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked={showExpenses} onCheckedChange={setShowExpenses}>
            Expenses
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  },
};

export const WithRadioGroup = {
  render: () => {
    const [range, setRange] = useState('month');
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button color="secondary">Date range</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-48">
          <DropdownMenuLabel>Period</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup value={range} onValueChange={setRange}>
            <DropdownMenuRadioItem value="week">This week</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="month">This month</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="year">This year</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  },
};
