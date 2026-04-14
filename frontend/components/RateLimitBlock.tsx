'use client';

interface RateLimitBlockProps {
  onUpgrade: () => void;
}

export default function RateLimitBlock({ onUpgrade }: RateLimitBlockProps) {
  return (
    <div className="mx-auto max-w-[480px] w-full flex flex-col items-center text-center px-6 py-12">
      <div className="w-12 h-12 rounded-full bg-bg-secondary flex items-center justify-center mb-5 text-text-secondary text-xl" aria-hidden="true">
        ⏸
      </div>

      <h2 className="font-serif italic text-2xl text-text-primary mb-3">
        You&apos;ve used your free searches
      </h2>

      <p className="text-sm text-text-secondary leading-relaxed mb-6">
        This is a one-person project and every search costs real money in AI and hosting fees. Free accounts get 2 searches per week — if you want unlimited, it&apos;s $5/month to help cover the costs. Cancel anytime.
      </p>

      <button
        onClick={onUpgrade}
        className="px-4 py-2 rounded-lg text-sm font-medium bg-accent text-white hover:bg-accent-hover"
      >
        Upgrade to Unlimited
      </button>

      <p className="text-xs text-text-tertiary mt-3">
        Redirects to Stripe checkout
      </p>
    </div>
  );
}
