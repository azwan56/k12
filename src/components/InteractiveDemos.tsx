import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, BookOpen, Calculator, Brain, LineChart, ExternalLink, CloudSun, PenTool, Mic } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const generateAbstractPattern = (seed: string, color1: string, color2: string) => {
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23${color1}"/><stop offset="100%" stop-color="%23${color2}"/></linearGradient><pattern id="p" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="50" cy="50" r="2" fill="rgba(255,255,255,0.2)"/><path d="M0,50 Q25,25 50,50 T100,50" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1"/></pattern></defs><rect width="100%" height="100%" fill="url(%23g)"/><rect width="100%" height="100%" fill="url(%23p)"/><g transform="translate(600, 400)"><circle r="300" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="2"/><circle r="200" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1" stroke-dasharray="5,5"/><path d="M-200,0 L200,0 M0,-200 L0,200" stroke="rgba(255,255,255,0.1)" stroke-width="1"/><text x="0" y="0" fill="rgba(255,255,255,0.3)" font-family="monospace" font-size="24" text-anchor="middle" dominant-baseline="middle" letter-spacing="10">${seed}</text></g></svg>`;
};

const categories = [
  {
    id: 'learning',
    name: '学习工具试用',
    tools: [
      {
        id: 'wordsmith',
        name: 'Wordsmith',
        desc: '英语学习与写作助手',
        icon: <BookOpen className="w-5 h-5" />,
        url: 'https://wordsmith.vanpower.live',
        image: generateAbstractPattern('NATURAL_LANGUAGE_PROCESSING', '312e81', '4338ca'), // Indigo
        color: 'text-indigo-400',
        bg: 'bg-indigo-500/10',
        border: 'border-indigo-500/20',
        features: [
          'G5/G6高级词汇造句练习',
          '自定义字汇造句练习',
          '专业评估与语法纠正',
          '练习报告直发老师邮箱',
          '趣味积分奖励体系'
        ]
      },
      {
        id: 'writing-coach',
        name: 'Writing Coach',
        desc: '英语作文评估教练',
        icon: <PenTool className="w-5 h-5" />,
        url: 'https://writing-coach.vanpower.live',
        image: generateAbstractPattern('SYNTAX_ANALYSIS_ENGINE', '4c1d95', '7c3aed'), // Violet
        color: 'text-violet-400',
        bg: 'bg-violet-500/10',
        border: 'border-violet-500/20',
        features: [
          '多维度作文评分',
          '深度语法逻辑分析',
          '个性化修改建议',
          '历年真题模拟训练',
          '写作水平追踪报告'
        ]
      },
      {
        id: 'mathgenius',
        name: 'MathGenius',
        desc: '智能数学学习平台',
        icon: <Calculator className="w-5 h-5" />,
        url: 'https://mathgenius.vanpower.live',
        image: generateAbstractPattern('GEOMETRIC_COMPUTATION', '064e3b', '059669'), // Emerald
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20',
        features: [
          'G5数学核心技能组训练',
          '方程与图形面积全覆盖',
          '多重分步选项卡',
          '智能错题本分析',
          'Gemini AI定制教辅反馈'
        ]
      }
    ]
  },
];

