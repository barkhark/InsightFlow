import apiClient from './client';

export const servicesApi = {
  getServiceAreas: async () => {
    const response = await apiClient.get('/service-areas/');
    return response.data;
  },

  getServiceCategories: async (areaId = null) => {
    const params = areaId ? { area_id: areaId } : {};
    const response = await apiClient.get('/service-categories/', { params });
    return response.data;
  },

  getServiceCategoryDetail: async (categoryId) => {
    const response = await apiClient.get(`/service-categories/${categoryId}/`);
    return response.data;
  },
};
