import type { JSX, ValidComponent } from 'solid-js';
import type { ISlotProps } from '../slot';

export type FlexDirection = 'row' | 'row-reverse' | 'col' | 'col-reverse';
export type FlexWrap = 'wrap' | 'nowrap' | 'wrap-reverse';
export type FlexAlign = 'start' | 'center' | 'end' | 'stretch' | 'baseline';
export type FlexJustify = 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
export type FlexGap = number | string;

/**
 * Собственные пропсы `<Flex>` — низкоуровневая Flexbox-обёртка. Числовые
 * варианты (`direction`/`wrap`/`align`/`justify`) маппятся в Tailwind-классы
 * (списки фиксированные → purge видит), а `gap` идёт inline-стилем, потому что
 * значение может быть произвольным числом или CSS-строкой.
 */
export interface IFlexOwnProps {
  /** `flex-direction`. `col` = `column` (короткая Tailwind-форма). */
  direction?: FlexDirection;
  wrap?: FlexWrap;
  /** `align-items`. */
  align?: FlexAlign;
  /** `justify-content`. */
  justify?: FlexJustify;
  /** `gap`. `number` × 0.25rem (как Tailwind), `string` — сырое значение. */
  gap?: FlexGap;
  /** Column gap. Override для `gap` по горизонтали. */
  gapX?: FlexGap;
  /** Row gap. Override для `gap` по вертикали. */
  gapY?: FlexGap;
  /** `display: inline-flex` вместо `flex`. */
  inline?: boolean;
  class?: string;
  style?: JSX.CSSProperties | string;
}

export type IFlexProps<T extends ValidComponent = 'div'> = ISlotProps<T> & IFlexOwnProps;
