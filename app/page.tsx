'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Bot, TrendingUp, Shield, Zap, ArrowRight } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';

export default function Home() {
  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 via-transparent to-transparent" />

        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto max-w-3xl text-center"
          >
            <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-purple-500/10 px-4 py-2 border border-purple-500/20">
              <Bot className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-purple-400 font-medium">AI-Powered Analysis</span>
            </div>

            <h1 className="text-5xl font-bold tracking-tight sm:text-7xl mb-6">
              <span className="text-white">2 hours of research</span>
              <br />
              <span className="bg-gradient-to-r from-purple-400 via-orange-400 to-pink-400 bg-clip-text text-transparent">
                → 60 seconds
              </span>
            </h1>

            <p className="text-lg text-gray-400 mb-8 max-w-2xl mx-auto">
              Get AI-powered predictions and betting insights across 50+ bookmakers.
              Make smarter decisions with real-time data analysis.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/matches"
                className="rounded-lg bg-gradient-to-r from-purple-500 to-orange-500 px-8 py-4 text-lg font-semibold text-white shadow-lg hover:shadow-purple-500/50 transition-all inline-flex items-center justify-center gap-2"
              >
                Get Free Match Analysis
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/ai-desk"
                className="rounded-lg bg-white/5 border border-white/10 px-8 py-4 text-lg font-semibold text-white hover:bg-white/10 transition-all inline-flex items-center justify-center gap-2"
              >
                Ask Any Sports Question
                <Bot className="w-5 h-5" />
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-20 grid grid-cols-1 gap-8 sm:grid-cols-3"
          >
            <GlassCard className="p-6 text-center" hover={false}>
              <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-lg bg-purple-500/10">
                <TrendingUp className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                50+ Bookmakers
              </h3>
              <p className="text-sm text-gray-400">
                Compare odds and find the best value across all major betting platforms
              </p>
            </GlassCard>

            <GlassCard className="p-6 text-center" hover={false}>
              <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-lg bg-orange-500/10">
                <Zap className="w-6 h-6 text-orange-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Real-Time Analysis
              </h3>
              <p className="text-sm text-gray-400">
                Get instant insights on live matches with AI-powered predictions
              </p>
            </GlassCard>

            <GlassCard className="p-6 text-center" hover={false}>
              <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-lg bg-emerald-500/10">
                <Shield className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Responsible Gaming
              </h3>
              <p className="text-sm text-gray-400">
                Built-in risk assessment and bankroll management tools
              </p>
            </GlassCard>
          </motion.div>
        </div>
      </section>

      <section className="py-20 border-t border-white/5">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Trending Matches Today
            </h2>
            <p className="text-gray-400">
              AI-analyzed opportunities with highest confidence scores
            </p>
          </div>

          <div className="text-center">
            <Link
              href="/matches"
              className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors"
            >
              View All Matches
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20 border-t border-white/5 bg-gradient-to-b from-purple-500/5 to-transparent">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to make smarter bets?
          </h2>
          <p className="text-lg text-gray-400 mb-8 max-w-2xl mx-auto">
            Join thousands of users who trust our AI-powered analysis
          </p>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-500 to-orange-500 px-8 py-4 text-lg font-semibold text-white shadow-lg hover:shadow-purple-500/50 transition-all"
          >
            Start Free Trial
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
