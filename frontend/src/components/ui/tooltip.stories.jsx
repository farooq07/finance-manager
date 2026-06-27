import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from './tooltip';
import { Button } from './button';
import { Info } from 'lucide-react';

const meta = {
  title: 'UI/Tooltip',
  component: Tooltip,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <TooltipProvider>
        <Story />
      </TooltipProvider>
    ),
  ],
};

export default meta;

export const Default = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button color="secondary">Hover me</Button>
      </TooltipTrigger>
      <TooltipContent>Net of all pending transactions</TooltipContent>
    </Tooltip>
  ),
};

export const OnIcon = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <button className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
          <Info className="h-5 w-5" />
        </button>
      </TooltipTrigger>
      <TooltipContent>Zakat is calculated at 2.5% of eligible assets.</TooltipContent>
    </Tooltip>
  ),
};

export const Sides = {
  render: () => (
    <div className="flex gap-6">
      {['top', 'right', 'bottom', 'left'].map((side) => (
        <Tooltip key={side}>
          <TooltipTrigger asChild>
            <Button color="secondary" size="sm">{side}</Button>
          </TooltipTrigger>
          <TooltipContent side={side}>Tooltip on {side}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  ),
};
