import { Avatar, AvatarImage, AvatarFallback } from './avatar';

const meta = {
  title: 'UI/Avatar',
  component: Avatar,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
};

export default meta;

export const WithImage = {
  render: () => (
    <Avatar>
      <AvatarImage src="https://i.pravatar.cc/80?img=12" alt="Farooq" />
      <AvatarFallback>FS</AvatarFallback>
    </Avatar>
  ),
};

export const Fallback = {
  render: () => (
    <Avatar>
      <AvatarImage src="" alt="No image" />
      <AvatarFallback>FS</AvatarFallback>
    </Avatar>
  ),
};

export const Sizes = {
  render: () => (
    <div className="flex items-center gap-4">
      <Avatar className="h-8 w-8">
        <AvatarFallback className="text-xs">SM</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback>MD</AvatarFallback>
      </Avatar>
      <Avatar className="h-14 w-14">
        <AvatarFallback className="text-lg">LG</AvatarFallback>
      </Avatar>
    </div>
  ),
};

export const Group = {
  render: () => (
    <div className="flex -space-x-3">
      {['AB', 'CD', 'EF', 'GH'].map((initials, i) => (
        <Avatar key={initials} className="ring-2 ring-white dark:ring-vault-ink">
          <AvatarImage src={`https://i.pravatar.cc/80?img=${i + 20}`} alt={initials} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      ))}
      <Avatar className="ring-2 ring-white dark:ring-vault-ink">
        <AvatarFallback className="text-xs">+5</AvatarFallback>
      </Avatar>
    </div>
  ),
};
