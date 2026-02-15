'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/glass-card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingUp, Activity, Cloud, UserX, AlertCircle } from 'lucide-react';
import { Alert } from '@/lib/supabase';

interface AlertsPanelProps {
  alerts: Alert[];
}

export function AlertsPanel({ alerts }: AlertsPanelProps) {
  if (!alerts || alerts.length === 0) {
    return null;
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'value_bet':
        return <TrendingUp className="w-5 h-5" />;
      case 'line_movement':
        return <Activity className="w-5 h-5" />;
      case 'injury':
        return <UserX className="w-5 h-5" />;
      case 'weather':
        return <Cloud className="w-5 h-5" />;
      case 'odds_drop':
        return <TrendingUp className="w-5 h-5" />;
      case 'sharp_action':
        return <AlertCircle className="w-5 h-5" />;
      default:
        return <AlertTriangle className="w-5 h-5" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'high':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
      default:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    }
  };

  const getAlertBgColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-gradient-to-r from-rose-500/10 to-rose-500/5 border-rose-500/20';
      case 'high':
        return 'bg-gradient-to-r from-orange-500/10 to-orange-500/5 border-orange-500/20';
      case 'medium':
        return 'bg-gradient-to-r from-yellow-500/10 to-yellow-500/5 border-yellow-500/20';
      default:
        return 'bg-gradient-to-r from-blue-500/10 to-blue-500/5 border-blue-500/20';
    }
  };

  return (
    <GlassCard className="p-6" hover={false}>
      <div className="flex items-center gap-2 mb-6">
        <AlertTriangle className="w-5 h-5 text-orange-400" />
        <h3 className="text-lg font-bold text-white">Live Alerts</h3>
        <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20 ml-auto">
          {alerts.length}
        </Badge>
      </div>

      <div className="space-y-3">
        {alerts.map((alert, index) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`p-4 rounded-lg border ${getAlertBgColor(alert.severity)}`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${getSeverityColor(alert.severity)}`}>
                {getAlertIcon(alert.alert_type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold text-white text-sm">{alert.title}</h4>
                  <Badge className={getSeverityColor(alert.severity)}>
                    {alert.severity}
                  </Badge>
                </div>
                <p className="text-sm text-gray-300">{alert.message}</p>
                <p className="text-xs text-gray-500 mt-2">
                  {new Date(alert.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </GlassCard>
  );
}
