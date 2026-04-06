import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000
});

export const fetchCompanies = (params = {}) =>
  api.get('/companies', { params }).then(r => r.data);

export const fetchDomains = () =>
  api.get('/companies/domains').then(r => r.data);

export const fetchMeta = () =>
  api.get('/companies/meta').then(r => r.data);

export const fetchEnrichment = (companyName) =>
  api.get(`/companies/${encodeURIComponent(companyName)}/enrich`).then(r => r.data);

export const queueEnrichment = (companyName) =>
  api.post(`/companies/${encodeURIComponent(companyName)}/enrich/queue`).then(r => r.data);

export const uploadFile = (file, onProgress) => {
  const form = new FormData();
  form.append('file', file);
  return api.post('/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress
      ? (e) => onProgress(Math.round((e.loaded * 100) / e.total))
      : undefined
  }).then(r => r.data);
};

export const refreshData = () =>
  api.post('/upload/refresh').then(r => r.data);

export default api;
