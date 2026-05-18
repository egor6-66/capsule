import type { Meta, StoryObj } from 'storybook-solidjs-vite';

import { Navigation } from '.';

const ITEMS = [
  { id: 1, label: 'Home', href: '#home', active: true },
  { id: 2, label: 'Docs', href: '#docs' },
  { id: 3, label: 'Pricing', href: '#pricing' },
  { id: 4, label: 'Contact', href: '#contact' },
];

const meta = {
  title: 'Components/Navigation',
  component: Navigation,
  tags: ['autodocs'],
  argTypes: {
    orientation: { control: 'inline-radio', options: ['horizontal', 'vertical'] },
  },
  args: { orientation: 'horizontal' },
  decorators: [
    (Story) => (
      <div class="p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Navigation>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  name: 'horizontal',
  render: () => (
    <Navigation orientation="horizontal">
      <Navigation.List orientation="horizontal" items={ITEMS}>
        {(item) => (
          <Navigation.Item href={item.href} active={item.active}>
            {item.label}
          </Navigation.Item>
        )}
      </Navigation.List>
    </Navigation>
  ),
};

export const Vertical: Story = {
  name: 'vertical',
  decorators: [
    (Story) => (
      <div class="w-48 p-4">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <Navigation orientation="vertical">
      <Navigation.List orientation="vertical" items={ITEMS}>
        {(item) => (
          <Navigation.Item href={item.href} active={item.active}>
            {item.label}
          </Navigation.Item>
        )}
      </Navigation.List>
    </Navigation>
  ),
};

export const Disabled: Story = {
  name: 'with disabled item',
  render: () => (
    <Navigation orientation="horizontal">
      <Navigation.List
        orientation="horizontal"
        items={[
          { id: 1, label: 'Active', href: '#a', active: true },
          { id: 2, label: 'Available', href: '#b' },
          { id: 3, label: 'Locked', href: '#c', disabled: true },
        ]}
      >
        {(item) => (
          <Navigation.Item href={item.href} active={item.active} disabled={item.disabled}>
            {item.label}
          </Navigation.Item>
        )}
      </Navigation.List>
    </Navigation>
  ),
};
