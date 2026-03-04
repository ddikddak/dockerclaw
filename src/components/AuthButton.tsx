// ============================================
// Auth Button - Sign-in/out with auth dialog
// ============================================

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogIn, LogOut, User, Loader2 } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { isSupabaseConfigured } from '@/lib/supabase';

export function AuthButton() {
  const { user, isLoading, signInWithEmail, signUpWithEmail, signOut } = useAuthContext();
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Don't render anything if Supabase isn't configured
  if (!isSupabaseConfigured) {
    return (
      <div className="text-xs text-gray-400 text-center">
        dockerclaw.app
        <br />
        Local-first boards
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-2">
        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
      </div>
    );
  }

  // Signed in: show user info + sign out
  if (user) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <User className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <span className="text-xs text-gray-600 truncate">
            {user.email}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 flex-shrink-0"
          onClick={() => signOut()}
        >
          <LogOut className="w-3.5 h-3.5" />
        </Button>
      </div>
    );
  }

  // Signed out: show sign in button
  const handleEmailAuth = async (mode: 'signin' | 'signup') => {
    setError('');
    setSubmitting(true);
    try {
      if (mode === 'signin') {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password);
      }
      setIsOpen(false);
      setEmail('');
      setPassword('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="w-full gap-2 text-xs"
        onClick={() => setIsOpen(true)}
      >
        <LogIn className="w-3.5 h-3.5" />
        Sign in to sync
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sign in to dockerclaw</DialogTitle>
          </DialogHeader>

          {/* Email/password form */}
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>
            <TabsContent value="signin" className="space-y-3 mt-3">
              <div className="space-y-1.5">
                <Label htmlFor="signin-email">Email</Label>
                <Input
                  id="signin-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="signin-password">Password</Label>
                <Input
                  id="signin-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleEmailAuth('signin')}
                />
              </div>
              <Button
                className="w-full"
                onClick={() => handleEmailAuth('signin')}
                disabled={submitting || !email || !password}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Sign in
              </Button>
            </TabsContent>
            <TabsContent value="signup" className="space-y-3 mt-3">
              <div className="space-y-1.5">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleEmailAuth('signup')}
                />
              </div>
              <Button
                className="w-full"
                onClick={() => handleEmailAuth('signup')}
                disabled={submitting || !email || !password}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Create account
              </Button>
            </TabsContent>
          </Tabs>

          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
