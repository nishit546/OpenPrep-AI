import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const CalibrationTrendChart = ({ trendData }) => {
  if (!trendData || trendData.length < 2) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center', bgcolor: '#f9f9f9', height: '100%' }}>
        <Typography variant="h6" color="textSecondary">Trend Data Unavailable</Typography>
        <Typography variant="body2" color="textSecondary">
          Not enough historical data to show a trend. Continue practicing to see how your calibration improves over time.
        </Typography>
      </Paper>
    );
  }

  const chartData = trendData.map(d => ({
    name: d.period,
    brierScore: d.brierScore !== null ? parseFloat(d.brierScore.toFixed(3)) : null,
    ece: d.ece !== null ? parseFloat(d.ece.toFixed(3)) : null,
    blindSpots: d.blindSpotCount,
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <Box sx={{ bgcolor: 'white', p: 1, border: '1px solid #ccc', borderRadius: 1 }}>
          <Typography variant="subtitle2">{label}</Typography>
          {payload.map(p => (
            <Typography key={p.dataKey} variant="body2" color={p.color}>
              {p.name}: {p.value}
            </Typography>
          ))}
        </Box>
      );
    }
    return null;
  };

  return (
    <Paper sx={{ p: 2, height: 400, display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" mb={2}>Calibration Trend Over Time</Typography>
      <Box sx={{ flexGrow: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
            <YAxis yAxisId="right" orientation="right" stroke="#ff7300" />
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" height={36}/>
            
            <Line yAxisId="left" type="monotone" dataKey="brierScore" name="Brier Score (Lower is better)" stroke="#8884d8" activeDot={{ r: 8 }} />
            <Line yAxisId="left" type="monotone" dataKey="ece" name="ECE (Lower is better)" stroke="#82ca9d" />
            <Line yAxisId="right" type="monotone" dataKey="blindSpots" name="Blind Spots" stroke="#ff7300" />
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
};

export default CalibrationTrendChart;
