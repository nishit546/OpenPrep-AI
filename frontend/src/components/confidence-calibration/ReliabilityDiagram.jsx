import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

const ReliabilityDiagram = ({ curveData }) => {
  if (!curveData || curveData.length === 0) return null;

  // Map backend buckets to chart points
  const chartData = curveData.map(b => {
    // b.min to b.max represents the range. We use midpoint for X axis plot.
    const midPoint = ((b.min + Math.min(b.max, 1.0)) / 2) * 100;
    
    return {
      name: b.label,
      midPoint: midPoint,
      observedAccuracy: b.observedAccuracy !== null ? b.observedAccuracy * 100 : null,
      sampleCount: b.count,
    };
  }).filter(d => d.sampleCount > 0); // only plot populated buckets

  // Add the perfect calibration diagonal line manually
  // X = Y, so we just use the midpoint as both values for the diagonal line
  const dataWithDiagonal = chartData.map(d => ({
    ...d,
    perfectCalibration: d.midPoint
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      return (
        <Box sx={{ bgcolor: 'white', p: 1, border: '1px solid #ccc', borderRadius: 1 }}>
          <Typography variant="body2" fontWeight="bold">Confidence: {label}</Typography>
          <Typography variant="body2">Observed Accuracy: {p.observedAccuracy?.toFixed(1)}%</Typography>
          <Typography variant="body2" color="textSecondary">Samples: {p.sampleCount}</Typography>
        </Box>
      );
    }
    return null;
  };

  return (
    <Paper sx={{ p: 2, height: 400, display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" mb={2}>Reliability Diagram</Typography>
      <Box sx={{ flexGrow: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={dataWithDiagonal} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" label={{ value: 'Stated Confidence', position: 'insideBottom', offset: -10 }} />
            <YAxis label={{ value: 'Observed Accuracy (%)', angle: -90, position: 'insideLeft' }} domain={[0, 100]} />
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" height={36}/>
            
            <Line 
              type="monotone" 
              dataKey="observedAccuracy" 
              name="Your Accuracy" 
              stroke="#8884d8" 
              activeDot={{ r: 8 }} 
              strokeWidth={3}
              connectNulls
            />
            
            <Line 
              type="monotone" 
              dataKey="perfectCalibration" 
              name="Perfect Calibration" 
              stroke="#82ca9d" 
              strokeDasharray="5 5" 
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </Box>
      <Typography variant="caption" color="textSecondary" align="center" mt={2} aria-live="polite">
        The closer your blue line is to the green dotted line, the better your metacognitive calibration.
      </Typography>
    </Paper>
  );
};

export default ReliabilityDiagram;
