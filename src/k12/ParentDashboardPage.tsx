import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Check,
  Clock,
  Flame,
  LogIn,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import { SUBJECTS, SubjectId, gradeLabel } from '../data/k12Subjects';
import { DIFFICULTY_CONFIGS, DifficultyLevel, GRADE_6_CATEGORIES } from '../apps/mathgenius/types';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import {
  type GuardianLink,
  isValidEmailAddress,
  normalizeEmail,
} from './guardianLinks';
import {
  addStudentLink,
  fetchParentStudentLinks,
  removeGuardianLink,
} from './guardianLinkService';
import { DAILY_GOAL_TARGET, TITLES } from './rewards';
import {
  type ActivityType,
  type StudentActivityRecord,
  type StudentProgressSummary,
} from './studentProgress';
import {
  type LinkedStudentProgressResult,
  fetchLinkedStudentProgress,
} from './studentProgressService';
import { BackLink } from './SubjectPage';
import { THEME, replaceQuery } from './ui';
import UserAvatar from './UserAvatar';

type FilterTab = 'all' | ActivityType;

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'practice', label: '学科练习' },
  { id: 'wordsmith', label: 'Wordsmith' },
  { id: 'mathgenius', label: 'MathGenius' },
  { id: 'humanity', label: '人文闯关' },
  { id: 'essay', label: '命题作文' },
];

const ACTIVITY_TYPE_BADGE: Record<ActivityType, { label: string; badgeClass: string }> = {
  practice: { label: '学科练习', badgeClass: 'bg-sky-100 text-sky-900' },
  wordsmith: { label: 'Wordsmith', badgeClass: 'bg-rose-100 text-rose-900' },
  mathgenius: { label: 'MathGenius', badgeClass: 'bg-indigo-100 text-indigo-900' },
  humanity: { label: '人文闯关', badgeClass: 'bg-amber-100 text-amber-900' },
  essay: { label: '命题作文', badgeClass: 'bg-emerald-100 text-emerald-900' },
};

function formatDateTime(ts: number | null | undefined): string {
  if (!ts || !Number.isFinite(ts) || ts <= 0) return '暂无时间';
  const d = new Date(ts);
  const now = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) return `今天 ${hh}:${mm}`;
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  if (
    d.getFullYear() === yest.getFullYear() &&
    d.getMonth() === yest.getMonth() &&
    d.getDate() === yest.getDate()
  ) {
    return `昨天 ${hh}:${mm}`;
  }
  return `${d.getMonth() + 1}月${d.getDate()}日 ${hh}:${mm}`;
}

function formatDuration(durationSec: number | null): string | null {
  if (durationSec === null || durationSec === undefined || !Number.isFinite(durationSec)) return null;
  if (durationSec < 60) return `${durationSec}秒`;
  const m = Math.floor(durationSec / 60);
  const s = durationSec % 60;
  return s > 0 ? `${m}分${s}秒` : `${m}分钟`;
}

function resolveMathCategoryLabel(id: string): string {
  return GRADE_6_CATEGORIES.find((c) => c.id === id)?.labelZh || id;
}

function resolveMathDifficultyLabel(level: string): string {
  if (level in DIFFICULTY_CONFIGS) {
    return DIFFICULTY_CONFIGS[level as DifficultyLevel].labelZh;
  }
  return level;
}

function formatActivityScoreBadge(act: StudentActivityRecord): string {
  if (act.type === 'wordsmith') {
    return `${act.score}/${act.maxScore} 星 · ${act.accuracyPct}%`;
  }
  if (act.type === 'essay') {
    return `${act.score} 词（目标 ≥ ${act.maxScore}）`;
  }
  return `${act.score}/${act.maxScore} 题 · ${act.accuracyPct}%`;
}

