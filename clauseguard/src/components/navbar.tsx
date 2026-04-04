'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { Shield, FileText, History, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Navbar() {
  const { data: session } = useSession();

  return (
    <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-emerald-500" />
            <span className="text-xl font-bold text-white">
              Clause<span className="text-emerald-500">Guard</span>
            </span>
          </Link>

          {session ? (
            <div className="flex items-center gap-1 sm:gap-2">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-slate-800">
                  <FileText className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Analyze</span>
                </Button>
              </Link>
              <Link href="/history">
                <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-slate-800">
                  <History className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">History</span>
                </Button>
              </Link>
              <div className="flex items-center gap-2 ml-2 pl-2 border-l border-slate-700">
                <div className="hidden sm:flex items-center gap-1 text-sm text-slate-400">
                  <User className="h-3.5 w-3.5" />
                  {session.user?.name || session.user?.email}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="text-slate-400 hover:text-red-400 hover:bg-slate-800"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <Link href="/auth">
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Get Started
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
