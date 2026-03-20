import { Button } from './button';
import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: 'UI/Button',
  component: Button,
  args: {
    children: 'Button',
  },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof Button>;

export const Default: Story = {};
export const Secondary: Story = {
  args: {
    variant: 'secondary',
  },
};
