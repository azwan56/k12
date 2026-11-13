import { LogIn } from 'lucide-react';
import { BackLink } from '../../../k12/SubjectPage';

interface Props {
  backHref: string;
  needsSSOSync: boolean;
  onSignIn: () => void;
}

export default function SignInScreen({ backHref, needsSSOSync, onSignIn }: Props) {
  return (
    <>
      <BackLink href={backHref} />
      <div className="chunky bg-sky-100 mt-8 p-8 text-center">
        <div className="text-6xl" aria-hidden="true">🚀</div>
        <h1 className="text-3xl font-black mt-4">MathGenius</h1>
        <p className="text-lg font-bold text-sky-800 mt-2">登录后开始 AI 出题</p>
      </div>
      <button
        type="button"
        onClick={onSignIn}
        className="chunky bg-yellow-300 mt-8 w-full py-4 text-xl font-black flex items-center justify-center gap-2"
      >
        <LogIn className="w-6 h-6" aria-hidden="true" />
        {needsSSOSync ? '同步登录' : '用 Google 登录'}
      </button>
    </>
  );
}
