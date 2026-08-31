import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, AlertTriangle, TrendingUp, Info, BarChart3, ShieldAlert, CheckCircle2 } from 'lucide-react';

const ReviewLoadForecast = ({ forecastData = {} }) => {
  const [hoveredDay, setHoveredDay] = useState(null);

  const forecast = forecastData.forecast || [];
  const totalDueNext30Days = forecastData.totalDueNext30Days || 0;
  const averageDailyLoad = forecastData.averageDailyLoad || 0;
  const heavyWorkloadDaysCount = forecastData.heavyWorkloadDaysCount || 0;
  const peakDay = forecastData.peakDay || { count: 0, dayLabel: 'N/A' };

  // Calculate max count for scaling bar heights
  const maxCount = Math.max(1, ...forecast.map((d) => d.dueCount || 0));

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-6 relative overflow-hidden">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-neutral-800 pb-5 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="text-stone-100 font-extrabold text-lg font-playfair tracking-tight">
              30-Day Review Load Forecast
            </h3>
          </div>
          <p className="text-stone-400 text-xs mt-1">
            SM-2 interval forecast & study schedule workload balancer
          </p>
        </div>

        {/* Heavy Workload Warning Badge */}
        {heavyWorkloadDaysCount > 0 ? (
          <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 text-rose-300 px-3.5 py-1.5 rounded-2xl text-xs font-bold animate-pulse">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>{heavyWorkloadDaysCount} Heavy Workload Day(s) Detected</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-3.5 py-1.5 rounded-2xl text-xs font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Balanced Workload Projected</span>
          </div>
        )}
      </div>

      {/* Summary Key Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-neutral-950/70 border border-neutral-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-stone-400 text-xs font-semibold">Total 30-Day Volume</div>
            <div className="text-2xl font-black text-stone-100 font-playfair mt-0.5">{totalDueNext30Days}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-neutral-950/70 border border-neutral-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-stone-400 text-xs font-semibold">Daily Average Load</div>
            <div className="text-2xl font-black text-stone-100 font-playfair mt-0.5">{averageDailyLoad} <span className="text-xs font-normal text-stone-400">cards/day</span></div>
          </div>
          <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-neutral-950/70 border border-neutral-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-stone-400 text-xs font-semibold">Peak Day Spike</div>
            <div className="text-2xl font-black text-rose-400 font-playfair mt-0.5">{peakDay.count} <span className="text-xs font-normal text-stone-400">({peakDay.dayLabel})</span></div>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Bar Chart Forecasting Projection Stage */}
      <div className="bg-neutral-950/80 border border-neutral-800 rounded-2xl p-5 relative">
        <div className="flex items-center justify-between text-xs text-stone-400 mb-4">
          <span className="font-mono">Upcoming 30 Calendar Days</span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Light (&le;15)</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Moderate (16-30)</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" /> Heavy (&gt;30)</span>
          </div>
        </div>

        {/* Forecast Bars Container */}
        <div className="h-48 flex items-end justify-between gap-1 pt-6 px-1 border-b border-neutral-800">
          {forecast.map((day, idx) => {
            const heightPct = maxCount > 0 ? Math.max(8, Math.round((day.dueCount / maxCount) * 100)) : 8;
            const isHovered = hoveredDay?.date === day.date;

            let barColor = 'bg-emerald-500/80 hover:bg-emerald-400';
            if (day.status === 'heavy') {
              barColor = 'bg-gradient-to-t from-rose-600 to-pink-500 shadow-lg shadow-rose-500/30';
            } else if (day.status === 'moderate') {
              barColor = 'bg-gradient-to-t from-amber-600 to-yellow-500';
            }

            return (
              <div
                key={day.date || idx}
                onMouseEnter={() => setHoveredDay(day)}
                onMouseLeave={() => setHoveredDay(null)}
                className="flex-1 flex flex-col items-center group relative h-full justify-end cursor-pointer"
              >
                {/* Bar */}
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${heightPct}%` }}
                  transition={{ duration: 0.5, delay: idx * 0.015 }}
                  className={`w-full max-w-[14px] rounded-t-md transition-all duration-200 ${barColor} ${
                    isHovered ? 'brightness-125 scale-110' : ''
                  }`}
                />

                {/* Day Label (Show every 5 days or hovered) */}
                {(idx % 5 === 0 || idx === 0 || isHovered) && (
                  <span className="text-[9px] text-stone-500 font-mono mt-2 truncate w-full text-center">
                    {day.dayLabel.split(' ')[1]}
                  </span>
                )}

                {/* Hover Tooltip */}
                {isHovered && (
                  <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-30 bg-neutral-900 border border-neutral-700 p-2.5 rounded-xl shadow-2xl text-center w-32 pointer-events-none">
                    <div className="text-[10px] text-stone-400 font-bold uppercase">{day.dayLabel}</div>
                    <div className="text-base font-extrabold text-stone-100 my-0.5">{day.dueCount} Cards</div>
                    {day.overdueCount > 0 && (
                      <div className="text-[9px] text-rose-400 font-semibold">Includes {day.overdueCount} Overdue</div>
                    )}
                    <div className={`text-[10px] font-bold mt-1 px-1.5 py-0.5 rounded-md inline-block ${
                      day.status === 'heavy' ? 'bg-rose-500/20 text-rose-300' : day.status === 'moderate' ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                    }`}>
                      {day.status.toUpperCase()} WORKLOAD
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ReviewLoadForecast;
