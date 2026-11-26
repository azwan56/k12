import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, MessageSquare, Loader2, Link2, Users, Gift, Plus, Trash2, CheckCircle2, UserCheck, BarChart3, Copy, Check } from 'lucide-react';
import { db } from '../lib/firebase';
import { isCnRegion, formatAccountDisplay, isSyntheticCnEmail } from '../lib/region';
import { cnApi } from '../lib/cnApi';
import { isValidDiscordWebhookUrl } from '../lib/security';
import { doc as firestoreDoc, getDoc as firestoreGetDoc, setDoc as firestoreSetDoc } from 'firebase/firestore';
import { useRewards } from '../hooks/useRewards';
import { useProfile } from '../hooks/useProfile';
import { useAuth } from '../hooks/useAuth';
import { AVATAR_OPTIONS, MAX_DISPLAY_NAME_LENGTH } from '../k12/profile';
import {
    GuardianLink,
    isValidEmailAddress,
    normalizeEmail,
} from '../k12/guardianLinks';
import {
    acceptGuardianInvite,
    addStudentLink,
    createGuardianInvite,
    fetchParentStudentLinks,
    fetchStudentGuardianLinks,
    removeGuardianLink,
    syncParentLinksMetadata,
} from '../k12/guardianLinkService';
import UserAvatar from '../k12/UserAvatar';
import type { GradeLevel } from '../data/k12Subjects';

interface ConsoleModalProps {
    isOpen: boolean;
    onClose: () => void;
    isDarkMode: boolean;
}