export default function InteractiveDemos() {
  const [activeCategory, setActiveCategory] = useState(categories[0].id);
  const [activeTool, setActiveTool] = useState(categories[0].tools[0]);
  const { generateCustomTokenAndRedirect } = useAuth();

  const handleLaunchTool = (url: string) => {
    if (url.includes('vanpower.live') || url.includes('vanpower.web.app')) {
      generateCustomTokenAndRedirect(url);
    } else {
      window.open(url, '_blank');
    }
  };

  return (
    <section className="py-24 px-6 bg-navy-800/20 border-b border-navy-800" id="demos">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4 text-ivory">体验 K12 教育应用矩阵</h2>
          <p className="text-ivory/60 max-w-2xl mx-auto">
            亲自尝试我们的 AI 驱动教育应用。将鼠标悬停在下方不同的工具上，预览下一代教育智能场景。
          </p>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1 space-y-8">
            {categories.map((category) => (
              <div key={category.id}>
                <h3 className="text-sm font-medium text-teal-accent/70 uppercase tracking-wider mb-4 px-2">
                  {category.name}
                </h3>
                <div className="space-y-2">
                  {category.tools.map((tool) => {
                    const isActive = activeTool.id === tool.id;
                    return (
                      <button
                        key={tool.id}
                        onMouseEnter={() => {
                          setActiveCategory(category.id);
                          setActiveTool(tool);
                        }}
                        onClick={() => handleLaunchTool(tool.url)}
                        className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-200 flex items-center gap-3 ${isActive
                          ? `bg-navy-800 border-teal-accent/30 shadow-[0_0_15px_rgba(100,255,218,0.1)]`
                          : `border-transparent hover:bg-navy-800/50 hover:border-teal-accent/10 text-ivory/60 hover:text-ivory`
                          }`}
                      >
                        <div className={`p-2 rounded-lg ${isActive ? tool.bg : 'bg-navy-900'} ${isActive ? tool.color : 'text-ivory/40'}`}>
                          {tool.icon}
                        </div>
                        <div>
                          <div className={`font-medium ${isActive ? 'text-ivory' : ''}`}>{tool.name}</div>
                          <div className="text-xs text-ivory/40 mt-0.5">{tool.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Main Image Display */}
          <div className="lg:col-span-3">
            <div className="relative rounded-2xl border border-teal-accent/20 bg-navy-900 overflow-hidden shadow-2xl glass-card h-[600px] flex flex-col group cursor-pointer" onClick={() => handleLaunchTool(activeTool.url)}>
              {/* Browser Chrome */}
              <div className="h-12 border-b border-navy-800 bg-navy-900/80 flex items-center px-4 gap-2 shrink-0 z-20 relative">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                </div>
                <div className="ml-4 px-3 py-1.5 rounded-md bg-navy-900 border border-ivory/10 text-xs text-ivory/50 font-mono flex-1 max-w-md flex items-center gap-2">
                  <Sparkles className={`w-3 h-3 ${activeTool.color}`} />
                  <span className="truncate">{activeTool.url}</span>
                </div>
                <div className="ml-auto">
                  <a
                    href={activeTool.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-md hover:bg-teal-accent/10 text-ivory/60 hover:text-teal-accent transition-colors flex items-center gap-1 text-xs font-medium"
                    title="在新标签页中打开"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleLaunchTool(activeTool.url);
                    }}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">新标签页打开</span>
                  </a>
                </div>
              </div>

              {/* Image Container */}
              <div className="flex-1 relative bg-navy-900 overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTool.id}
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="absolute inset-0 w-full h-full"
                  >
                    <img
                      src={activeTool.image}
                      alt={`${activeTool.name} Preview`}
                      className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-navy-900 via-navy-900/20 to-transparent" />

                    {/* Floating Features */}
                    <div className="absolute inset-0 pointer-events-none">
                      {activeTool.features?.map((feature, idx) => (
                        <motion.div
                          key={`${activeTool.id}-feature-${idx}`}
                          initial={{ opacity: 0, x: 20, y: 0 }}
                          animate={{
                            opacity: [0, 1, 1, 0],
                            x: [20, 0, -10, -30],
                            y: [idx * 60 + 100, idx * 60 + 80, idx * 60 + 60, idx * 60 + 40]
                          }}
                          transition={{
                            duration: 4,
                            repeat: Infinity,
                            delay: idx * 0.8,
                            ease: "linear"
                          }}
                          className={`absolute right-12 px-4 py-2 rounded-lg border border-teal-accent/20 bg-navy-800/90 backdrop-blur-md text-sm font-medium ${activeTool.color} shadow-xl`}
                          style={{ top: 0 }}
                        >
                          {feature}
                        </motion.div>
                      ))}
                    </div>

                    {/* Overlay Content */}
                    <div className="absolute bottom-0 left-0 right-0 p-8 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${activeTool.border} ${activeTool.bg} text-xs font-medium ${activeTool.color} mb-4`}>
                        {activeTool.icon}
                        <span>{activeTool.name}</span>
                      </div>
                      <h3 className="text-3xl font-display font-bold text-ivory mb-2">{activeTool.desc}</h3>
                      <p className="text-ivory/60 max-w-xl">
                        点击卡片或右上角按钮，立即在真实环境中体验 {activeTool.name} 的强大功能。
                      </p>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
