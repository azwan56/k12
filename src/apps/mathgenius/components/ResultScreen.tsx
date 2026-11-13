import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  X,
  Lightbulb,
  Loader2,
  Download,
  Share2,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Award,
  Send,
  Timer
} from 'lucide-react';
import { toCanvas } from 'html-to-image';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../../../hooks/useAuth';
import { db } from '../../../lib/firebase';
import { sendToDiscord } from '../services/discordService';
import { QuizResult, Question, UserAnswer, DIFFICULTY_CONFIGS } from '../types';
import { BackButton, DIFF_EMOJI } from './ui';

interface Props {
  results: QuizResult;
  questions: Question[];
  isFeedbackLoading: boolean;
  language: 'en' | 'zh';
  onRetry: () => void;
  onDone: () => void;
}

const formatTime = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  return `${Math.floor(totalSeconds / 60)}m ${totalSeconds % 60}s`;
};

function ReviewItem({ question, idx, ans }: { question: Question; idx: number; ans?: UserAnswer }) {
  const correct = !!ans?.isCorrect;
  const corrected = correct && ans?.attempts === 2;
  return (
    <li>
      <details className="group bg-white rounded-3xl border-[3px] border-ink">
        <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
          <span
            className={`w-8 h-8 shrink-0 rounded-full border-[3px] border-ink grid place-items-center ${
              correct ? (corrected ? 'bg-amber-200' : 'bg-emerald-200') : 'bg-rose-200'
            }`}
          >
            {correct ? <Check className="w-4 h-4" aria-hidden="true" /> : <X className="w-4 h-4" aria-hidden="true" />}
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-black text-slate-600">
              {idx + 1}. {correct ? (corrected ? '提示后改对' : '一次答对') : '未答对'}
            </span>
            <span className="block font-bold truncate">{question.question}</span>
          </span>
        </summary>
        <div className="px-4 pb-4 space-y-2 font-semibold">
          <p className="whitespace-pre-line break-words">{question.question}</p>
          <p>
            <span className="font-black">你的答案：</span>
            {ans?.firstAttemptAnswer && ans.firstAttemptAnswer !== ans.answer ? (
              <>
                <span className="line-through text-slate-600">{ans.firstAttemptAnswer}</span> → {ans.answer}
              </>
            ) : (
              ans?.answer || '未作答'
            )}
          </p>
          {!correct && (
            <p>
              <span className="font-black">正确答案：</span>
              {question.correctAnswer}
            </p>
          )}
          <p className="bg-sky-100 text-ink rounded-2xl px-3 py-2 whitespace-pre-line break-words">{question.explanation}</p>
        </div>
      </details>
    </li>
  );
}

