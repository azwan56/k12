import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, MessageSquare, Loader2, Link2, Users, Gift, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { isValidDiscordWebhookUrl } from '../lib/security';
import { collection, doc as firestoreDoc, getDoc as firestoreGetDoc, setDoc as firestoreSetDoc, updateDoc as firestoreUpdateDoc, query, where, getDocs } from 'firebase/firestore';
import { useRewards } from '../hooks/useRewards';

interface ConsoleModalProps {
    isOpen: boolean;
    onClose: () => void;
    isDarkMode: boolean;
}

const ConsoleModal: React.FC<ConsoleModalProps> = ({ isOpen, onClose, isDarkMode }) => {
    const [webhookUrl, setWebhookUrl] = useState('');
    const [guardianEmail, setGuardianEmail] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error' | 'invalid_webhook'>('idle');
    const [connectedStudents, setConnectedStudents] = useState<any[]>([]);
    const { rewards, resolveRedemption, addWish, removeWish } = useRewards();
    const [newWishEmoji, setNewWishEmoji] = useState('🎁');
    const [newWishTitle, setNewWishTitle] = useState('');
    const [newWishCost, setNewWishCost] = useState('100');

    useEffect(() => {
        if (!isOpen) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [isOpen, onClose]);

    useEffect(() => {
        if (isOpen && auth.currentUser) {
            loadUserData();
        } else if (isOpen) {
            // If auth is not ready but modal is open, wait and see
            const unsubscribe = auth.onAuthStateChanged((user) => {
                if (user) {
                    loadUserData();
                } else {
                    setIsLoading(false);
                }
            });
            return () => unsubscribe();
        }
    }, [isOpen, auth.currentUser?.uid]);

    // Helper strictly for Firestore calls that might hang
    const withTimeout = <T,>(promise: Promise<T>, ms: number = 5000): Promise<T> => {
        return new Promise<T>((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error('Firestore timeout'));
            }, ms);

            promise
                .then(result => {
                    clearTimeout(timer);
                    resolve(result);
                })
                .catch(err => {
                    clearTimeout(timer);
                    reject(err);
                });
        });
    };

    const loadUserData = async () => {
        setIsLoading(true);
        try {
            if (!auth.currentUser) return;
            const userRef = firestoreDoc(db, 'users', auth.currentUser.uid);

            const userSnap = await firestoreGetDoc(userRef) as any;

            if (userSnap.exists()) {
                const data = userSnap.data();
                setWebhookUrl(data.discordWebhookUrl || '');
                setGuardianEmail(data.guardianEmail || '');
            } else {
                const fallbackName = auth.currentUser.displayName || (auth.currentUser.email ? auth.currentUser.email.split('@')[0] : 'User');
                // Initialize user document if it doesn't exist
                await firestoreSetDoc(userRef, {
                    uid: auth.currentUser.uid,
                    email: auth.currentUser.email,
                    name: fallbackName,
                    discordWebhookUrl: '',
                    guardianEmail: '',
                    createdAt: Date.now()
                });
            }

            // Fetch Connected Students
            if (auth.currentUser.email) {
                const usersRef = collection(db, 'users');
                const q = query(usersRef, where('guardianEmail', '==', auth.currentUser.email));
                const querySnapshot = await getDocs(q);
                const students: any[] = [];
                querySnapshot.forEach((doc) => {
                    students.push({ id: doc.id, ...doc.data() });
                });
                setConnectedStudents(students);
            }
        } catch (error) {
            console.error("Error loading user data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!auth.currentUser) return;
        const trimmedWebhook = webhookUrl.trim();
        if (trimmedWebhook && !isValidDiscordWebhookUrl(trimmedWebhook)) {
            setSaveStatus('invalid_webhook');
            return;
        }
        setIsSaving(true);
        setSaveStatus('idle');

        try {
            const userRef = firestoreDoc(db, 'users', auth.currentUser.uid);
            await firestoreUpdateDoc(userRef, {
                discordWebhookUrl: trimmedWebhook,
                guardianEmail: guardianEmail.trim()
            });
            setWebhookUrl(trimmedWebhook);
            setSaveStatus('success');
            setTimeout(() => setSaveStatus('idle'), 3000);
        } catch (error) {
            console.error("Error saving webhook:", error);
            setSaveStatus('error');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                {/* Modal Content */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className={`relative w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${isDarkMode ? 'bg-zinc-900 border border-white/10' : 'bg-white border border-black/10'
                        }`}
                >
                    {/* Header */}
                    <div className={`flex items-center justify-between p-6 border-b ${isDarkMode ? 'border-white/10' : 'border-black/5'
                        }`}>
                        <h2 className={`text-2xl font-display font-bold ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>
                            控制台 (Console)
                        </h2>
                        <button
                            onClick={onClose}
                            className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-white/10 text-zinc-400 hover:text-white' : 'hover:bg-black/5 text-zinc-500 hover:text-zinc-900'
                                }`}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6 overflow-y-auto flex-1">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-12">
                                <Loader2 className={`w-8 h-8 animate-spin mb-4 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                                <p className={`${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Loading settings...</p>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {/* Integration Card: Discord Webhook */}
                                <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-zinc-50 border-black/10'
                                    }`}>
                                    <div className="flex items-start gap-4 mb-6">
                                        <div className="p-3 bg-[#5865F2] rounded-lg text-white shadow-md">
                                            <MessageSquare className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>
                                                Discord Webhook Integration
                                            </h3>
                                            <p className={`text-sm mt-1 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                                                Connect your Vanpower account to Discord. Whenever you finish a practice session (e.g., in WordSmith), your performance report will be automatically sent to the configured channel.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className={`block text-sm font-medium ${isDarkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
                                            Discord Webhook URL
                                        </label>
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <input
                                                type="text"
                                                value={webhookUrl}
                                                onChange={(e) => setWebhookUrl(e.target.value)}
                                                placeholder="https://discord.com/api/webhooks/..."
                                                className={`flex-1 px-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-[#5865F2] focus:border-transparent outline-none transition-all ${isDarkMode
                                                    ? 'bg-zinc-950 border-white/10 text-white placeholder-zinc-600'
                                                    : 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400'
                                                    }`}
                                            />
                                            <button
                                                onClick={handleSave}
                                                disabled={isSaving}
                                                className="px-6 py-2.5 bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 min-w-[120px]"
                                            >
                                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                {isSaving ? 'Saving...' : 'Save'}
                                            </button>
                                        </div>
                                        {saveStatus === 'success' && (
                                            <p className="text-emerald-500 text-sm flex items-center gap-1 mt-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                                                Webhook saved successfully!
                                            </p>
                                        )}
                                        {saveStatus === 'error' && (
                                            <p className="text-rose-500 text-sm flex items-center gap-1 mt-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block"></span>
                                                Failed to save webhook.
                                            </p>
                                        )}
                                        {saveStatus === 'invalid_webhook' && (
                                            <p className="text-rose-500 text-sm flex items-center gap-1 mt-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block"></span>
                                                请输入合法的 Discord HTTPS Webhook 地址（https://discord.com/api/webhooks/...）。
                                            </p>
                                        )}
                                        <p className={`text-xs mt-3 italic ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                            * You can create a Webhook in your Discord server's channel settings (Integrations -{'>'} Webhooks).
                                        </p>
                                    </div>
                                </div>

                                {/* Integration Card: Guardian Link */}
                                <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-zinc-50 border-black/10'
                                    }`}>
                                    <div className="flex items-start gap-4 mb-6">
                                        <div className="p-3 bg-emerald-500 rounded-lg text-white shadow-md">
                                            <Link2 className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>
                                                家长/教师监督绑定 (Guardian Link)
                                            </h3>
                                            <p className={`text-sm mt-1 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                                                如果您是学生，在此处填写您的家长或教师注册 Vanpower 所使用的邮箱账号。一旦绑定，您的练习答卷将自动抄送至他们的 Discord。
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className={`block text-sm font-medium ${isDarkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
                                            家长/教师邮箱账号
                                        </label>
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <input
                                                type="email"
                                                value={guardianEmail}
                                                onChange={(e) => setGuardianEmail(e.target.value)}
                                                placeholder="teacher@example.com"
                                                className={`flex-1 px-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all ${isDarkMode
                                                    ? 'bg-zinc-950 border-white/10 text-white placeholder-zinc-600'
                                                    : 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400'
                                                    }`}
                                            />
                                            <button
                                                onClick={handleSave}
                                                disabled={isSaving}
                                                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 min-w-[120px]"
                                            >
                                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                {isSaving ? 'Saving...' : 'Save Link'}
                                            </button>
                                        </div>
                                        <p className={`text-xs mt-3 italic ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                            * 如果此项留空或填写的邮箱未配置 Webhook，报告仍将发送至您上方配置的私人频道（如已配置）。
                                        </p>
                                    </div>
                                </div>

                                {/* Integration Card: Connected Students (Parent View) */}
                                <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-zinc-50 border-black/10'}`}>
                                    <div className="flex items-start gap-4 mb-6">
                                        <div className="p-3 bg-violet-500 rounded-lg text-white shadow-md">
                                            <Users className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>
                                                已连接的学生 (Connected Students)
                                            </h3>
                                            <p className={`text-sm mt-1 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                                                已将其 "Guardian Link" 设置为您邮箱地址的学生列表。您将自动接收他们的练习成绩。
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        {connectedStudents.length > 0 ? (
                                            <div className="grid gap-3">
                                                {connectedStudents.map((student) => (
                                                    <div key={student.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border ${isDarkMode ? 'bg-zinc-900/50 border-white/5' : 'bg-white border-zinc-200'}`}>
                                                        <div>
                                                            <div className={`font-medium ${isDarkMode ? 'text-zinc-200' : 'text-zinc-800'}`}>
                                                                {student.name || 'Unknown User'}
                                                            </div>
                                                            <div className={`text-sm ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                                                                {student.email}
                                                            </div>
                                                        </div>
                                                        <div className={`mt-2 sm:mt-0 text-xs px-2.5 py-1 rounded-full border w-fit ${isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-green-50 border-green-200 text-green-600'}`}>
                                                            Linked
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className={`text-center py-8 rounded-lg border border-dashed ${isDarkMode ? 'border-white/10 text-zinc-500 bg-zinc-900/50' : 'border-zinc-300 text-zinc-400 bg-white/50'}`}>
                                                <p className="text-sm">暂无学生连接到您的账号。</p>
                                                <p className="text-xs mt-1">请让他们在自己的控制台中填写您的注册邮箱。</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Integration Card: Wish Redemption Store (Parent Management) */}
                                <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-zinc-50 border-black/10'}`}>
                                    <div className="flex items-start gap-4 mb-5">
                                        <div className="p-3 bg-rose-500 rounded-lg text-white shadow-md">
                                            <Gift className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>
                                                心愿兑换商店管理 (Wish Store)
                                            </h3>
                                            <p className={`text-sm mt-1 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                                                确认核销孩子申请的心愿兑换，或自定义奖励项目与所需能量币。
                                            </p>
                                        </div>
                                    </div>

                                    {/* Pending redemptions */}
                                    {rewards.redemptions.filter((r) => r.status === 'pending').length > 0 && (
                                        <div className="mb-5 space-y-2">
                                            <p className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-amber-400' : 'text-amber-700'}`}>
                                                待确认核销 ({rewards.redemptions.filter((r) => r.status === 'pending').length})
                                            </p>
                                            {rewards.redemptions
                                                .filter((r) => r.status === 'pending')
                                                .map((req) => (
                                                    <div
                                                        key={req.id}
                                                        className={`flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg border ${
                                                            isDarkMode ? 'bg-zinc-900/70 border-amber-500/30' : 'bg-amber-50 border-amber-200'
                                                        }`}
                                                    >
                                                        <div className="text-sm font-medium">
                                                            <span className="mr-1.5">{req.emoji}</span>
                                                            <span className={isDarkMode ? 'text-white' : 'text-zinc-900'}>{req.title}</span>
                                                            <span className="ml-2 text-xs text-amber-700 font-bold">(-{req.cost} 币)</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => resolveRedemption(req.id, true)}
                                                                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg flex items-center gap-1"
                                                            >
                                                                <CheckCircle2 className="w-3.5 h-3.5" /> 确认核销
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => resolveRedemption(req.id, false)}
                                                                className="px-3 py-1.5 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 text-xs font-bold rounded-lg"
                                                            >
                                                                退回能量币
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    )}

                                    {/* Existing wishes */}
                                    <div className="space-y-2 mb-4">
                                        {rewards.wishes.map((w) => (
                                            <div
                                                key={w.id}
                                                className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border ${
                                                    isDarkMode ? 'bg-zinc-900/50 border-white/10' : 'bg-white border-zinc-200'
                                                }`}
                                            >
                                                <div className="text-sm font-medium">
                                                    <span className="mr-2">{w.emoji}</span>
                                                    <span className={isDarkMode ? 'text-zinc-100' : 'text-zinc-900'}>{w.title}</span>
                                                    <span className="ml-2 text-xs font-bold text-amber-600">🪙 {w.cost} 币</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeWish(w.id)}
                                                    aria-label={`删除 ${w.title}`}
                                                    className="p-1.5 text-zinc-400 hover:text-rose-500 rounded-md"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Add wish form */}
                                    <div className="flex flex-wrap sm:flex-nowrap gap-2">
                                        <input
                                            type="text"
                                            value={newWishEmoji}
                                            onChange={(e) => setNewWishEmoji(e.target.value)}
                                            aria-label="心愿图标"
                                            maxLength={4}
                                            className={`w-14 text-center px-2 py-2 rounded-lg border text-sm ${
                                                isDarkMode ? 'bg-zinc-950 border-white/10 text-white' : 'bg-white border-zinc-200 text-zinc-900'
                                            }`}
                                        />
                                        <input
                                            type="text"
                                            value={newWishTitle}
                                            onChange={(e) => setNewWishTitle(e.target.value)}
                                            maxLength={60}
                                            placeholder="新增心愿（如：周末吃冰淇淋）"
                                            className={`flex-1 min-w-[140px] px-3 py-2 rounded-lg border text-sm ${
                                                isDarkMode ? 'bg-zinc-950 border-white/10 text-white' : 'bg-white border-zinc-200 text-zinc-900'
                                            }`}
                                        />
                                        <input
                                            type="number"
                                            min={10}
                                            max={100000}
                                            step={10}
                                            value={newWishCost}
                                            onChange={(e) => setNewWishCost(e.target.value)}
                                            aria-label="所需能量币"
                                            className={`w-24 px-3 py-2 rounded-lg border text-sm ${
                                                isDarkMode ? 'bg-zinc-950 border-white/10 text-white' : 'bg-white border-zinc-200 text-zinc-900'
                                            }`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const title = newWishTitle.trim().slice(0, 60);
                                                const cost = Math.min(100_000, Math.max(1, parseInt(newWishCost, 10) || 50));
                                                if (!title) return;
                                                addWish({ emoji: newWishEmoji.trim().slice(0, 8) || '🎁', title, cost });
                                                setNewWishTitle('');
                                            }}
                                            className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold rounded-lg flex items-center gap-1 shrink-0"
                                        >
                                            <Plus className="w-4 h-4" /> 添加
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default ConsoleModal;
