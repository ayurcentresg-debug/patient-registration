/**
 * AyurGate Design System — Barrel exports
 *
 * Usage:
 *   import { Button, Input, Card, Badge, EmptyState } from "@/components/ui";
 */

export { default as Button } from "./Button";
export type { ButtonProps, ButtonVariant, ButtonSize } from "./Button";

export { default as Input } from "./Input";
export type { InputProps } from "./Input";

export { default as Card, CardHeader, CardBody, CardFooter, CardKPI } from "./Card";
export type { CardProps } from "./Card";

export { default as Badge, StatusDot, CounterBadge } from "./Badge";
export type {
  BadgeProps,
  StatusVariant,
  ModuleVariant,
  StatusDotState,
} from "./Badge";

export { default as EmptyState } from "./EmptyState";
export type { EmptyStateProps } from "./EmptyState";
