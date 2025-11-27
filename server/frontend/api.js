// Funções de requisição à API
export async function apiRequest(url, options = {}, authToken) {
    const defaultOptions = {
        headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
            ...options.headers
        }
    };
    const response = await fetch(url, { ...defaultOptions, ...options });
    if (response.status === 401) throw new Error('Unauthorized');
    return response;
}
 