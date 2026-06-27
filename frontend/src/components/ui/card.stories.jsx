import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './card';
import { Button } from './button';

const meta = {
  title: 'UI/Card',
  component: Card,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
};

export default meta;

export const Basic = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Total Balance</CardTitle>
        <CardDescription>Across all accounts</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tracking-tight">PKR 1,284,500</p>
      </CardContent>
    </Card>
  ),
};

export const WithFooter = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Monthly Budget</CardTitle>
        <CardDescription>June 2026</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          You've used 68% of your PKR 200,000 budget this month.
        </p>
      </CardContent>
      <CardFooter className="gap-2">
        <Button size="sm">View details</Button>
        <Button size="sm" color="secondary">Adjust</Button>
      </CardFooter>
    </Card>
  ),
};
