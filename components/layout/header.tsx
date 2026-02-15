'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Bot, Menu, X } from 'lucide-react';

const navigation = [
  { name: 'Home', href: '/' },
  { name: 'Matches', href: '/matches' },
  { name: 'Picks', href: '/picks' },
  { name: 'AI Desk', href: '/ai-desk' },
  { name: 'Pricing', href: '/pricing' },
];

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#0a0a0b]/80 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between p-4 lg:px-8">
        <div className="flex lg:flex-1">
          <Link href="/" className="-m-1.5 p-1.5 flex items-center gap-2">
            <Bot className="h-8 w-8 text-purple-500" />
            <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-orange-400 bg-clip-text text-transparent">
              SportBot AI
            </span>
          </Link>
        </div>

        <div className="flex lg:hidden">
          <button
            type="button"
            className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-400"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        <div className="hidden lg:flex lg:gap-x-8">
          {navigation.map((item) => {
            const isActive = pathname === item.href ||
              (item.href === '/matches' && pathname === '/browse') ||
              (item.href === '/matches' && pathname.startsWith('/match/'));

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'relative text-sm font-medium transition-colors hover:text-purple-400',
                  isActive ? 'text-purple-400' : 'text-gray-300'
                )}
              >
                {item.name}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute -bottom-5 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-orange-500"
                  />
                )}
              </Link>
            );
          })}
        </div>

        <div className="hidden lg:flex lg:flex-1 lg:justify-end lg:gap-x-4">
          <Link
            href="/pricing"
            className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/pricing"
            className="rounded-lg bg-gradient-to-r from-purple-500 to-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:shadow-purple-500/50 transition-all"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="lg:hidden border-t border-white/5"
        >
          <div className="space-y-1 px-4 pb-4 pt-4">
            {navigation.map((item) => {
              const isActive = pathname === item.href ||
                (item.href === '/matches' && pathname === '/browse') ||
                (item.href === '/matches' && pathname.startsWith('/match/'));

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'block rounded-lg px-3 py-2 text-base font-medium',
                    isActive
                      ? 'bg-purple-500/10 text-purple-400'
                      : 'text-gray-300 hover:bg-white/5'
                  )}
                >
                  {item.name}
                </Link>
              );
            })}
            <div className="pt-4 space-y-2">
              <Link
                href="/pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-lg px-3 py-2 text-base font-medium text-gray-300 hover:bg-white/5"
              >
                Sign In
              </Link>
              <Link
                href="/pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-lg bg-gradient-to-r from-purple-500 to-orange-500 px-3 py-2 text-base font-semibold text-white text-center"
              >
                Get Started
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </header>
  );
}
