import { useState } from 'react';
import { ConfirmDialogProvider, useConfirm } from './confirm-dialog';
import { Button } from './button';

const meta = {
  title: 'UI/ConfirmDialog',
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <ConfirmDialogProvider>
        <Story />
      </ConfirmDialogProvider>
    ),
  ],
};

export default meta;

function Demo({ options, label }) {
  const confirm = useConfirm();
  const [result, setResult] = useState(null);
  return (
    <div className="flex flex-col items-center gap-3">
      <Button
        color={options.variant === 'destructive' ? 'danger' : 'primary'}
        onClick={async () => setResult(await confirm(options))}
      >
        {label}
      </Button>
      {result !== null && (
        <p className="text-sm text-muted-foreground">
          You chose: <strong>{result ? 'Confirm' : 'Cancel'}</strong>
        </p>
      )}
    </div>
  );
}

export const Destructive = {
  render: () => (
    <Demo
      label="Delete transaction"
      options={{
        title: 'Delete this transaction?',
        description: 'This permanently removes the entry from your records.',
        confirmText: 'Delete',
        variant: 'destructive',
      }}
    />
  ),
};

export const Neutral = {
  render: () => (
    <Demo
      label="Mark as reviewed"
      options={{
        title: 'Mark as reviewed?',
        description: 'You can change this later from the statement view.',
        confirmText: 'Mark reviewed',
        variant: 'default',
      }}
    />
  ),
};
