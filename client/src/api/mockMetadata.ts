import api from "../lib/api";

export interface LinkMetadata {
    url: string;
    title: string;
    description: string;
    image: string;
    favicon: string;
    domain: string;
}

export const fetchLinkMetadata = async (url: string): Promise<LinkMetadata> => {
    try {
        const response = await api.post('/metadata', { url });
        return response.data;
    } catch (error) {
        console.error("Failed to fetch metadata:", error);
        // Return basic fallback if fetch fails
        return {
            url,
            title: "",
            description: "",
            image: "",
            favicon: "",
            domain: new URL(url).hostname
        };
    }
};