const ConsoleModal: React.FC<ConsoleModalProps> = ({ isOpen, onClose, isDarkMode }) => {
    const [webhookUrl, setWebhookUrl] = useState('');
    const [studentEmailInput, setStudentEmailInput] = useState('');
    const [isAddingStudent, setIsAddingStudent] = useState(false);
    const [studentLinkStatus, setStudentLinkStatus] = useState<'idle' | 'added' | 'invalid_email' | 'self_email' | 'duplicate' | 'invalid_webhook' | 'error'>('idle');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error' | 'invalid_webhook'>('idle');
    const [connectedStudents, setConnectedStudents] = useState<GuardianLink[]>([]);
    const [linkedGuardians, setLinkedGuardians] = useState<GuardianLink[]>([]);
    const { rewards, resolveRedemption, addWish, removeWish } = useRewards();
    const { user } = useAuth();
    const { profile, resolvedName, effectiveAvatarId, updateProfile } = useProfile();
    const [profileNameInput, setProfileNameInput] = useState(profile.displayName);
    const [profileSaved, setProfileSaved] = useState(false);
    const [newWishEmoji, setNewWishEmoji] = useState('🎁');
    const [newWishTitle, setNewWishTitle] = useState('');
    const [newWishCost, setNewWishCost] = useState('100');
    const [cnChannel, setCnChannel] = useState<'wechat_tpl' | 'wecom' | 'dingtalk' | 'feishu'>('wechat_tpl');
    const [inviteInfo, setInviteInfo] = useState<{ code: string; expiresAt: number } | null>(null);
    const [inviteBusy, setInviteBusy] = useState(false);
    const [copiedInvite, setCopiedInvite] = useState(false);
    const [acceptCodeInput, setAcceptCodeInput] = useState('');
    const [acceptBusy, setAcceptBusy] = useState(false);
    const [acceptMsg, setAcceptMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
    const cnMode = isCnRegion();

    useEffect(() => {
        if (!isOpen) return;
        setProfileNameInput(profile.displayName);
        setProfileSaved(false);
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [isOpen, onClose, profile.displayName]);

    useEffect(() => {
        if (isOpen && user?.uid) {
            void loadUserData();
        } else if (isOpen) {
            setIsLoading(false);
        }
    }, [isOpen, user?.uid]);

    const loadUserData = async () => {
        setIsLoading(true);
        try {
            if (!user?.uid) return;
            if (cnMode) {
                const [userState, students, guardians] = await Promise.all([
                    cnApi.getUserState().catch(() => ({ notifySettings: {} })),
                    fetchParentStudentLinks(user.uid).catch(() => [] as GuardianLink[]),
                    fetchStudentGuardianLinks(user.email || '').catch(() => [] as GuardianLink[]),
                ]);
                const ns = (userState as { notifySettings?: { channel?: string; webhookUrl?: string } }).notifySettings;
                if (ns?.channel === 'wecom' || ns?.channel === 'dingtalk' || ns?.channel === 'feishu' || ns?.channel === 'wechat_tpl') {
                    setCnChannel(ns.channel);
                }
                setWebhookUrl(ns?.webhookUrl || '');
                setConnectedStudents(students);
                setLinkedGuardians(guardians);
                return;
            }

            const userRef = firestoreDoc(db, 'users', user.uid);

            const userSnap = await firestoreGetDoc(userRef) as any;

            if (userSnap.exists()) {
                const data = userSnap.data();
                setWebhookUrl(data.discordWebhookUrl || '');
            } else {
                const fallbackName = user.displayName || (user.email ? user.email.split('@')[0] : 'User');
                await firestoreSetDoc(userRef, {
                    uid: user.uid,
                    email: user.email,
                    name: fallbackName,
                    discordWebhookUrl: '',
                    createdAt: Date.now()
                });
            }

            const [students, guardians] = await Promise.all([
                fetchParentStudentLinks(user.uid).catch((err) => {
                    console.warn('Failed to fetch parent student links:', err);
                    return [] as GuardianLink[];
                }),
                user.email
                    ? fetchStudentGuardianLinks(user.email).catch((err) => {
                        console.warn('Failed to fetch guardian links:', err);
                        return [] as GuardianLink[];
                    })
                    : Promise.resolve([] as GuardianLink[]),
            ]);
            setConnectedStudents(students);
            setLinkedGuardians(guardians);
        } catch (error) {
            console.error("Error loading user data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveProfile = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        await updateProfile({ displayName: profileNameInput });
        setProfileSaved(true);
        setTimeout(() => setProfileSaved(false), 2500);
    };

    const handleSave = async () => {
        if (!user?.uid) return;
        const trimmedWebhook = webhookUrl.trim();
        if (cnMode) {
            setIsSaving(true);
            setSaveStatus('idle');
            try {
                await cnApi.updateNotifySettings(cnChannel, cnChannel === 'wechat_tpl' ? '' : trimmedWebhook);
                setSaveStatus('success');
                setTimeout(() => setSaveStatus('idle'), 3000);
            } catch {
                setSaveStatus('invalid_webhook');
            } finally {
                setIsSaving(false);
            }
            return;
        }
        if (trimmedWebhook && !isValidDiscordWebhookUrl(trimmedWebhook)) {
            setSaveStatus('invalid_webhook');
            return;
        }
        setIsSaving(true);
        setSaveStatus('idle');

        try {
            const userRef = firestoreDoc(db, 'users', user.uid);
            await firestoreSetDoc(
                userRef,
                {
                    uid: user.uid,
                    email: user.email ?? null,
                    name: resolvedName,
                    discordWebhookUrl: trimmedWebhook,
                },
                { merge: true }
            );
            await syncParentLinksMetadata(user.uid, {
                parentName: resolvedName,
                discordWebhookUrl: trimmedWebhook,
            }).catch((err) => {
                console.warn('Failed to sync webhook to guardian links:', err);
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

    const handleAddStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.uid || !user.email) return;

        const normalizedStudent = normalizeEmail(studentEmailInput);
        const normalizedSelf = normalizeEmail(user.email);

        if (!isValidEmailAddress(normalizedStudent)) {
            setStudentLinkStatus('invalid_email');
            return;
        }
        if (normalizedStudent === normalizedSelf) {
            setStudentLinkStatus('self_email');
            return;
        }
        if (connectedStudents.some((item) => item.studentEmail === normalizedStudent)) {
            setStudentLinkStatus('duplicate');
            return;
        }

        const trimmedWebhook = webhookUrl.trim();
        if (trimmedWebhook && !isValidDiscordWebhookUrl(trimmedWebhook)) {
            setStudentLinkStatus('invalid_webhook');
            return;
        }

        setIsAddingStudent(true);
        setStudentLinkStatus('idle');
        try {
            if (trimmedWebhook) {
                const userRef = firestoreDoc(db, 'users', user.uid);
                await firestoreSetDoc(
                    userRef,
                    {
                        uid: user.uid,
                        email: user.email ?? null,
                        name: resolvedName,
                        discordWebhookUrl: trimmedWebhook,
                    },
                    { merge: true }
                );
            }

            const created = await addStudentLink({
                parentUid: user.uid,
                parentEmail: normalizedSelf,
                parentName: resolvedName,
                studentEmail: normalizedStudent,
                discordWebhookUrl: trimmedWebhook,
            });
            setConnectedStudents((prev) =>
                [...prev.filter((item) => item.id !== created.id), created].sort((a, b) =>
                    a.studentEmail.localeCompare(b.studentEmail)
                )
            );
            setStudentEmailInput('');
            setStudentLinkStatus('added');
            setTimeout(() => setStudentLinkStatus('idle'), 3000);
        } catch (err) {
            console.error('Error adding student link:', err);
            setStudentLinkStatus('error');
        } finally {
            setIsAddingStudent(false);
        }
    };

    const handleRemoveStudent = async (linkId: string) => {
        try {
            await removeGuardianLink(linkId);
            setConnectedStudents((prev) => prev.filter((item) => item.id !== linkId));
        } catch (err) {
            console.error('Error removing student link:', err);
        }
    };

    const handleRemoveGuardian = async (linkId: string) => {
        try {
            await removeGuardianLink(linkId);
            setLinkedGuardians((prev) => prev.filter((item) => item.id !== linkId));
        } catch (err) {
            console.error('Error removing guardian link:', err);
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
                                {/* Portal Profile Maintenance Card */}
                                <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-zinc-50 border-black/10'}`}>
                                    <div className="flex items-start gap-4 mb-5">
                                        <UserAvatar
                                            avatarId={effectiveAvatarId}
                                            photoURL={user?.photoURL}
                                            displayName={resolvedName}
                                            size="lg"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>
                                                    门户个人资料 (Portal Profile)
                                                </h3>
                                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-800'}`}>
                                                    {profile.grade === 'G6' ? '6 年级' : '7 年级'}
                                                </span>
                                            </div>
                                            <p className={`text-sm mt-1 truncate ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                                                当前显示：<span className={`font-semibold ${isDarkMode ? 'text-zinc-200' : 'text-zinc-800'}`}>{resolvedName}</span>
                                                {user ? ` · ${formatAccountDisplay(user.email, user.provider, user.phone)}` : ''}
                                            </p>
                                            <p className={`text-xs mt-1 ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                                {cnMode
                                                    ? '头像与昵称将自动同步到顶部导航栏、家长督学看板与成绩单。'
                                                    : '头像与昵称将自动同步到顶部导航栏、家长监督绑定列表以及学习周报/Discord 战报。'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-5">
                                        {/* Nickname form */}
                                        <form onSubmit={handleSaveProfile} className="space-y-2">
                                            <label className={`block text-sm font-medium ${isDarkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
                                                学生昵称 (Display Name)
                                            </label>
                                            <div className="flex flex-col sm:flex-row gap-3">
                                                <input
                                                    type="text"
                                                    value={profileNameInput}
                                                    maxLength={MAX_DISPLAY_NAME_LENGTH}
                                                    onChange={(e) => setProfileNameInput(e.target.value)}
                                                    placeholder={`留空将使用账号名（${user?.displayName || resolvedName}）`}
                                                    className={`flex-1 px-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all ${isDarkMode
                                                        ? 'bg-zinc-950 border-white/10 text-white placeholder-zinc-600'
                                                        : 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400'
                                                        }`}
                                                />
                                                <button
                                                    type="submit"
                                                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 min-w-[120px]"
                                                >
                                                    <UserCheck className="w-4 h-4" />
                                                    保存昵称
                                                </button>
                                            </div>
                                            {profileSaved && (
                                                <p className="text-emerald-500 text-sm flex items-center gap-1 mt-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                                                    个人资料已更新并同步云端！
                                                </p>
                                            )}
                                        </form>

                                        {/* Avatar Picker */}
                                        <div className="space-y-2">
                                            <label className={`block text-sm font-medium ${isDarkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
                                                顶部展示头像
                                            </label>
                                            <div className="flex flex-wrap items-center gap-2.5">
                                                {user?.photoURL && (
                                                    <button
                                                        type="button"
                                                        onClick={() => void updateProfile({ avatarId: 'google' })}
                                                        aria-pressed={effectiveAvatarId === 'google'}
                                                        title={cnMode ? '微信账号头像' : 'Google 账号头像'}
                                                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all ${effectiveAvatarId === 'google'
                                                            ? isDarkMode
                                                                ? 'border-amber-400 bg-amber-500/20 text-white'
                                                                : 'border-zinc-900 bg-amber-100 text-zinc-900 shadow-sm'
                                                            : isDarkMode
                                                                ? 'border-white/10 bg-zinc-950 text-zinc-300 hover:border-white/30'
                                                                : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400'
                                                            }`}
                                                    >
                                                        <UserAvatar
                                                            avatarId="google"
                                                            photoURL={user?.photoURL}
                                                            displayName={resolvedName}
                                                            size="xs"
                                                        />
                                                        <span>{cnMode ? '微信头像' : 'Google 头像'}</span>
                                                    </button>
                                                )}
                                                {AVATAR_OPTIONS.map((opt) => {
                                                    const selected = effectiveAvatarId === opt.id;
                                                    return (
                                                        <button
                                                            key={opt.id}
                                                            type="button"
                                                            onClick={() => void updateProfile({ avatarId: opt.id })}
                                                            aria-pressed={selected}
                                                            title={opt.label}
                                                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all ${selected
                                                                ? isDarkMode
                                                                    ? 'border-amber-400 bg-amber-500/20 text-white'
                                                                    : 'border-zinc-900 bg-amber-100 text-zinc-900 shadow-sm'
                                                                : isDarkMode
                                                                    ? 'border-white/10 bg-zinc-950 text-zinc-300 hover:border-white/30'
                                                                    : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400'
                                                                }`}
                                                        >
                                                            <UserAvatar avatarId={opt.id} size="xs" />
                                                            <span>{opt.label}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Grade Quick Switch */}
                                        <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
                                            <span className={`text-sm font-medium ${isDarkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
                                                默认学习年级
                                            </span>
                                            <div className={`inline-flex rounded-lg border p-1 ${isDarkMode ? 'bg-zinc-950 border-white/10' : 'bg-white border-zinc-200'}`}>
                                                {(['G6', 'G7'] as GradeLevel[]).map((g) => (
                                                    <button
                                                        key={g}
                                                        type="button"
                                                        aria-pressed={profile.grade === g}
                                                        onClick={() => void updateProfile({ grade: g })}
                                                        className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${profile.grade === g
                                                            ? 'bg-zinc-900 text-white'
                                                            : isDarkMode
                                                                ? 'text-zinc-400 hover:text-white'
                                                                : 'text-zinc-600 hover:bg-zinc-100'
                                                            }`}
                                                    >
                                                        {g === 'G6' ? '6 年级' : '7 年级'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Integration Card: Notification Channel */}
                                {cnMode ? (
                                    <div className="p-6 rounded-xl border bg-zinc-50 border-black/10">
                                        <div className="flex items-start gap-4 mb-5">
                                            <div className="p-3 bg-emerald-600 rounded-lg text-white shadow-md">
                                                <MessageSquare className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-zinc-900">
                                                    微信督学消息与群机器人推送
                                                </h3>
                                                <p className="text-sm mt-1 text-zinc-500">
                                                    默认通过万跑科技微信服务号自动推送孩子练习成绩单；您也可额外绑定企业微信、钉钉或飞书群机器人接收通知。
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex flex-wrap gap-2">
                                                {([
                                                    ['wechat_tpl', '仅微信服务号通知（推荐）'],
                                                    ['wecom', '企业微信群机器人'],
                                                    ['dingtalk', '钉钉群机器人'],
                                                    ['feishu', '飞书群机器人'],
                                                ] as const).map(([val, label]) => (
                                                    <button
                                                        key={val}
                                                        type="button"
                                                        onClick={() => setCnChannel(val)}
                                                        className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors ${
                                                            cnChannel === val
                                                                ? 'bg-emerald-600 border-emerald-700 text-white'
                                                                : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                                                        }`}
                                                    >
                                                        {label}
                                                    </button>
                                                ))}
                                            </div>
                                            {cnChannel !== 'wechat_tpl' && (
                                                <input
                                                    type="text"
                                                    value={webhookUrl}
                                                    onChange={(e) => setWebhookUrl(e.target.value)}
                                                    placeholder="请输入 https://qyapi.weixin.qq.com/... 或钉钉/飞书 Webhook"
                                                    className="w-full px-4 py-2.5 rounded-lg border bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400 outline-none focus:ring-2 focus:ring-emerald-500"
                                                />
                                            )}
                                            <button
                                                type="button"
                                                onClick={handleSave}
                                                disabled={isSaving}
                                                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors inline-flex items-center gap-2 disabled:opacity-50"
                                            >
                                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                {isSaving ? '保存中...' : '保存通知设置'}
                                            </button>
                                            {saveStatus === 'success' && (
                                                <p className="text-emerald-600 text-sm">通知设置已保存！</p>
                                            )}
                                            {saveStatus === 'invalid_webhook' && (
                                                <p className="text-rose-600 text-sm">仅支持企业微信、钉钉或飞书的合法 HTTPS Webhook 地址。</p>
                                            )}
                                        </div>
                                    </div>
                                ) : (
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
                                )}

                                {/* Integration Card: Connected Students / Guardian Binding */}
                                <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-zinc-50 border-black/10'}`}>
                                    <div className="flex items-start gap-4 mb-6">
                                        <div className="p-3 bg-violet-500 rounded-lg text-white shadow-md">
                                            <Users className="w-6 h-6" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>
                                                    添加与管理学生 (Connected Students)
                                                </h3>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        onClose();
                                                        window.location.hash = '#/parent';
                                                    }}
                                                    className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${
                                                        isDarkMode
                                                            ? 'bg-violet-500/20 border-violet-400/30 text-violet-300 hover:bg-violet-500/30'
                                                            : 'bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100'
                                                    }`}
                                                >
                                                    <BarChart3 className="w-3.5 h-3.5" />
                                                    打开家长督学看板 →
                                                </button>
                                            </div>
                                            <p className={`text-sm mt-1 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                                                {cnMode
                                                    ? '家长点击下方生成 6 位绑定邀请码发给孩子；或孩子在此输入家长提供的 6 位邀请码完成双向督学绑定。'
                                                    : '由家长或教师直接输入孩子的 Vanpower / Google 登录邮箱添加绑定。绑定并完成学生登录授权后，您可在「家长督学看板」查看孩子完成的各科练习与进展，同时战报将自动抄送至您上方配置的 Discord 频道。'}
                                            </p>
                                        </div>
                                    </div>

                                    {cnMode ? (
                                        <div className="space-y-4 mb-5">
                                            <div className="p-4 rounded-xl border bg-white border-zinc-200 space-y-2.5">
                                                <div className="text-sm font-bold text-zinc-800">我是家长：生成孩子绑定邀请码</div>
                                                <div className="flex flex-wrap items-center gap-2.5">
                                                    <button
                                                        type="button"
                                                        disabled={inviteBusy}
                                                        onClick={async () => {
                                                            setInviteBusy(true);
                                                            try {
                                                                const res = await createGuardianInvite();
                                                                setInviteInfo(res);
                                                                setCopiedInvite(false);
                                                            } finally {
                                                                setInviteBusy(false);
                                                            }
                                                        }}
                                                        className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold rounded-lg disabled:opacity-50"
                                                    >
                                                        {inviteBusy ? '生成中...' : inviteInfo ? '重新生成绑定码' : '生成 6 位绑定码'}
                                                    </button>
                                                    {inviteInfo && (
                                                        <>
                                                            <span className="px-3 py-1.5 rounded-lg border border-zinc-300 bg-zinc-50 font-black tracking-[0.2em] text-zinc-900">
                                                                {inviteInfo.code}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={async () => {
                                                                    const url = `${window.location.origin}/#/bind?code=${inviteInfo.code}`;
                                                                    try {
                                                                        await navigator.clipboard.writeText(`请打开 Vanpower K12 绑定家长督学（绑定码 ${inviteInfo.code}）：\n${url}`);
                                                                        setCopiedInvite(true);
                                                                        setTimeout(() => setCopiedInvite(false), 2500);
                                                                    } catch {
                                                                        // Ignore clipboard errors
                                                                    }
                                                                }}
                                                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 text-xs font-bold"
                                                            >
                                                                {copiedInvite ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                                                {copiedInvite ? '已复制链接' : '复制微信邀请链接'}
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            <form
                                                onSubmit={async (e) => {
                                                    e.preventDefault();
                                                    const clean = acceptCodeInput.replace(/\D/g, '');
                                                    if (clean.length !== 6) {
                                                        setAcceptMsg({ kind: 'err', text: '请输入 6 位数字绑定码' });
                                                        return;
                                                    }
                                                    setAcceptBusy(true);
                                                    setAcceptMsg(null);
                                                    try {
                                                        const link = await acceptGuardianInvite(clean);
                                                        setLinkedGuardians((prev) => [link, ...prev.filter((g) => g.id !== link.id)]);
                                                        setAcceptCodeInput('');
                                                        setAcceptMsg({ kind: 'ok', text: `已成功绑定家长「${link.parentName}」` });
                                                    } catch (err) {
                                                        setAcceptMsg({
                                                            kind: 'err',
                                                            text: err instanceof Error ? err.message : '绑定失败，请核对邀请码',
                                                        });
                                                    } finally {
                                                        setAcceptBusy(false);
                                                    }
                                                }}
                                                className="p-4 rounded-xl border bg-white border-zinc-200 space-y-2.5"
                                            >
                                                <div className="text-sm font-bold text-zinc-800">我是学生：输入家长 6 位绑定码</div>
                                                <div className="flex flex-col sm:flex-row gap-2.5">
                                                    <input
                                                        type="text"
                                                        inputMode="numeric"
                                                        maxLength={6}
                                                        value={acceptCodeInput}
                                                        onChange={(e) => setAcceptCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                                        placeholder="输入 6 位数字绑定码"
                                                        className="flex-1 px-3.5 py-2 rounded-lg border border-zinc-200 text-sm font-bold tracking-widest"
                                                    />
                                                    <button
                                                        type="submit"
                                                        disabled={acceptBusy}
                                                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-lg disabled:opacity-50"
                                                    >
                                                        {acceptBusy ? '绑定中...' : '确认绑定家长'}
                                                    </button>
                                                </div>
                                                {acceptMsg && (
                                                    <p className={`text-xs font-bold ${acceptMsg.kind === 'ok' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                        {acceptMsg.text}
                                                    </p>
                                                )}
                                            </form>
                                        </div>
                                    ) : (
                                    <form onSubmit={handleAddStudent} className="space-y-3 mb-5">
                                        <label className={`block text-sm font-medium ${isDarkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
                                            添加学生邮箱账号
                                        </label>
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <input
                                                type="email"
                                                value={studentEmailInput}
                                                onChange={(e) => {
                                                    setStudentEmailInput(e.target.value);
                                                    if (studentLinkStatus !== 'idle') setStudentLinkStatus('idle');
                                                }}
                                                placeholder="student@example.com"
                                                className={`flex-1 px-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all ${isDarkMode
                                                    ? 'bg-zinc-950 border-white/10 text-white placeholder-zinc-600'
                                                    : 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400'
                                                    }`}
                                            />
                                            <button
                                                type="submit"
                                                disabled={isAddingStudent}
                                                className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 min-w-[132px]"
                                            >
                                                {isAddingStudent ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                                {isAddingStudent ? '添加中...' : '添加学生'}
                                            </button>
                                        </div>
                                        {studentLinkStatus === 'added' && (
                                            <p className="text-emerald-500 text-sm flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                                                已添加该学生邮箱！学生使用该邮箱登录练习后战报将自动推送。
                                            </p>
                                        )}
                                        {studentLinkStatus === 'invalid_email' && (
                                            <p className="text-rose-500 text-sm flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block"></span>
                                                请输入合法的学生邮箱地址。
                                            </p>
                                        )}
                                        {studentLinkStatus === 'self_email' && (
                                            <p className="text-rose-500 text-sm flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block"></span>
                                                不能添加当前登录的家长邮箱作为学生。
                                            </p>
                                        )}
                                        {studentLinkStatus === 'duplicate' && (
                                            <p className="text-amber-500 text-sm flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block"></span>
                                                该学生邮箱已在您的监督列表中。
                                            </p>
                                        )}
                                        {studentLinkStatus === 'invalid_webhook' && (
                                            <p className="text-rose-500 text-sm flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block"></span>
                                                上方 Discord Webhook 地址格式不正确，请先修正或清空。
                                            </p>
                                        )}
                                        {studentLinkStatus === 'error' && (
                                            <p className="text-rose-500 text-sm flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block"></span>
                                                添加学生失败，请确认已完成 Google 邮箱登录与 Firestore 规则已更新。
                                            </p>
                                        )}
                                        {!webhookUrl.trim() && (
                                            <p className={`text-xs italic ${isDarkMode ? 'text-amber-400/90' : 'text-amber-700'}`}>
                                                * 提示：请同时在上方 Discord Webhook 中填写接收频道，绑定学生后方可接收成绩战报。
                                            </p>
                                        )}
                                    </form>
                                    )}

                                    <div className="space-y-3">
                                        {connectedStudents.length > 0 ? (
                                            <div className="grid gap-3">
                                                {connectedStudents.map((student) => {
                                                    const displayLabel =
                                                        student.studentName ||
                                                        (isSyntheticCnEmail(student.studentEmail) ? '微信同学' : student.studentEmail);
                                                    return (
                                                        <div key={student.id} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border ${isDarkMode ? 'bg-zinc-900/50 border-white/5' : 'bg-white border-zinc-200'}`}>
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                <UserAvatar
                                                                    avatarId={student.studentAvatarId}
                                                                    photoURL={student.studentPhotoURL}
                                                                    displayName={displayLabel}
                                                                    size="sm"
                                                                />
                                                                <div className="min-w-0">
                                                                    <div className={`font-medium truncate ${isDarkMode ? 'text-zinc-200' : 'text-zinc-800'}`}>
                                                                        {displayLabel}
                                                                    </div>
                                                                    <div className={`text-sm truncate ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                                                                        {formatAccountDisplay(student.studentEmail, 'wechat')}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                                                <span className={`text-xs px-2.5 py-1 rounded-full border w-fit ${student.studentUid
                                                                    ? isDarkMode
                                                                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                                                        : 'bg-green-50 border-green-200 text-green-600'
                                                                    : isDarkMode
                                                                        ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                                                                        : 'bg-amber-50 border-amber-200 text-amber-700'
                                                                    }`}>
                                                                    {student.studentUid ? '已同步资料' : '等待学生登录'}
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        onClose();
                                                                        window.location.hash = `#/parent?student=${encodeURIComponent(student.studentEmail)}`;
                                                                    }}
                                                                    className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition-colors ${
                                                                        isDarkMode
                                                                            ? 'bg-violet-500/20 border-violet-400/30 text-violet-300 hover:bg-violet-500/30'
                                                                            : 'bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100'
                                                                    }`}
                                                                >
                                                                    📊 查看进展
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => void handleRemoveStudent(student.id)}
                                                                    className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10' : 'text-zinc-400 hover:text-rose-600 hover:bg-rose-50'}`}
                                                                    aria-label={`移除 ${student.studentEmail}`}
                                                                    title="解除学生绑定"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className={`text-center py-8 rounded-lg border border-dashed ${isDarkMode ? 'border-white/10 text-zinc-500 bg-zinc-900/50' : 'border-zinc-300 text-zinc-400 bg-white/50'}`}>
                                                <p className="text-sm">暂未绑定任何学生。</p>
                                                <p className="text-xs mt-1">
                                                    {cnMode
                                                        ? '点击上方「生成 6 位绑定码」发给孩子确认即可完成绑定。'
                                                        : '在上方输入孩子登录使用的 Google 邮箱即可完成绑定。'}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {linkedGuardians.length > 0 && (
                                        <div className={`mt-6 pt-5 border-t ${isDarkMode ? 'border-white/10' : 'border-zinc-200'}`}>
                                            <div className="flex items-center gap-2 mb-3">
                                                <Link2 className="w-4 h-4 text-emerald-500" />
                                                <span className={`text-sm font-semibold ${isDarkMode ? 'text-zinc-200' : 'text-zinc-800'}`}>
                                                    监督我的家长/教师
                                                </span>
                                            </div>
                                            <div className="grid gap-2.5">
                                                {linkedGuardians.map((guardian) => (
                                                    <div key={guardian.id} className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg border ${isDarkMode ? 'bg-zinc-900/50 border-white/5' : 'bg-white border-zinc-200'}`}>
                                                        <div className="min-w-0">
                                                            <div className={`text-sm font-medium truncate ${isDarkMode ? 'text-zinc-200' : 'text-zinc-800'}`}>
                                                                {guardian.parentName}
                                                            </div>
                                                            <div className={`text-xs truncate ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                                                                {formatAccountDisplay(guardian.parentEmail, 'wechat')}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <span className={`text-[11px] px-2 py-0.5 rounded-full border ${guardian.discordWebhookUrl
                                                                ? isDarkMode
                                                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                                                    : 'bg-green-50 border-green-200 text-green-600'
                                                                : isDarkMode
                                                                    ? 'bg-zinc-800 border-white/10 text-zinc-400'
                                                                    : 'bg-zinc-100 border-zinc-200 text-zinc-500'
                                                                }`}>
                                                                {guardian.discordWebhookUrl ? '已配置接收频道' : '未配置频道'}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => void handleRemoveGuardian(guardian.id)}
                                                                className={`p-1 rounded-lg transition-colors ${isDarkMode ? 'text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10' : 'text-zinc-400 hover:text-rose-600 hover:bg-rose-50'}`}
                                                                aria-label={`解除 ${guardian.parentEmail}`}
                                                                title="解除此监督关系"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
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
