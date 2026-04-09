import { createClient } from "@supabase/supabase-js";
import { Block } from "@/types/block";
import { SharedStudentListView } from "@/components/view/SharedStudentListView";

export const dynamic = "force-dynamic";

// DB 형식 → 앱 형식 변환 (useBlockSync의 dbToBlock과 동일)
function dbToBlock(row: any): Block {
  return {
    id: row.id,
    name: row.name || "",
    content: row.content || "",
    indent: row.indent || 0,
    isCollapsed: row.is_collapsed || false,
    isPinned: row.is_pinned || false,
    isDeleted: row.is_deleted || false,
    column: row.column || "inbox",
    properties: row.properties || [],
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
  };
}

function ErrorPage({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-4 opacity-50">🔒</div>
        <h1 className="text-xl font-bold mb-2">접근할 수 없음</h1>
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return <ErrorPage message="서비스가 준비되지 않았습니다." />;
  }

  // Next.js fetch 캐시 우회 — 새로고침 시 항상 최신 데이터를 받도록
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      fetch: (input, init = {}) =>
        fetch(input, { ...init, cache: "no-store" }),
    },
  });

  // 토큰 검증
  const { data: linkData, error: linkError } = await supabase
    .from("shared_links")
    .select("id, share_type, is_active")
    .eq("token", token)
    .single();

  if (linkError || !linkData) {
    return <ErrorPage message="유효하지 않은 공유 링크입니다." />;
  }

  if (!linkData.is_active) {
    return <ErrorPage message="이 공유 링크는 비활성화되었습니다." />;
  }

  // 전체 블록 로드
  const { data: blocksData, error: blocksError } = await supabase
    .from("blocks")
    .select("*")
    .order("sort_order", { ascending: true });

  if (blocksError || !blocksData) {
    return <ErrorPage message="데이터를 불러올 수 없습니다." />;
  }

  const blocks = blocksData.map(dbToBlock);

  return <SharedStudentListView blocks={blocks} />;
}
