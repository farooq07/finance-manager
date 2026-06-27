import { Search, Mail } from 'lucide-react';
import TextInput from './TextInput';

const meta = {
  title: 'Components/TextInput',
  component: TextInput,
  tags: ['autodocs'],
  args: {
    placeholder: 'Enter a value',
  },
  argTypes: {
    sizing: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    color: {
      control: 'select',
      options: [undefined, 'failure'],
    },
  },
};

export default meta;

export const Default = {};

export const WithIcon = {
  args: { icon: Search, placeholder: 'Search transactions' },
};

export const WithHelperText = {
  args: {
    icon: Mail,
    placeholder: 'you@example.com',
    helperText: "We'll send your OTP here.",
  },
};

export const Error = {
  args: {
    color: 'failure',
    placeholder: 'Invalid amount',
    helperText: 'Please enter a valid PKR amount.',
  },
};
