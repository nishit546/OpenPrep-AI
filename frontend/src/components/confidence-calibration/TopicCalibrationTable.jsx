import React, { useState } from 'react';
import { 
  Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  TableSortLabel, Typography, Chip
} from '@mui/material';

const TopicCalibrationTable = ({ topicsData }) => {
  const [orderBy, setOrderBy] = useState('subjectName');
  const [order, setOrder] = useState('asc');

  if (!topicsData || topicsData.length === 0) return null;

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const getProp = (obj, property) => {
    if (property === 'subjectName') return obj.subjectName;
    if (property === 'calibrationQuality') return obj.calibrationQuality;
    return obj.metrics[property];
  };

  const sortedData = [...topicsData].sort((a, b) => {
    const aVal = getProp(a, orderBy);
    const bVal = getProp(b, orderBy);
    
    if (bVal < aVal) return order === 'asc' ? 1 : -1;
    if (bVal > aVal) return order === 'asc' ? -1 : 1;
    return 0;
  });

  const getQualityColor = (quality) => {
    switch (quality) {
      case 'Excellent': return 'success';
      case 'Good': return 'primary';
      case 'Fair': return 'warning';
      default: return 'error';
    }
  };

  return (
    <Paper sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h6" sx={{ p: 2 }}>Calibration by Subject</Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel active={orderBy === 'subjectName'} direction={orderBy === 'subjectName' ? order : 'asc'} onClick={() => handleRequestSort('subjectName')}>
                  Subject
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel active={orderBy === 'sampleSize'} direction={orderBy === 'sampleSize' ? order : 'asc'} onClick={() => handleRequestSort('sampleSize')}>
                  Answers
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel active={orderBy === 'accuracy'} direction={orderBy === 'accuracy' ? order : 'asc'} onClick={() => handleRequestSort('accuracy')}>
                  Accuracy
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel active={orderBy === 'averageConfidence'} direction={orderBy === 'averageConfidence' ? order : 'asc'} onClick={() => handleRequestSort('averageConfidence')}>
                  Avg Conf
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel active={orderBy === 'brierScore'} direction={orderBy === 'brierScore' ? order : 'asc'} onClick={() => handleRequestSort('brierScore')}>
                  Brier Score
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel active={orderBy === 'ece'} direction={orderBy === 'ece' ? order : 'asc'} onClick={() => handleRequestSort('ece')}>
                  ECE
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">
                <TableSortLabel active={orderBy === 'calibrationQuality'} direction={orderBy === 'calibrationQuality' ? order : 'asc'} onClick={() => handleRequestSort('calibrationQuality')}>
                  Quality
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedData.map((row) => (
              <TableRow key={row.subjectId}>
                <TableCell component="th" scope="row">{row.subjectName}</TableCell>
                <TableCell align="right">{row.metrics.sampleSize}</TableCell>
                <TableCell align="right">{(row.metrics.accuracy * 100).toFixed(1)}%</TableCell>
                <TableCell align="right">{(row.metrics.averageConfidence * 100).toFixed(1)}%</TableCell>
                <TableCell align="right">{row.metrics.brierScore?.toFixed(3) || 'N/A'}</TableCell>
                <TableCell align="right">{row.metrics.ece?.toFixed(3) || 'N/A'}</TableCell>
                <TableCell align="center">
                  <Chip label={row.calibrationQuality} color={getQualityColor(row.calibrationQuality)} size="small" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default TopicCalibrationTable;
