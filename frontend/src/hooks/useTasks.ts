import { useQuery } from "@tanstack/react-query";
import { listTasks } from "@/lib/api/tasks";

export const TASKS_KEY = ["tasks"] as const;

export function useTasks() {
  return useQuery({ queryKey: TASKS_KEY, queryFn: listTasks });
}
