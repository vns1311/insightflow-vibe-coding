import { useQuery } from "@tanstack/react-query";

import { api } from "../lib/api";
import type { Project } from "../lib/types";

export function useProjects() {
  return useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: api.getProjects,
  });
}
