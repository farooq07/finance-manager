import { useState } from 'react';
import { Modal } from './modal';
import { Button } from './button';

const meta = {
  title: 'UI/Modal',
  component: Modal,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg', 'xl'] },
  },
};

export default meta;

const Demo = ({ size }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open modal</Button>
      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Add transaction"
        description="Record a new income or expense entry."
        size={size}
        footer={
          <>
            <Button color="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => setOpen(false)}>Save</Button>
          </>
        }
      >
        <p className="text-sm text-gray-600 dark:text-gray-300">
          This is the portal-based custom Modal (div overlay, not a native dialog).
          It closes on backdrop click or the Escape key.
        </p>
      </Modal>
    </>
  );
};

export const Default = {
  render: (args) => <Demo {...args} />,
  args: { size: 'md' },
};

export const Large = {
  render: (args) => <Demo {...args} />,
  args: { size: 'xl' },
};
