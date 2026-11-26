import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { loadLocalDailyMistakes, type DailyMistakeEntry } from './dailyMistakes';
import DailyMistakesPanel from './DailyMistakesPanel';
import { type StudentActivityRecord } from './studentProgress';
import { fetchOwnRecentActivities } from './studentProgressService';
import { BackLink } from './SubjectPage';

export default function DailyMistakesPage() {
  const { user, loading: authLoading } = useAuth();
  const { resolvedName } = useProfile();

  const [activities, setActivities] = useState<StudentActivityRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [localMistakes, setLocalMistakes] = useState<DailyMistakeEntry[]>(() =>
    loadLocalDailyMistakes(user?.uid ?? null)
  );

  useEffect(() => {
    setLocalMistakes(loadLocalDailyMistakes(user?.uid ?? null));
    if (!user?.uid) {
      setActivities([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void fetchOwnRecentActivities(user.uid, 100)
      .then((list) => {
        if (!cancelled) setActivities(list);
      })
      .catch((err) => {
        console.warn('[DailyMistakesPage] Failed to load own activities:', err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  return (
    <>
      <BackLink href="#/" />
      <div className="mt-5">
        <h1 className="text-3xl font-black">
          <span aria-hidden="true">📕 </span>今日错题本
        </h1>
        <p className="font-bold text-slate-600 mt-1 text-sm">
          每答完一题都会自动同步保存错题（只读归档，随时回来对照订正）
        </p>
      </div>

      {(authLoading || loading) && activities.length === 0 ? (
        <div className="chunky bg-white p-6 mt-5 text-center font-black">
          正在加载你的今日错题记录…
        </div>
      ) : null}

      <DailyMistakesPanel
        activities={activities}
        studentName={resolvedName || user?.displayName || '同学'}
        extraLocalMistakes={localMistakes}
        heading="错题复盘清单"
        showAbortedAlert={false}
      />
    </>
  );
}