export default function ParentDashboardPage({
  selectedStudentParam,
}: {
  selectedStudentParam?: string | null;
}) {
  const { user, loading: authLoading, needsSSOSync, signInWithGoogle } = useAuth();
  const { resolvedName } = useProfile();

  const [links, setLinks] = useState<GuardianLink[]>([]);
  const [linksLoading, setLinksLoading] = useState(false);
  const [linksError, setLinksError] = useState<string | null>(null);
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);

  const [progress, setProgress] = useState<LinkedStudentProgressResult | null>(null);
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressError, setProgressError] = useState<string | null>(null);

  const [filter, setFilter] = useState<FilterTab>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [studentEmailInput, setStudentEmailInput] = useState('');
  const [addBusy, setAddBusy] = useState(false);
  const [addMessage, setAddMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const loadLinks = useCallback(async () => {
    if (!user?.uid) {
      setLinks([]);
      setSelectedLinkId(null);
      return;
    }
    setLinksLoading(true);
    setLinksError(null);
    try {
      const fetched = await fetchParentStudentLinks(user.uid);
      setLinks(fetched);
      if (fetched.length === 0) {
        setShowAddForm(true);
      }
      setSelectedLinkId((prev) => {
        if (selectedStudentParam) {
          const normParam = normalizeEmail(selectedStudentParam);
          const matched = fetched.find(
            (l) =>
              l.studentEmail === normParam ||
              l.id === selectedStudentParam ||
              l.studentUid === selectedStudentParam
          );
          if (matched) return matched.id;
        }
        if (prev && fetched.some((l) => l.id === prev)) return prev;
        return fetched[0]?.id ?? null;
      });
    } catch (err) {
      console.warn('[ParentDashboardPage] Failed to load links:', err);
      setLinksError('加载绑定学生列表失败，请稍后刷新重试。');
    } finally {
      setLinksLoading(false);
    }
  }, [user?.uid, selectedStudentParam]);

  useEffect(() => {
    void loadLinks();
  }, [loadLinks]);

  const selectedLink = useMemo(
    () => links.find((l) => l.id === selectedLinkId) ?? links[0] ?? null,
    [links, selectedLinkId]
  );

  const loadSelectedProgress = useCallback(async (link: GuardianLink | null) => {
    if (!link) {
      setProgress(null);
      setProgressError(null);
      return;
    }
    if (!link.studentUid) {
      setProgress({ summary: null, activities: [] });
      setProgressError(null);
      return;
    }
    setProgressLoading(true);
    setProgressError(null);
    try {
      const result = await fetchLinkedStudentProgress(link);
      setProgress(result);
    } catch (err) {
      console.warn('[ParentDashboardPage] Failed to load student progress:', err);
      setProgress(null);
      setProgressError('读取该学生的学习档案受限或网络异常，请确认学生已完成最新登录同步。');
    } finally {
      setProgressLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSelectedProgress(selectedLink);
  }, [selectedLink, loadSelectedProgress]);

  const handleSelectStudent = (link: GuardianLink) => {
    setSelectedLinkId(link.id);
    setFilter('all');
    replaceQuery(['parent'], { student: link.studentEmail });
  };

  const handleRefresh = async () => {
    await loadLinks();
    if (selectedLink) {
      await loadSelectedProgress(selectedLink);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;
    const cleanEmail = normalizeEmail(studentEmailInput);
    if (!isValidEmailAddress(cleanEmail)) {
      setAddMessage({ kind: 'err', text: '请输入合法的学生邮箱地址。' });
      return;
    }
    if (user.email && normalizeEmail(user.email) === cleanEmail) {
      setAddMessage({ kind: 'err', text: '不能绑定当前登录的家长邮箱作为学生。' });
      return;
    }
    if (links.some((l) => l.studentEmail === cleanEmail)) {
      setAddMessage({ kind: 'err', text: '该学生邮箱已经在您的绑定列表中。' });
      return;
    }

    setAddBusy(true);
    setAddMessage(null);
    try {
      const created = await addStudentLink({
        parentUid: user.uid,
        parentEmail: user.email || '',
        parentName: resolvedName || user.displayName || '家长',
        studentEmail: cleanEmail,
      });
      setStudentEmailInput('');
      setAddMessage({
        kind: 'ok',
        text: `已添加 ${created.studentEmail}！学生使用该邮箱登录并开始练习后将自动同步进展。`,
      });
      setLinks((prev) => [created, ...prev]);
      setSelectedLinkId(created.id);
      replaceQuery(['parent'], { student: created.studentEmail });
    } catch (err) {
      console.warn('[ParentDashboardPage] Failed to add student:', err);
      setAddMessage({
        kind: 'err',
        text: '添加绑定失败，请确认您已使用已验证的 Google 邮箱登录。',
      });
    } finally {
      setAddBusy(false);
    }
  };

  const handleRemoveStudent = async (link: GuardianLink) => {
    const label = link.studentName || link.studentEmail;
    if (!window.confirm(`确定移除对「${label}」的督学绑定吗？`)) return;
    setRemovingId(link.id);
    try {
      await removeGuardianLink(link.id);
      const remaining = links.filter((l) => l.id !== link.id);
      setLinks(remaining);
      const next = remaining[0] ?? null;
      setSelectedLinkId(next?.id ?? null);
      if (next) {
        replaceQuery(['parent'], { student: next.studentEmail });
      } else {
        replaceQuery(['parent'], {});
        setShowAddForm(true);
      }
    } catch (err) {
      console.warn('[ParentDashboardPage] Failed to remove link:', err);
      setLinksError('移除学生绑定失败，请稍后重试。');
    } finally {
      setRemovingId(null);
    }
  };

  const summary: StudentProgressSummary | null = progress?.summary ?? null;
  const activities: StudentActivityRecord[] = progress?.activities ?? [];
  const filteredActivities = useMemo(
    () => (filter === 'all' ? activities : activities.filter((a) => a.type === filter)),
    [activities, filter]
  );

  const totalCompleted = useMemo(() => {
    if (!summary) return 0;
    return Object.values(summary.subjectStats).reduce(
      (sum, stat) => sum + (stat?.completedCount ?? 0),
      0
    );
  }, [summary]);

  if (authLoading) {
    return (
      <>
        <BackLink href="#/" />
        <p className="text-xl font-black mt-10">正在验证家长账号…</p>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <BackLink href="#/" />
        <div className="chunky bg-violet-100 p-8 mt-6 text-center">
          <div className="text-5xl mb-3" aria-hidden="true">
            👨‍👩‍👧
          </div>
          <h1 className="text-3xl font-black">家长督学看板</h1>
          <p className="font-bold text-slate-700 mt-2 max-w-md mx-auto">
            请先使用家长或教师的 Google 邮箱登录，即可绑定孩子的学习邮箱，查看各科掌握度、每日打卡、错题明细与作文内容。
          </p>
          <button
            type="button"
            onClick={() => void signInWithGoogle()}
            className="chunky bg-yellow-300 px-6 py-3 mt-6 inline-flex items-center gap-2 text-lg font-black"
          >
            <LogIn className="w-5 h-5" aria-hidden="true" />
            {needsSSOSync ? '同步 Google 登录' : '使用 Google 账号登录'}
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mt-2">
        <BackLink href="#/" />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setShowAddForm((v) => !v);
              setAddMessage(null);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border-[3px] border-ink bg-violet-200 hover:bg-violet-300 text-sm font-black transition-colors"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            绑定孩子学习邮箱
          </button>
          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={linksLoading || progressLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border-[3px] border-ink bg-white hover:bg-yellow-100 text-sm font-black disabled:opacity-50 transition-colors"
          >
            <RefreshCw
              className={`w-4 h-4 ${linksLoading || progressLoading ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            刷新数据
          </button>
        </div>
      </div>

      <div className="mt-5">
        <h1 className="text-3xl sm:text-4xl font-black">
          <span aria-hidden="true">👨‍👩‍👧 </span>家长督学看板
        </h1>
        <p className="font-bold text-slate-600 mt-1">
          查看绑定学生的各科练习记录、每日打卡、错题与造句点评
        </p>
      </div>

      {/* Add Student Form */}
      {showAddForm && (
        <form onSubmit={handleAddStudent} className="chunky bg-violet-50 p-5 mt-5">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="text-lg font-black">绑定孩子学习邮箱</h2>
            {links.length > 0 && (
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="p-1 rounded-full hover:bg-violet-200"
                aria-label="收起表单"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="text-xs font-bold text-slate-600 mb-3">
            输入孩子登录 Vanpower K12 使用的 Google 邮箱。添加后，当孩子在登录状态打开学习门户或完成一轮练习，系统将自动完成授权绑定并同步进展。
          </p>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="email"
              value={studentEmailInput}
              onChange={(e) => setStudentEmailInput(e.target.value)}
              placeholder="student@example.com"
              className="flex-1 px-4 py-2.5 rounded-2xl border-[3px] border-ink bg-white font-bold outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            />
            <button
              type="submit"
              disabled={addBusy}
              className="px-5 py-2.5 rounded-2xl border-[3px] border-ink bg-yellow-300 hover:bg-yellow-400 font-black disabled:opacity-50 shrink-0"
            >
              {addBusy ? '绑定中…' : '确认绑定'}
            </button>
          </div>
          {addMessage && (
            <p
              className={`mt-2.5 text-sm font-extrabold ${
                addMessage.kind === 'ok' ? 'text-emerald-700' : 'text-rose-600'
              }`}
            >
              {addMessage.text}
            </p>
          )}
        </form>
      )}

      {linksError && (
        <div className="mt-4 p-4 rounded-2xl border-[3px] border-ink bg-rose-100 text-rose-900 font-bold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
          <span>{linksError}</span>
        </div>
      )}

      {/* Child Switcher Pills */}
      {links.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-2.5">
          {links.map((link) => {
            const active = selectedLink?.id === link.id;
            const label = link.studentName || link.studentEmail;
            return (
              <div key={link.id} className="inline-flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleSelectStudent(link)}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border-[3px] border-ink font-black text-sm transition-colors ${
                    active ? 'bg-yellow-300 shadow-[3px_3px_0_var(--color-ink)]' : 'bg-white hover:bg-yellow-50'
                  }`}
                >
                  <UserAvatar
                    avatarId={link.studentAvatarId}
                    photoURL={link.studentPhotoURL}
                    displayName={label}
                    size="xs"
                  />
                  <span>{label}</span>
                  {!link.studentUid && (
                    <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-amber-100 border border-ink/30 text-amber-900">
                      待登录
                    </span>
                  )}
                </button>
              </div>
            );
          })}
          {selectedLink && (
            <button
              type="button"
              disabled={removingId === selectedLink.id}
              onClick={() => void handleRemoveStudent(selectedLink)}
              className="ml-auto inline-flex items-center gap-1 px-3 py-1.5 rounded-full border-2 border-rose-300 bg-white hover:bg-rose-50 text-xs font-extrabold text-rose-700 disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              移除绑定
            </button>
          )}
        </div>
      )}

      {/* No links yet */}
      {!linksLoading && links.length === 0 && (
        <div className="chunky bg-white p-8 mt-6 text-center">
          <div className="text-4xl mb-2" aria-hidden="true">
            📬
          </div>
          <h2 className="text-xl font-black">尚未绑定任何学生</h2>
          <p className="font-bold text-slate-600 mt-1">
            请在上方输入框填写孩子登录 Vanpower K12 使用的邮箱账号完成绑定。
          </p>
        </div>
      )}

      {/* Selected Student States */}
      {selectedLink && progressLoading && !summary && (
        <div className="chunky bg-white p-8 mt-6 text-center font-black text-lg">
          正在加载学习档案…
        </div>
      )}

      {selectedLink && progressError && (
        <div className="chunky bg-rose-50 p-6 mt-6 font-bold text-rose-800 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="font-black">暂时无法读取档案</p>
            <p className="text-sm mt-1">{progressError}</p>
          </div>
        </div>
      )}

      {selectedLink && !progressLoading && !progressError && !selectedLink.studentUid && (
        <div className="chunky bg-amber-100 p-7 mt-6">
          <div className="flex items-start gap-3">
            <span className="text-3xl" aria-hidden="true">
              ⏳
            </span>
            <div>
              <h2 className="text-xl font-black">等待孩子登录授权同步</h2>
              <p className="font-bold text-slate-700 mt-1.5 leading-relaxed">
                已成功登记学生邮箱 <span className="underline">{selectedLink.studentEmail}</span>。基于隐私安全保护，请让孩子使用该邮箱登录{' '}
                <span className="font-black">k12.vanpower.live</span>（或完成一轮练习），系统将自动回写授权标识并实时同步过往与后续练习明细。
              </p>
            </div>
          </div>
        </div>
      )}

      {selectedLink && !progressLoading && !progressError && selectedLink.studentUid && !summary && (
        <div className="chunky bg-white p-7 mt-6">
          <div className="flex items-start gap-3">
            <span className="text-3xl" aria-hidden="true">
              📭
            </span>
            <div>
              <h2 className="text-xl font-black">账号已关联，孩子暂未产生练习记录</h2>
              <p className="font-bold text-slate-600 mt-1">
                学生 {selectedLink.studentName || selectedLink.studentEmail} 已完成授权绑定。当孩子打开门户或完成任意学科练习后，学习进展与错题报告就会显示在这里。
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Full Student Dashboard */}
      {summary && (
        <>
          {/* Student Header Card */}
          <section aria-label="学生档案概览" className="chunky bg-white p-5 mt-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <UserAvatar
                  avatarId={summary.avatarId}
                  photoURL={summary.photoURL}
                  displayName={summary.displayName}
                  size="lg"
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-black truncate">{summary.displayName}</h2>
                    <span className="px-2.5 py-0.5 rounded-full border-2 border-ink bg-sky-100 text-xs font-black">
                      {gradeLabel(summary.grade)}
                    </span>
                    {(() => {
                      const titleDef =
                        TITLES.find((t) => t.id === summary.rewardsSummary.activeTitleId) ?? TITLES[0];
                      return (
                        <span className="px-2.5 py-0.5 rounded-full border-2 border-ink bg-yellow-200 text-xs font-black">
                          {titleDef.emoji} {titleDef.label}
                        </span>
                      );
                    })()}
                  </div>
                  <p className="text-sm font-bold text-slate-500 truncate mt-0.5">
                    {summary.studentEmail}
                  </p>
                </div>
              </div>
              <div className="text-right text-xs font-extrabold text-slate-600">
                <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 border-2 border-ink/20">
                  <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                  最近活跃：{formatDateTime(summary.lastActivityAt ?? summary.updatedAt)}
                </div>
              </div>
            </div>
          </section>

          {/* 4 KPI Cards */}
          <section aria-label="核心学习指标" className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mt-5">
            {(() => {
              const rs = summary.rewardsSummary;
              const doneCount =
                Number(rs.dailyTasks.practice) +
                Number(rs.dailyTasks.wordsmith) +
                Number(rs.dailyTasks.challenge);
              return (
                <>
                  <div className="chunky bg-emerald-100 p-4">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-extrabold text-emerald-900">今日打卡</span>
                      {rs.dailyGoalAwarded && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-300 border border-ink font-black">
                          达标 ({DAILY_GOAL_TARGET}+)
                        </span>
                      )}
                    </div>
                    <div className="text-2xl font-black mt-1 tabular-nums">{doneCount}/3</div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(
                        [
                          ['practice', '练习'],
                          ['wordsmith', '造句'],
                          ['challenge', '数/文'],
                        ] as const
                      ).map(([k, label]) => (
                        <span
                          key={k}
                          className={`text-[11px] px-1.5 py-0.5 rounded-md border font-extrabold ${
                            rs.dailyTasks[k]
                              ? 'bg-emerald-300 border-ink text-ink'
                              : 'bg-white/80 border-ink/30 text-slate-500'
                          }`}
                        >
                          {rs.dailyTasks[k] ? '✓' : '○'} {label}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="chunky bg-amber-100 p-4">
                    <span className="text-xs font-extrabold text-amber-900 inline-flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-orange-600" aria-hidden="true" />
                      连胜记录
                    </span>
                    <div className="text-2xl font-black mt-1 tabular-nums">
                      🔥 {rs.streakCurrent} 天
                    </div>
                    <div className="text-xs font-bold text-amber-900/80 mt-2">
                      历史最长 {rs.streakLongest} 天
                    </div>
                  </div>

                  <div className="chunky bg-yellow-100 p-4">
                    <span className="text-xs font-extrabold text-amber-900">能量币与心愿</span>
                    <div className="text-2xl font-black mt-1 tabular-nums">🪙 {rs.coins}</div>
                    <div className="text-xs font-bold text-slate-700 mt-2 flex flex-wrap items-center gap-1.5">
                      <span>{rs.xp} XP</span>
                      {rs.pendingRedemptionsCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-rose-200 border border-ink text-[11px] font-black text-rose-900">
                          {rs.pendingRedemptionsCount} 待核销
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="chunky bg-sky-100 p-4">
                    <span className="text-xs font-extrabold text-sky-900 inline-flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
                      累计完成练习
                    </span>
                    <div className="text-2xl font-black mt-1 tabular-nums">{totalCompleted} 轮</div>
                    <div className="text-xs font-bold text-sky-900/80 mt-2">
                      近期详情档案 {activities.length} 条
                    </div>
                  </div>
                </>
              );
            })()}
          </section>

          {/* 学科与专项掌握度区块 */}
          <section aria-label="学科与专项掌握度" className="mt-7">
            <h2 className="text-2xl font-black">学科与专项掌握度</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-3">
              {SUBJECTS.map((subj) => {
                const stat = summary.subjectStats[subj.id as SubjectId];
                const theme = THEME[subj.id];
                const count = stat?.completedCount ?? 0;
                const avg = stat?.avgAccuracyPct ?? 0;
                return (
                  <div key={subj.id} className={`chunky ${theme.soft} p-4`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-black text-lg">
                        <span aria-hidden="true">{subj.emoji}</span>
                        <span>{subj.name}</span>
                      </div>
                      <span className="text-xs font-black px-2 py-0.5 rounded-full bg-white border-2 border-ink">
                        {count} 轮
                      </span>
                    </div>
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs font-extrabold mb-1">
                        <span>平均掌握度 / 得分率</span>
                        <span className="tabular-nums">{count > 0 ? `${avg}%` : '--'}</span>
                      </div>
                      <div className="h-2.5 w-full rounded-full border-2 border-ink bg-white overflow-hidden">
                        <div
                          className={`h-full ${theme.solid} transition-all`}
                          style={{ width: `${count > 0 ? avg : 0}%` }}
                        />
                      </div>
                    </div>
                    <p className="text-xs font-bold text-slate-600 mt-2.5 truncate">
                      {stat?.lastTitle ? `最近：${stat.lastTitle}` : '暂无该科同步记录'}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* 专项统计卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-4">
              {/* Wordsmith */}
              <div className="chunky bg-rose-50 p-4">
                <h3 className="font-black text-base flex items-center gap-1.5">
                  <span aria-hidden="true">✍️</span> Wordsmith 造句专项
                </h3>
                {summary.wordsmithStats ? (
                  <div className="mt-2.5 space-y-1 text-sm font-bold text-slate-700">
                    <p>
                      累计练习：<span className="font-black text-ink">{summary.wordsmithStats.totalSessions} 场</span> ·{' '}
                      <span className="font-black text-ink">{summary.wordsmithStats.totalWords} 词</span>
                    </p>
                    <p>
                      平均评分：<span className="font-black text-rose-700">{summary.wordsmithStats.avgScore} / 5 星</span>
                    </p>
                  </div>
                ) : (
                  <p className="text-xs font-bold text-slate-500 mt-2.5">暂未开始 Wordsmith 造句</p>
                )}
              </div>

              {/* MathGenius */}
              <div className="chunky bg-sky-50 p-4">
                <h3 className="font-black text-base flex items-center gap-1.5">
                  <span aria-hidden="true">🚀</span> MathGenius 自适应
                </h3>
                {summary.mathGeniusProfile ? (
                  <div className="mt-2.5 space-y-1.5 text-sm font-bold text-slate-700">
                    <p>
                      当前难度：
                      <span className="ml-1 px-2 py-0.5 rounded-full bg-sky-200 border border-ink text-xs font-black text-ink">
                        {resolveMathDifficultyLabel(summary.mathGeniusProfile.currentDifficulty)}
                      </span>
                    </p>
                    <p>
                      累计闯关：<span className="font-black text-ink">{summary.mathGeniusProfile.totalQuizzesTaken} 次</span>
                    </p>
                    {summary.mathGeniusProfile.weakCategories.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        <span className="text-xs text-rose-700 font-black">待加强：</span>
                        {summary.mathGeniusProfile.weakCategories.map((wc) => (
                          <span
                            key={wc}
                            className="text-[11px] px-1.5 py-0.5 rounded-md bg-rose-100 border border-rose-300 text-rose-900 font-bold"
                          >
                            {resolveMathCategoryLabel(wc)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs font-bold text-slate-500 mt-2.5">暂未完成 MathGenius 闯关</p>
                )}
              </div>

              {/* Humanity */}
              <div className="chunky bg-amber-50 p-4">
                <h3 className="font-black text-base flex items-center gap-1.5">
                  <span aria-hidden="true">🏛️</span> 人文大闯关进度
                </h3>
                {summary.humanityProgress ? (
                  <div className="mt-2.5 space-y-2 text-xs font-extrabold">
                    {(
                      [
                        ['第一季·中华文明', summary.humanityProgress.s1],
                        ['第二季·华夏疆域', summary.humanityProgress.s2],
                        ['第三季·盛世诗章', summary.humanityProgress.s3],
                      ] as const
                    ).map(([label, lv]) => (
                      <div key={label}>
                        <div className="flex justify-between mb-0.5">
                          <span>{label}</span>
                          <span className="tabular-nums">第 {lv}/10 关</span>
                        </div>
                        <div className="h-2 rounded-full border border-ink bg-white overflow-hidden">
                          <div className="h-full bg-amber-400" style={{ width: `${lv * 10}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs font-bold text-slate-500 mt-2.5">暂未开启人文大闯关</p>
                )}
              </div>
            </div>
          </section>

          {/* 最近练习明细与回放 */}
          <section aria-label="最近练习明细" className="mt-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl font-black">最近练习明细与错题回放</h2>
              <span className="text-xs font-extrabold text-slate-500">
                共显示最近 {filteredActivities.length} 条记录
              </span>
            </div>

            <div role="group" aria-label="筛选练习类型" className="flex flex-wrap gap-2 mt-3">
              {FILTER_TABS.map((tab) => {
                const active = filter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setFilter(tab.id)}
                    className={`px-3.5 py-1.5 rounded-full border-[3px] border-ink text-xs sm:text-sm font-black transition-colors ${
                      active ? 'bg-yellow-300 shadow-[2px_2px_0_var(--color-ink)]' : 'bg-white hover:bg-yellow-50'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {filteredActivities.length === 0 ? (
              <div className="chunky bg-white p-6 mt-4 text-center font-bold text-slate-500">
                该分类下暂无已同步的练习明细。
              </div>
            ) : (
              <ul className="space-y-3 mt-4">
                {filteredActivities.map((act) => {
                  const typeMeta = ACTIVITY_TYPE_BADGE[act.type];
                  const durationStr = formatDuration(act.durationSec);
                  const hasDetails =
                    act.wordItems.length > 0 ||
                    act.questionItems.length > 0 ||
                    Boolean(act.aiFeedback) ||
                    Boolean(act.essayContent) ||
                    act.weakPoints.length > 0;

                  return (
                    <li key={act.id}>
                      <details className="group chunky bg-white">
                        <summary className="p-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2 min-w-0">
                              <span
                                className={`text-xs px-2.5 py-0.5 rounded-full border-2 border-ink font-black ${typeMeta.badgeClass}`}
                              >
                                {typeMeta.label}
                              </span>
                              <h3 className="font-black text-base sm:text-lg truncate">{act.title}</h3>
                            </div>
                            <span className="px-3 py-0.5 rounded-full border-2 border-ink bg-yellow-200 text-xs font-black tabular-nums shrink-0">
                              {formatActivityScoreBadge(act)}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-bold text-slate-600 mt-2">
                            <span>{formatDateTime(act.createdAt)}</span>
                            <span>{gradeLabel(act.grade)}</span>
                            {durationStr && <span>用时 {durationStr}</span>}
                            {act.difficulty && <span>难度：{resolveMathDifficultyLabel(act.difficulty)}</span>}
                            {hasDetails && (
                              <span className="ml-auto text-violet-700 font-black group-open:hidden">
                                点击展开答题与点评详情 ▼
                              </span>
                            )}
                          </div>
                          {act.summary && (
                            <p className="text-sm font-bold text-slate-700 mt-2">{act.summary}</p>
                          )}
                        </summary>

                        {hasDetails && (
                          <div className="px-4 pb-4 pt-2 border-t-2 border-slate-100 space-y-4">
                            {/* Weak Points */}
                            {act.weakPoints.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-xs font-black text-rose-700">需重点巩固：</span>
                                {act.weakPoints.map((wp) => (
                                  <span
                                    key={wp}
                                    className="text-xs px-2 py-0.5 rounded-full bg-rose-100 border border-rose-300 text-rose-900 font-bold"
                                  >
                                    {wp}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* AI Feedback */}
                            {act.aiFeedback && (
                              <div className="rounded-2xl border-2 border-ink bg-sky-50 p-3.5">
                                <div className="text-xs font-black text-sky-900 mb-1">🤖 AI 学习点评</div>
                                <p className="text-sm font-semibold text-slate-800 whitespace-pre-line leading-relaxed">
                                  {act.aiFeedback}
                                </p>
                              </div>
                            )}

                            {/* Wordsmith Items */}
                            {act.wordItems.length > 0 && (
                              <div className="space-y-2.5">
                                <div className="text-xs font-black text-slate-600">
                                  单词造句逐题回放（共 {act.wordItems.length} 词）
                                </div>
                                {act.wordItems.map((item, idx) => (
                                  <div
                                    key={`${item.word}-${idx}`}
                                    className="rounded-2xl border-2 border-ink/80 bg-rose-50/50 p-3 space-y-1.5"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-black text-base">
                                        {idx + 1}. {item.word}
                                        {item.partOfSpeech && (
                                          <span className="ml-1.5 text-xs font-bold text-slate-500">
                                            ({item.partOfSpeech})
                                          </span>
                                        )}
                                      </span>
                                      <span className="text-xs font-black px-2 py-0.5 rounded-full bg-amber-200 border border-ink">
                                        {'★'.repeat(item.score)}
                                        {'☆'.repeat(Math.max(0, 5 - item.score))} ({item.score}/5)
                                      </span>
                                    </div>
                                    <p className="text-sm font-bold text-ink">
                                      孩子造句：<span className="font-semibold">{item.userSentence || '（未填写）'}</span>
                                    </p>
                                    {item.feedback && (
                                      <p className="text-xs font-semibold text-slate-700">
                                        点评：{item.feedback}
                                      </p>
                                    )}
                                    {item.correction && (
                                      <p className="text-xs font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-1.5 rounded-xl">
                                        建议表达：{item.correction}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Question Items */}
                            {act.questionItems.length > 0 && (
                              <div className="space-y-2">
                                <div className="text-xs font-black text-slate-600">
                                  逐题作答明细（共 {act.questionItems.length} 题）
                                </div>
                                {act.questionItems.map((qItem, idx) => (
                                  <div
                                    key={idx}
                                    className={`rounded-2xl border-2 p-3 text-sm ${
                                      qItem.isCorrect
                                        ? 'border-emerald-300 bg-emerald-50/60'
                                        : 'border-rose-300 bg-rose-50/70'
                                    }`}
                                  >
                                    <div className="flex items-start gap-2">
                                      <span
                                        className={`mt-0.5 w-5 h-5 shrink-0 rounded-full border-2 border-ink grid place-items-center ${
                                          qItem.isCorrect ? 'bg-emerald-300' : 'bg-rose-300'
                                        }`}
                                      >
                                        {qItem.isCorrect ? (
                                          <Check className="w-3 h-3" aria-hidden="true" />
                                        ) : (
                                          <X className="w-3 h-3" aria-hidden="true" />
                                        )}
                                      </span>
                                      <div className="min-w-0 flex-1 space-y-1">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                          <span className="font-black">第 {idx + 1} 题</span>
                                          {qItem.category && (
                                            <span className="text-[11px] px-1.5 py-0.5 rounded bg-white border border-ink/30 font-bold text-slate-600">
                                              {resolveMathCategoryLabel(qItem.category)}
                                            </span>
                                          )}
                                          {qItem.attempts === 2 && (
                                            <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-200 border border-ink/40 font-black">
                                              二次改对
                                            </span>
                                          )}
                                          {qItem.usedHint && (
                                            <span className="text-[11px] px-1.5 py-0.5 rounded bg-sky-100 border border-ink/40 font-bold">
                                              查看了提示
                                            </span>
                                          )}
                                        </div>
                                        <p className="font-bold text-slate-900 whitespace-pre-line break-words">
                                          {qItem.question}
                                        </p>
                                        <p className="text-xs font-bold text-slate-700">
                                          作答：{qItem.userAnswer || '未作答'}
                                          {!qItem.isCorrect && qItem.correctAnswer && (
                                            <span className="ml-3 text-emerald-800 font-black">
                                              正确答案：{qItem.correctAnswer}
                                            </span>
                                          )}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Essay Content */}
                            {act.essayContent && (
                              <div className="rounded-2xl border-2 border-ink bg-yellow-50/70 p-4">
                                <div className="text-xs font-black text-amber-900 mb-1.5">📝 作文正文存档</div>
                                <p className="text-sm font-semibold text-slate-800 whitespace-pre-wrap leading-relaxed">
                                  {act.essayContent}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </details>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </>
  );
}
