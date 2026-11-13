import React, { useState } from 'react';
import { Sparkles, Calculator, LogOut, LayoutDashboard, GraduationCap } from 'lucide-react';
import SubjectPortal from './components/SubjectPortal';
import ConsoleModal from './components/ConsoleModal';
import HeroCanvas from './components/HeroCanvas';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

export default function App() {
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const { user, loading, needsSSOSync, signInWithGoogle, logout, generateCustomTokenAndRedirect } = useAuth();
  const [isDarkMode] = useTheme(); // Even if dark mode is active everywhere, pass the standard param to children if needed

  // Handle cross-domain auto-redirects (SSO Bounce)
  React.useEffect(() => {
    if (loading) return; // Wait until Firebase Auth has resolved our session

    const params = new URLSearchParams(window.location.search);
    const isSsoBounce = params.get('sso_bounce') === 'true';
    const redirectUrl = params.get('redirect');

    if (isSsoBounce && redirectUrl) {
      if (user) {
        // User is logged into the root domain. Mint a token and send them back!
        generateCustomTokenAndRedirect(redirectUrl).catch(e => {
          console.error("SSO Bounce Custom Token generation failed", e);
          // Fallback just in case
          window.location.href = redirectUrl;
        });
      } else {
        // User isn't actually logged in here. Kick them back so they can show manual login.
        const separator = redirectUrl.includes('?') ? '&' : '?';
        window.location.href = `${redirectUrl}${separator}sso_failed=true`;
      }
    }
  }, [loading, user, generateCustomTokenAndRedirect]);

  return (
    <div className={`min-h-screen bg-navy-900 text-ivory font-sans selection:bg-teal-accent selection:text-navy-900 overflow-x-hidden`}>
      <ConsoleModal
        isOpen={isConsoleOpen}
        onClose={() => setIsConsoleOpen(false)}
        isDarkMode={true} // Hardcoded true to match the navy theme
      />

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 glass-card border-b border-navy-800">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-teal-accent rounded-lg flex items-center justify-center">
              <span className="text-navy-900 font-bold text-xl">V</span>
            </div>
            <span className="text-xl font-bold tracking-tight">VANPOWER</span>
          </div>
          
          <div className="hidden md:flex items-center space-x-8 text-sm font-medium">
            <a className="hover:text-teal-accent transition-colors flex items-center gap-1" href="#subjects">
              <GraduationCap className="w-4 h-4 text-teal-accent" />
              全科入口 (G6/G7)
            </a>
            <button onClick={() => generateCustomTokenAndRedirect("https://mathgenius.vanpower.live")} className="text-emerald-500 hover:text-emerald-400 transition-colors flex items-center gap-1">
              MathGenius <Calculator className="w-4 h-4" />
            </button>
            <button onClick={() => generateCustomTokenAndRedirect("https://wordsmith.vanpower.live")} className="text-indigo-500 hover:text-indigo-400 transition-colors flex items-center gap-1">
              Wordsmith <Sparkles className="w-4 h-4" />
            </button>
            <a className="hover:text-teal-accent transition-colors" href="#features">Features / 功能</a>
            {user ? (
               <div className="flex items-center gap-3">
                  <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.email}`} alt="Avatar" className="w-8 h-8 rounded-full border border-teal-accent/20" />
                  <button
                    onClick={() => setIsConsoleOpen(true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 bg-teal-accent text-navy-900 hover:bg-teal-deep hover:text-white"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    控制台
                  </button>
                  <button
                    onClick={logout}
                    className="p-2 rounded-full transition-colors text-ivory/60 hover:bg-white/5 hover:text-rose-400"
                    title="退出登录"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
               </div>
            ) : (
              <button 
                onClick={signInWithGoogle} 
                className="flex items-center gap-2 px-5 py-2 rounded-full border border-teal-accent text-teal-accent hover:bg-teal-accent hover:text-navy-900 transition-all duration-300 group"
              >
                  <GoogleIcon />
                  <span className="font-bold relative z-10">{needsSSOSync ? 'Sync Session' : 'Sign In'}</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative pt-32 pb-20 overflow-hidden">
        {/* Decorative Background */}
        <div className="absolute top-0 right-0 -z-10 w-1/2 h-full opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100">
            <circle cx="80" cy="20" fill="url(#grad1)" r="40"></circle>
            <defs>
              <linearGradient id="grad1" x1="0%" x2="100%" y1="0%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#64FFDA', stopOpacity: 1 }}></stop>
                <stop offset="100%" style={{ stopColor: '#0A192F', stopOpacity: 1 }}></stop>
              </linearGradient>
            </defs>
          </svg>
        </div>

        <section className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
          <div data-purpose="hero-content">
            <div className="inline-block px-4 py-1 rounded-full border border-teal-accent/30 bg-teal-accent/5 text-teal-accent text-xs font-bold tracking-widest uppercase mb-6">
              VANPOWER K12 · GRADE 6 &amp; GRADE 7 PORTAL
            </div>
            <h1 className="text-3xl lg:text-4xl xl:text-5xl font-bold leading-tight mb-6">
              VANPOWER K12 <br/>
              <span className="gradient-text">6/7 年级全科学习入口</span>
            </h1>
            <h2 className="text-xl lg:text-2xl font-light text-ivory/80 mb-6">
              English · IG Math · 上海数学 · Humanity · Science
            </h2>
            <p className="text-base lg:text-lg text-ivory/60 mb-10 max-w-lg leading-relaxed">
              面向六、七年级学生的 AI 交互式学习门户：英语涵盖 Wordsmith 造句与命题作文，数学覆盖 IG Math 与上海数学双轨，同步提供 Humanity 与 Science 随堂探究。
            </p>
            <div className="flex flex-wrap gap-4">
              <a href="#subjects" className="px-8 py-4 bg-teal-accent text-navy-900 font-bold rounded-lg hover:shadow-[0_0_20px_rgba(100,255,218,0.4)] transition-all flex items-center gap-2">
                <GraduationCap className="w-5 h-5" /> 进入科目中心 / Explore Subjects
              </a>
              {user ? (
                 <button onClick={() => setIsConsoleOpen(true)} className="px-8 py-4 bg-transparent border border-ivory/20 hover:border-teal-accent/60 rounded-lg transition-all flex items-center gap-2">
                   Open Console / 控制台
                 </button>
              ) : (
                <button onClick={signInWithGoogle} className="px-8 py-4 bg-transparent border border-ivory/20 hover:border-teal-accent/60 rounded-lg transition-all flex items-center gap-2">
                  <GoogleIcon /> Sign In / 登录
                </button>
              )}
            </div>
          </div>

          {/* Hero Visual */}
          <div className="relative flex justify-center items-center" data-purpose="hero-visualization">
            <div className="w-full aspect-square max-w-md animate-float relative">
              {/* Central Brain/Core */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-64 h-64 bg-teal-accent/10 rounded-full blur-3xl"></div>
                <div className="relative glass-card p-8 rounded-3xl border-teal-accent/20 w-48 h-48 flex items-center justify-center overflow-hidden">
                   <HeroCanvas />
                </div>
              </div>
              
              {/* Orbiting Elements */}
              <div className="absolute top-0 right-0 glass-card p-4 rounded-xl border-teal-accent/30 text-xs">
                ⚡ Low Token / 低能耗
              </div>
              <div className="absolute bottom-10 left-0 glass-card p-4 rounded-xl border-teal-accent/30 text-xs">
                🛡️ No Data Leaks / 隐私安全
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* K12 5-Subject Portal */}
      <SubjectPortal />

      {/* Features Grid */}
      <section className="py-24 bg-navy-800/50" id="features">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Core Capabilities / 核心功能</h2>
            <div className="w-20 h-1 bg-teal-accent mx-auto"></div>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="glass-card p-8 rounded-2xl hover:translate-y-[-8px] transition-transform duration-300">
              <div className="w-12 h-12 bg-teal-accent/10 rounded-lg flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-teal-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Rapid Customization</h3>
              <h4 className="text-teal-accent text-sm mb-4">快速定制</h4>
              <p className="text-ivory/60 text-sm leading-relaxed">
                Tailor AI workflows to your school's specific curriculum and administrative needs in hours, not weeks.
                <br/>数小时内即可根据学校特定的课程和行政需求定制 AI 工作流。
              </p>
            </div>
            
            <div className="glass-card p-8 rounded-2xl hover:translate-y-[-8px] transition-transform duration-300">
              <div className="w-12 h-12 bg-teal-accent/10 rounded-lg flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-teal-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Privacy First</h3>
              <h4 className="text-teal-accent text-sm mb-4">隐私至上</h4>
              <p className="text-ivory/60 text-sm leading-relaxed">
                Native Google AI security integration. No "OpenCraw" needed, ensuring 100% data sovereignty.
                <br/>原生 Google AI 安全集成，无需 OpenCraw，确保 100% 的数据主权。
              </p>
            </div>
            
            <div className="glass-card p-8 rounded-2xl hover:translate-y-[-8px] transition-transform duration-300">
              <div className="w-12 h-12 bg-teal-accent/10 rounded-lg flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-teal-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Task Execution</h3>
              <h4 className="text-teal-accent text-sm mb-4">高效执行</h4>
              <p className="text-ivory/60 text-sm leading-relaxed">
                Automate complex scheduling and reporting with minimal token consumption and maximum speed.
                <br/>以极低的 Token 消耗和极快的速度自动化处理复杂的排课与报表。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Vanpower Section */}
      <section className="py-24" id="why-us">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2">
              <img alt="Architecture Diagram" className="rounded-2xl shadow-2xl border border-ivory/10" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA3QHQoro-sBSZ6YOZsNniuJc881jFg1oVqelo9zI21AQ0rFxgyHV5h4lAnwxQwZnWu_k5_DPQWUYvnTlK4hjeBN83eCJSwwebx3q0K0iC_TOAPdcaHiEBnauBYzvGlo3Dzvmwr1t6CLV3lnbZ1SvQEP8HS3NnNJqD9jO2EZo5jWWhLu7cmcWqBtOn08AMlBljJXS0erTDCmrGh6igcxmaM_KvcK837VulN_QVHdzY0OuCC1rfMReV39dS64RqUiG0mYdCu9il-6Ntg" />
            </div>
            <div className="lg:w-1/2">
              <h2 className="text-3xl lg:text-4xl font-bold mb-6">Why VANPOWER? <br/><span className="text-teal-accent">为何选择 VANPOWER？</span></h2>
              <ul className="space-y-6">
                <li className="flex items-start gap-4">
                  <div className="mt-1 text-teal-accent">●</div>
                  <div>
                    <strong className="block text-lg">Sophisticated AI Integration / 精尖 AI 集成</strong>
                    <span className="text-ivory/60">Leveraging Gemini Pro and the full Google AI suite for unparalleled accuracy.</span>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="mt-1 text-teal-accent">●</div>
                  <div>
                    <strong className="block text-lg">Zero External Dependencies / 零外部依赖</strong>
                    <span className="text-ivory/60">Native architecture avoids insecure third-party scrapers or middleware.</span>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="mt-1 text-teal-accent">●</div>
                  <div>
                    <strong className="block text-lg">Exceptional Cost-Effectiveness / 卓越性价比</strong>
                    <span className="text-ivory/60">Optimized algorithms ensure the lowest token usage in the industry.</span>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-teal-accent/5" id="contact">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="glass-card p-12 rounded-3xl border-teal-accent/20">
            <h2 className="text-4xl font-bold mb-6">Ready to empower K12 education?</h2>
            <h3 className="text-2xl text-teal-accent mb-8">准备好赋能 K12 教育了吗？</h3>
            <p className="text-ivory/70 mb-10 text-lg">
              Join us to shape the future of learning with VANPOWER.
              <br/>加入我们，与 VANPOWER 一起塑造教育的未来。
            </p>
            <form className="flex flex-col md:flex-row gap-4 justify-center" onSubmit={(e) => {
              e.preventDefault();
              window.location.href = "mailto:sales@vanpower.live";
            }}>
              <input 
                className="px-6 py-4 rounded-lg bg-navy-900 border border-ivory/10 focus:border-teal-accent focus:ring-1 focus:ring-teal-accent outline-none w-full md:w-80" 
                placeholder="Enter email / 输入您的邮箱" 
                type="email" 
              />
              <button className="px-8 py-4 bg-teal-accent text-navy-900 font-bold rounded-lg hover:scale-105 transition-transform" type="submit">
                Book a Demo / 预约演示
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-navy-800">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-teal-accent rounded flex items-center justify-center">
              <span className="text-navy-900 font-bold text-sm">V</span>
            </div>
            <span className="font-bold tracking-tight">VANPOWER AI</span>
          </div>
          <div className="text-ivory/40 text-sm">
            © 2026 VANPOWER One Person Company. Powered by Google AI Ecosystem.
          </div>
          <div className="flex gap-6 text-ivory/60 hover:text-teal-accent transition-colors">
            <a href="#">Privacy / 隐私</a>
            <a href="#">Terms / 条款</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
