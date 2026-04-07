const BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Fetch dashboard statistics (total leads, status breakdown, source breakdown, employee breakdown).
 */
export const getDashboardStats = async (date_from, date_to) => {
    try {
        const queryParams = new URLSearchParams();
        if (date_from) queryParams.append('date_from', date_from);
        if (date_to) queryParams.append('date_to', date_to);
        
        let url = `${BASE_URL}/dashboard`;
        if (queryParams.toString()) url += `?${queryParams.toString()}`;

        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch dashboard stats');
        return await response.json();
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        throw error;
    }
};

/**
 * Fetch a paginated and filtered list of leads.
 */
export const getLeads = async (params = {}) => {
    try {
        const queryParams = new URLSearchParams();
        if (params.status) queryParams.append('status', params.status);
        if (params.source) queryParams.append('lead_source', params.source);
        if (params.search) queryParams.append('search', params.search);
        if (params.date_from) queryParams.append('date_from', params.date_from);
        if (params.date_to) queryParams.append('date_to', params.date_to);
        
        queryParams.append('skip', params.skip || 0);
        queryParams.append('limit', params.limit || 50);

        const response = await fetch(`${BASE_URL}/leads?${queryParams.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch leads');
        return await response.json();
    } catch (error) {
        console.error('Error fetching leads:', error);
        throw error;
    }
};

/**
 * Upload an Excel file to the backend.
 */
export const uploadLeads = async (file) => {
    try {
        const formData = new FormData();
        formData.append('file', file);

        // X-Upload-Token is required by the backend security guard.
        // Set VITE_UPLOAD_SECRET in the upload portal's Vercel env vars.
        const uploadToken = import.meta.env.VITE_UPLOAD_SECRET || '';

        const response = await fetch(`${BASE_URL}/upload`, {
            method: 'POST',
            body: formData,
            headers: {
                'X-Upload-Token': uploadToken,
            },
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || 'Upload failed');
        return data;
    } catch (error) {
        console.error('Error uploading leads:', error);
        throw error;
    }
};

/**
 * Export leads to Excel.
 */
export const exportLeads = async () => {
    try {
        window.open(`${BASE_URL}/export`, '_blank');
    } catch (error) {
        console.error('Error exporting leads:', error);
    }
};

/**
 * Update the status of a specific lead.
 */
export const updateLeadStatus = async (leadId, status) => {
    try {
        const response = await fetch(`${BASE_URL}/leads/${leadId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || 'Failed to update status');
        return data;
    } catch (error) {
        console.error('Error updating lead status:', error);
        throw error;
    }
};

