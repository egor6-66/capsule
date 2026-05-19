import type { Meta, StoryObj } from 'storybook-solidjs-vite';

import { Button } from '../button';
import { Card } from '.';

const meta = {
  title: 'Components/Card',
  component: Card,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div class="max-w-md p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card>
      <Card.Header>
        <Card.Title>Capsule</Card.Title>
        <Card.Description>Hyper-Controlled Architecture</Card.Description>
      </Card.Header>
      <Card.Content>
        UI is a Shadow. Logic lives in Controller and Feature; UI is just a typed projection.
      </Card.Content>
      <Card.Footer class="gap-2">
        <Button variant="ghost" size="sm">
          Cancel
        </Button>
        <Button size="sm">Confirm</Button>
      </Card.Footer>
    </Card>
  ),
};

export const HeaderOnly: Story = {
  render: () => (
    <Card>
      <Card.Header>
        <Card.Title>Status</Card.Title>
        <Card.Description>All systems nominal.</Card.Description>
      </Card.Header>
    </Card>
  ),
};

export const ContentOnly: Story = {
  render: () => (
    <Card>
      <Card.Content>Card без header / footer — просто блок-обёртка.</Card.Content>
    </Card>
  ),
};

export const Stack: Story = {
  name: 'stack of cards',
  render: () => (
    <div class="flex flex-col gap-3">
      <Card>
        <Card.Header>
          <Card.Title class="text-sm">Capsules</Card.Title>
        </Card.Header>
        <Card.Content class="pt-0 text-xs text-muted-foreground">
          Active workspace capsules — auto-synced.
        </Card.Content>
      </Card>
      <Card>
        <Card.Header>
          <Card.Title class="text-sm">Open PRs</Card.Title>
        </Card.Header>
        <Card.Content class="pt-0 text-xs text-muted-foreground">
          3 ready for review, 1 draft.
        </Card.Content>
      </Card>
      <Card>
        <Card.Header>
          <Card.Title class="text-sm">System health</Card.Title>
        </Card.Header>
        <Card.Content class="pt-0 text-xs text-muted-foreground">
          All services nominal.
        </Card.Content>
      </Card>
    </div>
  ),
};
