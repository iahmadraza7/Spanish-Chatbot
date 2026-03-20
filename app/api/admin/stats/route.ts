import { NextResponse } from "next/server";
import { all, get, getSqliteDb } from "@/lib/sqlite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const db = await getSqliteDb();

  // Core counts
  const files = (await get<{ n: number }>(db, `SELECT COUNT(*) as n FROM files`)) ?? { n: 0 };
  const chunks = (await get<{ n: number }>(db, `SELECT COUNT(*) as n FROM chunks`)) ?? { n: 0 };
  const conversations = (await get<{ n: number }>(db, `SELECT COUNT(*) as n FROM conversations`)) ?? { n: 0 };

  // Messages today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const messagesToday = (await get<{ n: number }>(
    db,
    `SELECT COUNT(*) as n FROM conversations WHERE created_at >= ?`,
    [todayStart.toISOString()]
  )) ?? { n: 0 };

  // Escalated conversations
  const escalated = (await get<{ n: number }>(
    db,
    `SELECT COUNT(*) as n FROM conversations WHERE escalated = 1`
  )) ?? { n: 0 };

  // Recent questions (last 20 user messages)
  const recentQuestions = await all<{ content: string; created_at: string; session_id: string }>(
    db,
    `SELECT content, created_at, session_id FROM conversations
     WHERE role = 'user'
     ORDER BY created_at DESC
     LIMIT 20`
  );

  // Top 5 files used in answers (by counting source mentions)
  const answersWithSources = await all<{ sources: string }>(
    db,
    `SELECT sources FROM conversations
     WHERE role = 'assistant' AND sources IS NOT NULL AND sources != 'null'
     ORDER BY created_at DESC
     LIMIT 200`
  );

  const fileCounts: Record<string, number> = {};
  for (const row of answersWithSources as { sources: string }[]) {
    try {
      const srcs = JSON.parse(row.sources) as string[];
      for (const s of srcs) {
        fileCounts[s] = (fileCounts[s] ?? 0) + 1;
      }
    } catch { /* skip invalid */ }
  }
  const topFiles = Object.entries(fileCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  // Daily usage (last 7 days)
  const dailyUsage = await all<{ day: string; count: number }>(
    db,
    `SELECT DATE(created_at) as day, COUNT(*) as count
     FROM conversations
     WHERE created_at >= DATE('now', '-7 days')
     GROUP BY DATE(created_at)
     ORDER BY day ASC`
  );

  // Provider distribution
  const providers = await all<{ provider: string; count: number }>(
    db,
    `SELECT provider, COUNT(*) as count
     FROM conversations
     WHERE role = 'assistant' AND provider IS NOT NULL
     GROUP BY provider`
  );

  return NextResponse.json({
    ok: true,
    stats: {
      totalFiles: files.n,
      totalChunks: chunks.n,
      totalMessages: conversations.n,
      messagesToday: messagesToday.n,
      escalatedCount: escalated.n,
      recentQuestions: recentQuestions ?? [],
      topFiles,
      dailyUsage: dailyUsage ?? [],
      providers: providers ?? []
    }
  });
}