export default function ResultScreen({ results, questions, isFeedbackLoading, language, onRetry, onDone }: Props) {
  const { user } = useAuth();
  const reportRef = useRef<HTMLDivElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [reportStatus, setReportStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [reportError, setReportError] = useState('');
  const autoSentRef = useRef(false);

  const percentage = (results.score / results.totalQuestions) * 100;
  const correctedCount = useMemo(
    () => results.answers.filter((a) => a.isCorrect && a.attempts === 2).length,
    [results.answers]
  );
  const wrongTopics = useMemo(
    () =>
      Array.from(
        new Set(
          results.answers
            .filter((a) => !a.isCorrect)
            .map((a) => questions.find((q) => q.id === a.questionId)?.category || '核心考点')
        )
      ),
    [results.answers, questions]
  );
  const rec = results.levelRecommendation;

  const generateImageCanvas = async (): Promise<HTMLCanvasElement | null> => {
    if (!reportRef.current) return null;
    setIsCapturing(true);
    try {
      await new Promise((r) => setTimeout(r, 150));
      return await toCanvas(reportRef.current, { pixelRatio: 2, backgroundColor: '#FFF8EC' });
    } catch (error) {
      console.error('Failed to capture results:', error);
      return null;
    } finally {
      setIsCapturing(false);
    }
  };

  // Auto-send the report to the guardian / Discord webhook once (same logic as the original app).
  // Waits for the AI feedback so the image includes it.
  useEffect(() => {
    if (!user || autoSentRef.current) return;
    if (isFeedbackLoading || !results.feedback) return;
    autoSentRef.current = true;

    const autoSendReport = async () => {
      setReportStatus('sending');
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const profile = userDoc.exists() ? userDoc.data() : null;
        if (!profile || (!profile.discordWebhookUrl && !profile.guardianEmail)) {
          setReportStatus('idle');
          return;
        }

        const canvas = await generateImageCanvas();
        if (!canvas) {
          setReportStatus('error');
          setReportError('Screenshot failed');
          return;
        }
        const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
        if (!blob) throw new Error('Blob conversion failed');

        let targetWebhookUrl = profile.discordWebhookUrl;
        let senderName = profile.name || user.email?.split('@')[0] || 'Unknown Student';

        if (profile.guardianEmail) {
          const q = query(collection(db, 'users'), where('email', '==', profile.guardianEmail));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const guardianData = snap.docs[0].data();
            if (guardianData.discordWebhookUrl) {
              targetWebhookUrl = guardianData.discordWebhookUrl;
              senderName = `${senderName} (Student Link)`;
            } else if (!targetWebhookUrl) {
              throw new Error('Guardian found, but they have no Discord Webhook setup.');
            }
          } else if (!targetWebhookUrl) {
            throw new Error('Guardian email not found in Vanpower system.');
          }
        }

        if (!targetWebhookUrl) throw new Error('No valid webhook found.');

        const result = await sendToDiscord(targetWebhookUrl, blob, senderName);
        if (!result.success) throw new Error(result.error || 'Unknown error');
        setReportStatus('success');
      } catch (e: any) {
        console.error('Webhook processing error:', e);
        setReportStatus('error');
        setReportError(e?.message || 'Unknown processing error');
      }
    };

    autoSendReport();
  }, [user, isFeedbackLoading, results.feedback]);

  const handleSaveImage = async () => {
    const canvas = await generateImageCanvas();
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `MathGenius-Grade6-Result-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleShare = async () => {
    const canvas = await generateImageCanvas();
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], 'MathResult.png', { type: 'image/png' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'My MathGenius Grade 6 Result',
            text: `I scored ${results.score}/${results.totalQuestions} on MathGenius in ${formatTime(results.timeTaken)}!`
          });
        } catch (error: any) {
          if (error?.name !== 'AbortError') handleSaveImage();
        }
      } else {
        handleSaveImage();
      }
    }, 'image/png');
  };

  return (
    <>
      <BackButton onClick={onDone} />

      <div ref={reportRef} className="mt-6 space-y-5 p-1">
        {/* Score */}
        <div className="chunky bg-sky-100 p-6 sm:p-8 text-center">
          <div className="text-6xl" aria-hidden="true">
            {percentage === 100 ? '🏆' : percentage >= 80 ? '🎉' : percentage >= 50 ? '👍' : '💪'}
          </div>
          <p className="text-5xl font-black mt-3">
            {results.score} / {results.totalQuestions}
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-4 text-sm font-extrabold">
            {results.difficulty && (
              <span className="bg-white border-2 border-ink px-3 py-0.5 rounded-full">
                <span aria-hidden="true">{DIFF_EMOJI[results.difficulty]}</span>{' '}
                {DIFFICULTY_CONFIGS[results.difficulty].shortLabelZh}
              </span>
            )}
            <span className="bg-white border-2 border-ink px-3 py-0.5 rounded-full inline-flex items-center gap-1">
              <Timer className="w-3.5 h-3.5" aria-hidden="true" /> {formatTime(results.timeTaken)}
            </span>
            {correctedCount > 0 && (
              <span className="bg-amber-200 border-2 border-ink px-3 py-0.5 rounded-full inline-flex items-center gap-1">
                <Lightbulb className="w-3.5 h-3.5" aria-hidden="true" /> {correctedCount} 题提示后改对
              </span>
            )}
          </div>
          <p className="text-xs font-bold text-slate-600 mt-3">{results.date}</p>
        </div>

        {/* AI feedback */}
        <div className="bg-white rounded-3xl border-[3px] border-ink p-5" aria-live="polite">
          <p className="text-sm font-black text-sky-800">老师评语</p>
          {results.feedback ? (
            <p className="mt-1 text-lg font-bold leading-relaxed">{results.feedback}</p>
          ) : (
            <p className="mt-1 font-bold text-slate-600 flex items-center gap-2">
              <Loader2 className="w-5 h-5 motion-safe:animate-spin" aria-hidden="true" />
              老师正在写评语…
            </p>
          )}
        </div>

        {/* Level change */}
        {rec && (
          <div className="bg-white rounded-3xl border-[3px] border-ink p-5 flex items-start gap-3">
            <span
              className={`w-10 h-10 shrink-0 rounded-2xl border-[3px] border-ink grid place-items-center ${
                rec.action === 'promoted' ? 'bg-emerald-200' : rec.action === 'demoted' ? 'bg-amber-200' : 'bg-sky-200'
              }`}
            >
              {rec.action === 'promoted' ? (
                <TrendingUp className="w-5 h-5" aria-hidden="true" />
              ) : rec.action === 'demoted' ? (
                <TrendingDown className="w-5 h-5" aria-hidden="true" />
              ) : (
                <Award className="w-5 h-5" aria-hidden="true" />
              )}
            </span>
            <div className="min-w-0">
              <p className="font-black">
                {DIFFICULTY_CONFIGS[rec.previousLevel].shortLabelZh} → {DIFFICULTY_CONFIGS[rec.newLevel].shortLabelZh}
              </p>
              <p className="font-semibold text-slate-700 mt-0.5">{language === 'zh' ? rec.reasonZh : rec.reasonEn}</p>
            </div>
          </div>
        )}

        {/* Weak topics */}
        {wrongTopics.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-black">下次加练：</span>
            {wrongTopics.map((t) => (
              <span key={t} className="bg-amber-100 text-amber-800 font-bold px-3 py-1 rounded-full">
                {t}
              </span>
            ))}
          </div>
        )}

        {/* Review */}
        <div>
          <h2 className="text-xl font-black">逐题回顾</h2>
          <ul className="mt-3 space-y-2.5">
            {questions.map((q, idx) => (
              <ReviewItem key={q.id} question={q} idx={idx} ans={results.answers.find((a) => a.questionId === q.id)} />
            ))}
          </ul>
        </div>
      </div>

      {/* Report status + image actions */}
      <div className="flex flex-wrap items-center gap-2.5 mt-6">
        {reportStatus === 'sending' && (
          <span className="inline-flex items-center gap-1.5 font-bold text-slate-700" role="status">
            <Loader2 className="w-4 h-4 motion-safe:animate-spin" aria-hidden="true" /> 正在发送报告…
          </span>
        )}
        {reportStatus === 'success' && (
          <span className="inline-flex items-center gap-1.5 font-bold text-emerald-800" role="status">
            <Send className="w-4 h-4" aria-hidden="true" /> 报告已发送
          </span>
        )}
        {reportStatus === 'error' && (
          <span className="inline-flex items-center gap-1.5 font-bold text-rose-800" role="status" title={reportError}>
            <X className="w-4 h-4" aria-hidden="true" /> 报告发送失败
          </span>
        )}
        <span className="flex-1" />
        <button
          type="button"
          onClick={handleSaveImage}
          disabled={isCapturing}
          className="px-4 py-2 rounded-full border-[3px] border-ink bg-white font-extrabold inline-flex items-center gap-1.5 hover:bg-yellow-50 disabled:opacity-50"
        >
          <Download className="w-4 h-4" aria-hidden="true" /> 存图
        </button>
        <button
          type="button"
          onClick={handleShare}
          disabled={isCapturing}
          className="px-4 py-2 rounded-full border-[3px] border-ink bg-white font-extrabold inline-flex items-center gap-1.5 hover:bg-yellow-50 disabled:opacity-50"
        >
          <Share2 className="w-4 h-4" aria-hidden="true" /> 分享
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-6">
        <button
          type="button"
          onClick={onRetry}
          className="chunky bg-white py-4 text-xl font-black flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-5 h-5" aria-hidden="true" /> 再来一次
        </button>
        <button type="button" onClick={onDone} className="chunky bg-yellow-300 py-4 text-xl font-black">
          完成
        </button>
      </div>

      {isCapturing && (
        <div className="fixed inset-0 z-50 bg-white/70 grid place-items-center" role="status">
          <div className="chunky bg-white px-6 py-5 flex items-center gap-3 font-black">
            <Loader2 className="w-6 h-6 motion-safe:animate-spin" aria-hidden="true" /> 生成图片中…
          </div>
        </div>
      )}
    </>
  );
}
