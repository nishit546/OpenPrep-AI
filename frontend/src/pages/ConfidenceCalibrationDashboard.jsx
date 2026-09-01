import React, { useState, useEffect } from 'react';
import { Container, Typography, Grid, Paper, Box, CircularProgress, Alert } from '@mui/material';
import { 
  getCalibrationSummary, 
  getTopicCalibration, 
  getCalibrationTrends 
} from '../services/confidenceCalibrationApi';
import ReliabilityDiagram from '../components/confidence-calibration/ReliabilityDiagram';
import QuadrantBreakdown from '../components/confidence-calibration/QuadrantBreakdown';
import BlindSpotsPanel from '../components/confidence-calibration/BlindSpotsPanel';
import TopicCalibrationTable from '../components/confidence-calibration/TopicCalibrationTable';
import CalibrationTrendChart from '../components/confidence-calibration/CalibrationTrendChart';

const ConfidenceCalibrationDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [summary, setSummary] = useState(null);
  const [topics, setTopics] = useState([]);
  const [trends, setTrends] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [summaryRes, topicsRes, trendsRes] = await Promise.all([
          getCalibrationSummary(),
          getTopicCalibration(),
          getCalibrationTrends()
        ]);
        
        setSummary(summaryRes.data);
        setTopics(topicsRes.data || []);
        setTrends(trendsRes.data || []);
      } catch (err) {
        setError(err.response?.data?.error || err.message || 'Failed to load calibration data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography mt={2}>Loading your metacognitive profile...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!summary) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h5" mb={2}>Metacognitive Accuracy Engine</Typography>
          <Typography color="textSecondary">
            You haven't submitted any confidence ratings yet. 
            Once you start rating your confidence during quizzes, your calibration profile will appear here.
          </Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 8 }}>
      <Typography variant="h4" mb={1}>Confidence Calibration Dashboard</Typography>
      <Typography variant="body1" color="textSecondary" mb={4}>
        Analyze your metacognitive accuracy. Discover if you truly know what you think you know.
      </Typography>

      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
            <Typography variant="subtitle2" color="textSecondary">Brier Score</Typography>
            <Typography variant="h4" color="primary">{summary.brierScore?.toFixed(3) || 'N/A'}</Typography>
            <Typography variant="caption" color="textSecondary">(Lower is better, 0 is perfect)</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
            <Typography variant="subtitle2" color="textSecondary">Expected Calibration Error (ECE)</Typography>
            <Typography variant="h4" color="secondary">{summary.ece ? (summary.ece * 100).toFixed(1) + '%' : 'N/A'}</Typography>
            <Typography variant="caption" color="textSecondary">(Lower is better)</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
            <Typography variant="subtitle2" color="textSecondary">Over/Under Confidence</Typography>
            <Typography variant="h6" color={summary.overUnderConfidence > 0 ? 'error' : (summary.overUnderConfidence < 0 ? 'warning.main' : 'success.main')}>
              {summary.overUnderMessage}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
            <Typography variant="subtitle2" color="textSecondary">Resolution / Discrimination</Typography>
            <Typography variant="h4" color="info.main">{summary.discrimination ? (summary.discrimination * 100).toFixed(1) + '%' : 'N/A'}</Typography>
            <Typography variant="caption" color="textSecondary">Gap between confidence on correct vs incorrect</Typography>
          </Paper>
        </Grid>
      </Grid>

      <QuadrantBreakdown quadrants={summary.quadrants} />

      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={8}>
          <ReliabilityDiagram curveData={summary.reliabilityCurve} />
        </Grid>
        <Grid item xs={12} md={4}>
          <BlindSpotsPanel blindSpots={summary.blindSpots} />
        </Grid>
      </Grid>
      
      {trends && trends.length > 0 && (
        <Box mb={4}>
          <CalibrationTrendChart trendData={trends} />
        </Box>
      )}

      <TopicCalibrationTable topicsData={topics} />
      
    </Container>
  );
};

export default ConfidenceCalibrationDashboard;
