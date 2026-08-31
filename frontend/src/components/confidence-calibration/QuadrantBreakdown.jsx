import React from 'react';
import { Box, Typography, Grid, Paper, Tooltip, IconButton } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';

const QuadrantBreakdown = ({ quadrants }) => {
  if (!quadrants) return null;

  const total = Object.values(quadrants).reduce((acc, val) => acc + val, 0);
  
  const getPct = (val) => total > 0 ? Math.round((val / total) * 100) : 0;

  const QuadrantCard = ({ title, count, pct, color, action, description }) => (
    <Paper sx={{ p: 2, height: '100%', borderTop: `4px solid ${color}`, display: 'flex', flexDirection: 'column' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle1" fontWeight="bold">{title}</Typography>
        <Tooltip title={description}>
          <IconButton size="small"><InfoIcon fontSize="small" /></IconButton>
        </Tooltip>
      </Box>
      <Typography variant="h3" color={color} my={1}>{count}</Typography>
      <Typography variant="body2" color="textSecondary" mb={2}>{pct}% of answers</Typography>
      <Box mt="auto">
        <Typography variant="caption" sx={{ bgcolor: `${color}22`, color: color, p: 0.5, borderRadius: 1, fontWeight: 'bold' }}>
          Action: {action}
        </Typography>
      </Box>
    </Paper>
  );

  return (
    <Box mb={4}>
      <Typography variant="h6" mb={2}>Metacognitive Quadrants</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <QuadrantCard 
            title="Confidently Right"
            count={quadrants.confidently_right}
            pct={getPct(quadrants.confidently_right)}
            color="#4caf50" // green
            action="Maintain"
            description="High confidence and correct. Your knowledge is solid."
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <QuadrantCard 
            title="Confidently Wrong"
            count={quadrants.confidently_wrong}
            pct={getPct(quadrants.confidently_wrong)}
            color="#f44336" // red
            action="High Priority Review"
            description="High confidence but incorrect. Dangerous blind spots."
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <QuadrantCard 
            title="Unsure but Right"
            count={quadrants.unsure_but_right}
            pct={getPct(quadrants.unsure_but_right)}
            color="#ff9800" // orange
            action="Build Confidence"
            description="Lower confidence but correct. You know more than you think."
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <QuadrantCard 
            title="Unsure and Wrong"
            count={quadrants.unsure_and_wrong}
            pct={getPct(quadrants.unsure_and_wrong)}
            color="#9e9e9e" // grey
            action="Standard Review"
            description="Lower confidence and incorrect. Acknowledged knowledge gaps."
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default QuadrantBreakdown;
