import API from './api';

export const getPacingPlan = async (payload) => {
  const response = await API.post('/pacing-coach/plan', payload);
  return response.data;
};

export const getLivePacing = async (payload) => {
  const response = await API.post('/pacing-coach/live', payload);
  return response.data;
};

export const getPacingAutopsy = async (payload) => {
  const response = await API.post('/pacing-coach/autopsy', payload);
  return response.data;
};

export const getSubjectPacingProfile = async (subjectId) => {
  const response = await API.get(`/pacing-coach/subjects/${subjectId}`);
  return response.data;
};
