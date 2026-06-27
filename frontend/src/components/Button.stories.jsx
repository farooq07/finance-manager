import Button from './Button';

const meta = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
  args: {
    children: 'Save changes',
  },
  argTypes: {
    color: {
      control: 'select',
      options: ['primary', 'secondary', 'danger', 'ghost', 'link', 'light'],
    },
    size: {
      control: 'select',
      options: ['sm', 'default', 'lg', 'icon'],
    },
    processing: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
};

export default meta;

export const Primary = {};

export const Secondary = {
  args: { color: 'secondary' },
};

export const Danger = {
  args: { color: 'danger', children: 'Delete account' },
};

export const Outline = {
  args: { outline: true, children: 'Cancel' },
};

export const Processing = {
  args: { processing: true, children: 'Saving…' },
};

export const Sizes = {
  render: (args) => (
    <div className="flex items-center gap-3">
      <Button {...args} size="sm">Small</Button>
      <Button {...args} size="default">Default</Button>
      <Button {...args} size="lg">Large</Button>
    </div>
  ),
};
