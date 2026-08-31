/**
 * @fileoverview Interactive Radial Bar / Sunburst chart visualizing hierarchical syllabus progress.
 */
import React from 'react';
import { RadialBarChart, RadialBar, Legend, Tooltip, ResponsiveContainer } from 'recharts';

const ProgressSunburst = ({ syllabusData }) => {
    // Transform hierarchical data into flat array for Recharts RadialBar
    const transformData = (data) => {
        let flatData = [];
        let total = 0;
        let mastered = 0;

        data.forEach(mod => {
            mod.topics.forEach(top => {
                top.subtopics.forEach(sub => {
                    total++;
                    if (sub.mastery === 'mastered') mastered++;

                    flatData.push({
                        name: sub.name,
                        value: sub.mastery === 'mastered' ? 100 : sub.mastery === 'reviewing' ? 50 : 0,
                        fill: sub.mastery === 'mastered' ? '#10b981' : sub.mastery === 'reviewing' ? '#f59e0b' : '#9ca3af',
                        moduleName: mod.name,
                        topicName: top.name
                    });
                });
            });
        });

        return { flatData, percentage: total > 0 ? Math.round((mastered / total) * 100) : 0 };
    };

    const { flatData, percentage } = transformData(syllabusData);

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{data.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{data.moduleName} &gt; {data.topicName}</p>
                    <p className="text-xs font-bold mt-1" style={{ color: data.fill }}>
                        Progress: {data.value}%
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="text-center mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Overall Syllabus Mastery</h3>
                <p className="text-4xl font-extrabold text-blue-600 dark:text-blue-400 mt-2">{percentage}%</p>
            </div>

            <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart
                        cx="50%"
                        cy="50%"
                        innerRadius="20%"
                        outerRadius="90%"
                        barSize={10}
                        data={flatData}
                        startAngle={90}
                        endAngle={-270}
                    >
                        <RadialBar
                            minAngle={15}
                            background={{ fill: '#e5e7eb' }}
                            clockWise
                            dataKey="value"
                            cornerRadius={5}
                        />
                        <Legend
                            iconSize={10}
                            layout="vertical"
                            verticalAlign="middle"
                            align="right"
                            wrapperStyle={{ fontSize: '12px', color: '#6b7280' }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                    </RadialBarChart>
                </ResponsiveContainer>
            </div>

            <div className="flex justify-center gap-6 mt-4 text-sm">
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-green-500"></span>
                    <span className="text-gray-600 dark:text-gray-400">Mastered</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                    <span className="text-gray-600 dark:text-gray-400">Reviewing</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-gray-400"></span>
                    <span className="text-gray-600 dark:text-gray-400">Not Started</span>
                </div>
            </div>
        </div>
    );
};

export default ProgressSunburst;
