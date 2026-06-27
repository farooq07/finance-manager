import { toast } from 'sonner';
import { Toaster } from './sonner';
import { Button } from './button';

const meta = {
  title: 'UI/Toast (Sonner)',
  component: Toaster,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <>
        <Story />
        <Toaster />
      </>
    ),
  ],
};

export default meta;

export const Variants = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Button color="secondary" onClick={() => toast('Transaction saved')}>
        Default
      </Button>
      <Button color="secondary" onClick={() => toast.success('Payment recorded')}>
        Success
      </Button>
      <Button color="secondary" onClick={() => toast.error('Could not reach the server')}>
        Error
      </Button>
      <Button
        color="secondary"
        onClick={() =>
          toast('Budget exceeded', {
            description: 'You are PKR 12,000 over your June budget.',
            action: { label: 'View', onClick: () => {} },
          })
        }
      >
        With action
      </Button>
    </div>
  ),
};
