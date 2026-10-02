import apiClient from './client';

export const requestsApi = {
  // Student endpoints
  getStudentRequests: async (status = null) => {
    const params = status ? { status } : {};
    const response = await apiClient.get('/requests/', { params });
    return response.data;
  },

  createStudentRequest: async (payload) => {
    const response = await apiClient.post('/requests/', payload);
    return response.data;
  },

  getStudentRequestDetail: async (id) => {
    const response = await apiClient.get(`/requests/${id}/`);
    return response.data;
  },

  getStudentComments: async (requestId) => {
    const response = await apiClient.get(`/requests/${requestId}/comments/`);
    return response.data;
  },

  addStudentComment: async (requestId, body) => {
    const response = await apiClient.post(`/requests/${requestId}/comments/`, { body });
    return response.data;
  },

  uploadStudentAttachment: async (requestId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post(`/requests/${requestId}/attachments/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Staff endpoints
  getStaffQueue: async (filters = {}) => {
    const response = await apiClient.get('/staff/queue/', { params: filters });
    return response.data;
  },

  getStaffRequestDetail: async (id) => {
    const response = await apiClient.get(`/staff/queue/${id}/`);
    return response.data;
  },

  transitionRequest: async (id, targetStageId, note = '') => {
    const response = await apiClient.post(`/staff/queue/${id}/transition/`, {
      target_stage_id: targetStageId,
      note,
    });
    return response.data;
  },

  addStaffComment: async (requestId, body, isInternal = false) => {
    const response = await apiClient.post(`/staff/queue/${requestId}/comments/`, {
      body,
      is_internal: isInternal,
    });
    return response.data;
  },

  reassignRequest: async (requestId, assigneeId, note = '') => {
    const response = await apiClient.post(`/staff/queue/${requestId}/assign/`, {
      assignee_id: assigneeId,
      note,
    });
    return response.data;
  },

  // CSAT Feedback
  submitFeedback: async (requestId, payload) => {
    const response = await apiClient.post(`/requests/${requestId}/feedback/`, payload);
    return response.data;
  },

  getFeedback: async (requestId) => {
    const response = await apiClient.get(`/requests/${requestId}/feedback/`);
    return response.data;
  },

  // Appeal on rejection
  submitAppeal: async (requestId, reason) => {
    const response = await apiClient.post(`/requests/${requestId}/appeal/`, { reason });
    return response.data;
  },

  // Campus ERP / SIS profile
  getERPProfile: async (studentId = null) => {
    const response = await apiClient.get('/erp/profile/', {
      params: studentId ? { student_id: studentId } : {},
    });
    return response.data;
  },
};

