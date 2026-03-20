import { Button } from '../button/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './card';
import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: 'UI/Card',
  component: Card,
} satisfies Meta<typeof Card>;

export default meta;

type Story = StoryObj<typeof Card>;

export const Default: Story = {
  render: () => (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Starter template</CardTitle>
        <CardDescription>Shared UI powered by shadcn-ui.</CardDescription>
      </CardHeader>
      <CardContent>
        Build consistent interfaces across apps and packages.
      </CardContent>
      <CardFooter>
        <Button size="sm">Learn more</Button>
      </CardFooter>
    </Card>
  ),
};
