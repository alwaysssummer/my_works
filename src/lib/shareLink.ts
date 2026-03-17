import { supabase, isSupabaseConfigured } from "@/lib/supabase";

/**
 * 활성 공유 링크 조회 (재사용)
 */
export async function getActiveShareLink(): Promise<{ token: string } | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  const { data, error } = await supabase
    .from("shared_links")
    .select("token")
    .eq("share_type", "students")
    .eq("is_active", true)
    .limit(1)
    .single();

  if (error || !data) return null;
  return { token: data.token };
}

/**
 * 새 공유 링크 생성 (기존 활성 링크가 있으면 재사용)
 */
export async function createShareLink(): Promise<{ token: string } | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  // 기존 활성 링크가 있으면 재사용
  const existing = await getActiveShareLink();
  if (existing) return existing;

  const { data, error } = await supabase
    .from("shared_links")
    .insert({ share_type: "students" })
    .select("token")
    .single();

  if (error || !data) return null;
  return { token: data.token };
}

/**
 * 공유 링크 비활성화
 */
export async function deactivateShareLink(token: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false;

  const { error } = await supabase
    .from("shared_links")
    .update({ is_active: false })
    .eq("token", token);

  return !error;
}
