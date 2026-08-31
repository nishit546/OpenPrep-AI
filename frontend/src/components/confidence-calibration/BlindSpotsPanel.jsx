import React from 'react';
import { Box, Typography, Paper, List, ListItem, ListItemText, Divider, Chip } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

const BlindSpotsPanel = ({ blindSpots }) => {
  if (!blindSpots || blindSpots.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center', bgcolor: '#f9f9f9' }}>
        <Typography variant="h6" color="textSecondary">No Blind Spots Detected</Typography>
        <Typography variant="body2" color="textSecondary">
          Great job! You haven't made any high-confidence mistakes in this dataset.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Box display="flex" alignItems="center" mb={2}>
        <WarningAmberIcon color="error" sx={{ mr: 1 }} />
        <Typography variant="h6">Blind Spots (High Priority)</Typography>
      </Box>
      <Typography variant="body2" color="textSecondary" mb={2}>
        These are questions you answered incorrectly while having high confidence (>= 70%).
        Reviewing these concepts will fix critical gaps in your metacognition.
      </Typography>
      
      <List disablePadding>
        {blindSpots.slice(0, 10).map((spot, index) => (
          <React.Fragment key={spot.questionId || index}>
            <ListItem alignItems="flex-start" sx={{ px: 0 }}>
              <ListItemText
                primary={
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle2">Question ID: {spot.questionId}</Typography>
                    <Chip label={`Confidence: ${Math.round(spot.confidence * 100)}%`} color="error" size="small" />
                  </Box>
                }
                secondary={
                  <Box mt={1}>
                    <Typography variant="body2" color="textPrimary">{spot.reason}</Typography>
                    <Typography variant="caption" sx={{ display: 'inline-block', mt: 0.5, bgcolor: '#f5f5f5', p: 0.5, borderRadius: 1 }}>
                      Action: {spot.action}
                    </Typography>
                  </Box>
                }
              />
            </ListItem>
            {index < Math.min(blindSpots.length, 10) - 1 && <Divider component="li" />}
          </React.Fragment>
        ))}
      </List>
      {blindSpots.length > 10 && (
        <Typography variant="caption" color="textSecondary" sx={{ display: 'block', textAlign: 'center', mt: 2 }}>
          Showing top 10 highest priority blind spots.
        </Typography>
      )}
    </Paper>
  );
};

export default BlindSpotsPanel;
