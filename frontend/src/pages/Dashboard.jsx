import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Flame, Play, FileText, Calendar, TrendingUp, Award, BookOpen, Target, CheckCircle, Clock } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as LineTooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';

import LeatherBoard from '../components/dashboard/LeatherBoard';
import VintagePaper from '../components/dashboard/VintagePaper';
import GoldTabButton from '../components/dashboard/GoldTabButton';
import PomodoroTimer from '../components/dashboard/PomodoroTimer';
import FlashcardWidget from '../components/dashboard/FlashcardWidget';
import PinnedTasks from '../components/dashboard/PinnedTasks';

const performanceData = [
  { name: 'Mon', score: 65 },
  { name: 'Tue', score: 72 },
  { name: 'Wed', score: 85 },
  { name: 'Thu', score: 78 },
  { name: 'Fri', score: 90 },
  { name: 'Sat', score: 95 },
  { name: 'Sun', score: 88 },
];

const radarData = [
  { subject: 'Math', A: 120, fullMark: 150 },
  { subject: 'Physics', A: 98, fullMark: 150 },
  { subject: 'Chemistry', A: 86, fullMark: 150 },
  { subject: 'CS', A: 130, fullMark: 150 },
  { subject: 'Biology', A: 85, fullMark: 150 },
  { subject: 'History', A: 65, fullMark: 150 },
];

const heatmapData = Array.from({ length: 30 }, () => Math.floor(Math.random() * 4));

