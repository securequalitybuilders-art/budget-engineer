import { Link } from 'react-router-dom';
import { FeedbackPanel } from '@/components/feedback/FeedbackPanel';
import { Button } from '@/components/ui/Button';
import { ArrowLeft } from 'lucide-react';

export function FeedbackPage() {
  return (
    <main className="relative min-h-[calc(100vh-3.5rem)] overflow-y-auto">
      <div className="absolute inset-0 aurora opacity-20 pointer-events-none" />

      <div className="relative mx-auto max-w-2xl px-4 py-8 lg:px-8">
        <div className="mb-6 flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft size={16} />
            </Button>
          </Link>
          <div>
            <h1 className="font-display text-2xl font-bold">Send Feedback</h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Help improve Budget Engineer — report issues or suggest features
            </p>
          </div>
        </div>

        <FeedbackPanel currentUrl={window.location.href} />
      </div>
    </main>
  );
}
