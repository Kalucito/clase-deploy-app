import { useQuery } from "@tanstack/react-query";
import { listLabels } from "@/lib/api/labels";

export const LABELS_KEY = ["labels"] as const;

export function useLabels() {
  return useQuery({ queryKey: LABELS_KEY, queryFn: listLabels });
}