const Dashboard = () => {
  return (
    <LeatherBoard>
      
      {/* --- QUICK ACTIONS TABS --- */}
      <div className="absolute -left-4 top-24 flex flex-col gap-4 z-30 hidden md:flex">
        <GoldTabButton icon={Play} label="Start Quiz" delay={0.1} />
        <GoldTabButton icon={FileText} label="Analyze PYQ" delay={0.2} />
        <GoldTabButton icon={Calendar} label="Study Plan" delay={0.3} />
        <GoldTabButton icon={TrendingUp} label="Reports" delay={0.4} />
      </div>

      <div className="pl-4 md:pl-16 pr-4 lg:pr-8 py-8 space-y-12">
        
        {/* --- HERO SECTION --- */}
        <div className="flex flex-col md:flex-row justify-between items-end border-b border-black/20 pb-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex-1"
          >
            <h1 className="text-5xl md:text-6xl font-bold text-gold-foil mb-2 font-playfair tracking-tight">
              Welcome back, Scholar.
            </h1>
            <p className="text-amber-100/70 text-lg italic font-playfair">
              "The roots of education are bitter, but the fruit is sweet." – Aristotle
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex items-center space-x-6 mt-6 md:mt-0"
          >
            <div className="flex flex-col items-center">
              <div className="relative">
                <Flame className="w-12 h-12 text-orange-500 animate-pulse-glow" fill="currentColor" />
                <div className="absolute inset-0 blur-md bg-orange-500/30 rounded-full" />
              </div>
              <span className="text-gold-foil font-bold text-2xl">14 Day</span>
              <span className="text-amber-200/50 text-xs uppercase tracking-widest">Streak</span>
            </div>
            
            <button className="bg-gradient-to-br from-yellow-600 to-yellow-800 text-yellow-50 px-8 py-4 rounded-sm border border-yellow-500/50 shadow-[0_4px_15px_rgba(0,0,0,0.5)] hover:shadow-[0_6px_20px_rgba(212,175,55,0.3)] transition-all flex items-center group">
              <span className="font-playfair font-bold text-lg tracking-wide group-hover:text-white">Resume Learning</span>
              <Play className="ml-3 w-5 h-5 text-yellow-300 group-hover:text-white" fill="currentColor" />
            </button>
          </motion.div>
        </div>

        {/* --- STATISTICS OVERVIEW --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <VintagePaper delay={0.2} className="border-t-4 border-t-red-800">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-neutral-800 font-playfair font-bold text-xl">Total Solved</h3>
              <Target className="text-neutral-600 w-5 h-5" />
            </div>
            <p className="text-4xl font-bold text-neutral-900 font-playfair">1,284</p>
            <p className="text-neutral-600 text-sm mt-2 italic border-t border-neutral-300 pt-2">+42 this week</p>
          </VintagePaper>

          <VintagePaper delay={0.3} className="border-t-4 border-t-green-800">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-neutral-800 font-playfair font-bold text-xl">Accuracy</h3>
              <CheckCircle className="text-neutral-600 w-5 h-5" />
            </div>
            <p className="text-4xl font-bold text-neutral-900 font-playfair">86%</p>
            <p className="text-neutral-600 text-sm mt-2 italic border-t border-neutral-300 pt-2">Top 15% of users</p>
          </VintagePaper>

          <VintagePaper delay={0.4} className="border-t-4 border-t-blue-800">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-neutral-800 font-playfair font-bold text-xl">Study Hours</h3>
              <Clock className="text-neutral-600 w-5 h-5" />
            </div>
            <p className="text-4xl font-bold text-neutral-900 font-playfair">142h</p>
            <p className="text-neutral-600 text-sm mt-2 italic border-t border-neutral-300 pt-2">Consistent learner</p>
          </VintagePaper>

          <VintagePaper delay={0.5} className="border-t-4 border-t-purple-800">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-neutral-800 font-playfair font-bold text-xl">Topics Done</h3>
              <BookOpen className="text-neutral-600 w-5 h-5" />
            </div>
            <p className="text-4xl font-bold text-neutral-900 font-playfair">24/48</p>
            <p className="text-neutral-600 text-sm mt-2 italic border-t border-neutral-300 pt-2">50% Course completion</p>
          </VintagePaper>
        </div>

        {/* --- ANALYTICS SECTION (WOODEN DESK) --- */}
        <div className="bg-wood-desk rounded-lg shadow-inner border border-black/50 p-6 relative overflow-hidden grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="absolute inset-0 shadow-[inset_0_0_50px_rgba(0,0,0,0.8)] pointer-events-none" />
          
          {/* Line Chart */}
          <VintagePaper animate={false} className="w-full h-full p-6 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
            <h2 className="text-2xl font-bold font-playfair text-neutral-900 mb-6 border-b border-neutral-400 pb-2">Weekly Performance</h2>
            <div className="h-64 w-full" style={{ minHeight: '250px', minWidth: '100%' }}>
              <ResponsiveContainer width="99%" height="100%" minHeight={250}>
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d4d4d4" />
                  <XAxis dataKey="name" stroke="#525252" tick={{fontFamily: 'Inter'}} />
                  <YAxis stroke="#525252" tick={{fontFamily: 'Inter'}} />
                  <LineTooltip 
                    contentStyle={{ backgroundColor: '#F5E6CA', border: '1px solid #8B4513', borderRadius: '4px' }}
                    itemStyle={{ color: '#3E2723', fontWeight: 'bold' }}
                  />
                  <Line type="monotone" dataKey="score" stroke="#8B4513" strokeWidth={3} dot={{ fill: '#8B4513', r: 5 }} activeDot={{ r: 8, fill: '#D4AF37' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </VintagePaper>

          {/* Radar Chart */}
          <VintagePaper animate={false} className="w-full h-full p-6 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
            <h2 className="text-2xl font-bold font-playfair text-neutral-900 mb-6 border-b border-neutral-400 pb-2">Subject Mastery</h2>
            <div className="h-64 w-full" style={{ minHeight: '250px', minWidth: '100%' }}>
              <ResponsiveContainer width="99%" height="100%" minHeight={250}>
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid stroke="#d4d4d4" />
                  <PolarAngleAxis dataKey="subject" tick={{fontFamily: 'Inter', fill: '#525252', fontSize: 12, fontWeight: 'bold'}} />
                  <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
                  <Radar name="Student" dataKey="A" stroke="#8B4513" strokeWidth={2} fill="#D4AF37" fillOpacity={0.6} />
                  <LineTooltip 
                    contentStyle={{ backgroundColor: '#F5E6CA', border: '1px solid #8B4513', borderRadius: '4px' }}
                    itemStyle={{ color: '#3E2723', fontWeight: 'bold' }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </VintagePaper>
        </div>

        {/* --- NEW WIDGETS ROW --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-center py-4">
          <div className="flex justify-center">
            <PomodoroTimer />
          </div>
          <div>
            <FlashcardWidget />
          </div>
          <div className="flex justify-center">
            <PinnedTasks />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* --- STUDY PROGRESS (INK RULERS) --- */}
          <VintagePaper delay={0.6} className="lg:col-span-1 shadow-[0_10px_20px_rgba(0,0,0,0.4)]">
            <h2 className="text-2xl font-bold font-playfair text-neutral-900 mb-6 border-b border-neutral-400 pb-2">Topic Completion</h2>
            
            <div className="space-y-6">
              {[
                { name: 'Data Structures', prog: 85 },
                { name: 'Algorithms', prog: 60 },
                { name: 'Operating Systems', prog: 40 },
                { name: 'Databases', prog: 90 },
                { name: 'Computer Networks', prog: 25 },
              ].map((topic, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm font-semibold text-neutral-800 mb-1">
                    <span>{topic.name}</span>
                    <span>{topic.prog}%</span>
                  </div>
                  {/* Ruler Background */}
                  <div className="h-4 w-full bg-neutral-300 rounded-sm border border-neutral-400 relative overflow-hidden shadow-inner">
                    {/* Tick marks */}
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTAgMGgwLjV2NWgtMC41eiIgZmlsbD0iIzlhM2FmIi8+PC9zdmc+')] opacity-50" />
                    {/* Ink Fill */}
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${topic.prog}%` }}
                      transition={{ duration: 1.5, delay: 0.5 + (i * 0.1), ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-blue-900 to-indigo-800 relative z-10"
                    />
                  </div>
                </div>
              ))}
            </div>
          </VintagePaper>

          {/* --- RECENT ACTIVITY TIMELINE --- */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-3xl font-bold font-playfair text-gold-foil border-b border-yellow-700/50 pb-2">Recent Notes</h2>
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-yellow-700/50 before:to-transparent">
              
              {[
                { title: 'Solved 2023 Mathematics PYQ', time: '2 hours ago', icon: FileText, color: 'text-blue-900' },
                { title: 'Completed Advanced React Quiz', time: 'Yesterday', icon: Target, color: 'text-green-900' },
                { title: 'Earned "Speed Demon" Badge', time: '2 days ago', icon: Award, color: 'text-yellow-700' },
              ].map((item, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 + (i * 0.2) }}
                  className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-yellow-600 bg-leather text-yellow-500 shadow-[0_0_10px_rgba(212,175,55,0.4)] shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 bg-vintage-paper rounded-sm shadow-paper border border-neutral-300">
                    <h3 className={`font-bold font-playfair ${item.color} text-lg`}>{item.title}</h3>
                    <p className="text-sm text-neutral-600 italic mt-1">{item.time}</p>
                  </div>
                </motion.div>
              ))}

            </div>
          </div>

        </div>

        {/* --- ACHIEVEMENT SHOWCASE & HEATMAP --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <VintagePaper delay={0.9}>
            <h2 className="text-2xl font-bold font-playfair text-neutral-900 mb-6 border-b border-neutral-400 pb-2 flex items-center">
              <Award className="mr-2" /> Trophy Cabinet
            </h2>
            <div className="flex justify-around items-center h-full pb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex flex-col items-center group cursor-pointer">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-700 p-1 shadow-[0_4px_10px_rgba(0,0,0,0.3)] group-hover:scale-110 transition-transform relative">
                    <div className="w-full h-full rounded-full border-2 border-yellow-200/50 bg-leather flex items-center justify-center">
                      <Award className="w-10 h-10 text-gold-foil" />
                    </div>
                  </div>
                  <span className="text-sm font-bold text-neutral-800 mt-3 text-center">Badge {i+1}</span>
                </div>
              ))}
            </div>
          </VintagePaper>

          <VintagePaper delay={1.0}>
            <h2 className="text-2xl font-bold font-playfair text-neutral-900 mb-4 border-b border-neutral-400 pb-2 flex items-center">
              <Calendar className="mr-2" /> Consistency
            </h2>
            <div className="grid grid-cols-10 gap-1 p-4 bg-neutral-200/50 rounded-sm border border-neutral-300 shadow-inner">
              {heatmapData.map((val, i) => {
                const colors = ['bg-neutral-300', 'bg-yellow-700/40', 'bg-yellow-700/70', 'bg-yellow-800'];
                return (
                  <motion.div 
                    key={i} 
                    whileHover={{ scale: 1.2 }}
                    className={`w-full aspect-square rounded-sm ${colors[val]}`} 
                  />
                );
              })}
            </div>
            <p className="text-xs text-center text-neutral-600 mt-2 italic">Last 30 Days</p>
          </VintagePaper>
        </div>

      </div>
    </LeatherBoard>
  );
};

export default Dashboard;
