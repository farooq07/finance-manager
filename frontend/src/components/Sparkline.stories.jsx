import Sparkline from './Sparkline';

const meta = {
  title: 'Components/Sparkline',
  component: Sparkline,
  tags: ['autodocs'],
  args: {
    data: [100, 104, 102, 110, 108, 115, 121],
    height: 32,
    width: 160,
  },
  argTypes: {
    color: { control: 'color' },
    height: { control: { type: 'number', min: 16, max: 200 } },
    showTooltip: { control: 'boolean' },
  },
};

export default meta;

export const Rising = {};

export const Falling = {
  args: { data: [121, 115, 118, 108, 110, 102, 96] },
};

export const CustomColour = {
  args: { color: '#2563eb' },
};

/** Fewer than two points cannot describe a trend, so a dash is shown instead
 *  of a misleading single dot on an empty axis. */
export const NotEnoughData = {
  args: { data: [100] },
};

export const Empty = {
  args: { data: [] },
};

/** Accepts price-history rows directly, reading `close` off each object. */
export const FromPriceHistory = {
  args: {
    data: [
      { date: '2026-07-01', close: 98 },
      { date: '2026-07-02', close: 101 },
      { date: '2026-07-03', close: 99 },
      { date: '2026-07-04', close: 107 },
      { date: '2026-07-05', close: 112 },
    ],
  },
};

export const InsideTableRow = {
  render: (args) => (
    <table className="w-full text-sm">
      <tbody>
        {['FFC', 'OGDC', 'HUBC'].map((ticker, i) => (
          <tr key={ticker} className="border-b border-gray-200 dark:border-neutral-800">
            <td className="py-2 pr-4 font-medium text-gray-900 dark:text-gray-100">{ticker}</td>
            <td className="py-2 w-40">
              <Sparkline
                {...args}
                data={i === 1 ? [121, 115, 118, 108, 102] : [100, 104, 102, 110, 115]}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  ),
};
