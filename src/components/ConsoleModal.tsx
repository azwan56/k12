import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, MessageSquare, Loader2, Link2, Users } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { collection, doc as firestoreDoc, getDoc as firestoreGetDoc, setDoc as firestoreSetDoc, updateDoc as firestoreUpdateDoc, query, where, getDocs } from 'firebase/firestore';

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
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [connectedStudents, setConnectedStudents] = useState<any[]>([]);

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
        setIsSaving(true);
        setSaveStatus('idle');

        try {
            const userRef = firestoreDoc(db, 'users', auth.currentUser.uid);
            await firestoreUpdateDoc(userRef, {
                discordWebhookUrl: webhookUrl,
                guardianEmail: guardianEmail
            });
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
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default ConsoleModal;
