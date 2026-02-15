'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Check, Crown, Zap, ArrowRight } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for getting started',
    features: [
      '3 match analyses per day',
      'Basic AI predictions',
      'Community access',
      'Email support',
    ],
    cta: 'Start Free',
    popular: false,
  },
  {
    name: 'Pro',
    price: '$19.99',
    period: 'per month',
    description: 'For serious bettors',
    features: [
      'Unlimited match analyses',
      'Advanced AI predictions',
      'Real-time alerts',
      'Priority support',
      'Value bet scanner',
      'Historical data access',
    ],
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    name: 'Premium',
    price: '$49.99',
    period: 'per month',
    description: 'For professional bettors',
    features: [
      'Everything in Pro',
      'VIP picks access',
      'Custom AI models',
      'API access',
      'Dedicated account manager',
      'Early feature access',
      'Advanced analytics dashboard',
    ],
    cta: 'Contact Sales',
    popular: false,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl font-bold text-white mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Choose the perfect plan for your betting strategy. All plans include our core AI features.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <GlassCard
                className={`p-8 h-full flex flex-col ${
                  plan.popular ? 'border-2 border-purple-500/50 relative' : ''
                }`}
                hover={false}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-purple-500 to-orange-500 text-white text-xs font-semibold">
                    Most Popular
                  </div>
                )}

                <div className="mb-6">
                  {plan.name === 'Premium' && (
                    <Crown className="w-8 h-8 text-orange-400 mb-2" />
                  )}
                  {plan.name === 'Pro' && (
                    <Zap className="w-8 h-8 text-purple-400 mb-2" />
                  )}
                  <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                  <p className="text-sm text-gray-400">{plan.description}</p>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold text-white">{plan.price}</span>
                    <span className="text-gray-400">/ {plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  className={`w-full py-3 px-6 rounded-lg font-semibold transition-all inline-flex items-center justify-center gap-2 ${
                    plan.popular
                      ? 'bg-gradient-to-r from-purple-500 to-orange-500 text-white hover:shadow-lg hover:shadow-purple-500/50'
                      : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'
                  }`}
                >
                  {plan.cta}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-16 text-center"
        >
          <GlassCard className="p-8 max-w-3xl mx-auto" hover={false}>
            <h3 className="text-2xl font-bold text-white mb-4">
              All Plans Include
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-3xl font-bold text-purple-400 mb-2">50+</p>
                <p className="text-sm text-gray-400">Bookmakers Compared</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-orange-400 mb-2">24/7</p>
                <p className="text-sm text-gray-400">Real-Time Updates</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-emerald-400 mb-2">99.9%</p>
                <p className="text-sm text-gray-400">Uptime Guarantee</p>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-12 text-center"
        >
          <p className="text-sm text-gray-500">
            All plans come with a 14-day money-back guarantee. No questions asked.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Responsible Gaming • 18+ Only • Gamble Responsibly
          </p>
        </motion.div>
      </div>
    </div>
  );
}
