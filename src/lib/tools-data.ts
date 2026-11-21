import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { ToolParam } from "@/lib/tool-request";

export type Tool = Tables<"tools">;

export function toolParams(tool: Pick<Tool, "params">): ToolParam[] {
  return Array.isArray(tool.params) ? (tool.params as unknown as ToolParam[]) : [];
}

const sortTools = (a: Tool, b: Tool) => a.sort_order - b.sort_order || a.name.localeCompare(b.name);

/** Public catalogue: every active tool (RLS hides inactive ones from visitors). */
export const toolsQueryOptions = queryOptions({
  queryKey: ["tools", "public"],
  queryFn: async (): Promise<Tool[]> => {
    const { data, error } = await supabase.from("tools").select("*").eq("is_active", true);
    if (error) throw new Error(error.message);
    return (data ?? []).sort(sortTools);
  },
  staleTime: 60_000,
});

/** Admin catalogue: includes inactive tools (RLS allows it only for admins). */
export const adminToolsQueryOptions = queryOptions({
  queryKey: ["tools", "admin"],
  queryFn: async (): Promise<Tool[]> => {
    const { data, error } = await supabase.from("tools").select("*");
    if (error) throw new Error(error.message);
    return (data ?? []).sort(sortTools);
  },
});

export function topLevelTools(tools: Tool[]): Tool[] {
  return tools.filter((t) => !t.parent_id);
}

export function childrenOf(tools: Tool[], parentId: string): Tool[] {
  return tools.filter((t) => t.parent_id === parentId);
}
