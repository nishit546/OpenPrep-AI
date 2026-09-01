import API from './api';

export const getCalibrationSummary = async () => {
  const response = await API.get('/confidence-calibration/summary');
  return response.data;
};

export const getTopicCalibration = async () => {
  const response = await API.get('/confidence-calibration/topics');
  return response.data;
};

export const getCalibrationTrends = async () => {
  const response = await API.get('/confidence-calibration/trends');
  return response.data;
};
