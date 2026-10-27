import { STATUS_LABELS, type RestaurantStatus } from "@/modules/restaurants";
import { StatusChip } from "@/shared/ui/surface";

const tones = {
  pending: "warning",
  approved: "success",
  rejected: "error",
  suspended: "error",
  closed: "neutral",
} as const satisfies Record<RestaurantStatus, string>;

export function RestaurantStatusChip({ status }: { status: RestaurantStatus }) {
  return <StatusChip tone={tones[status]}>{STATUS_LABELS[status]}</StatusChip>;
}
