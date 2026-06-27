import { useState } from 'react';
import { Calendar } from './calendar';

const meta = {
  title: 'UI/Calendar',
  component: Calendar,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
};

export default meta;

export const Single = {
  render: () => {
    const [date, setDate] = useState(new Date(2026, 5, 24));
    return (
      <Calendar
        mode="single"
        selected={date}
        onSelect={setDate}
        className="rounded-md border"
      />
    );
  },
};

export const Range = {
  render: () => {
    const [range, setRange] = useState({
      from: new Date(2026, 5, 10),
      to: new Date(2026, 5, 20),
    });
    return (
      <Calendar
        mode="range"
        selected={range}
        onSelect={setRange}
        numberOfMonths={2}
        className="rounded-md border"
      />
    );
  },
};
