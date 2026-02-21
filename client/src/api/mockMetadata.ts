export interface LinkMetadata {
    url: string;
    title: string;
    description: string;
    image: string;
    favicon: string;
    domain: string;
}

export const fetchLinkMetadata = async (url: string): Promise<LinkMetadata> => {
    let domain = "";
    try {
        domain = new URL(url).hostname;
    } catch {
        domain = "";
    }

    // No network call: return a minimal local fallback.
    return {
        url,
        title: "",
        description: "",
        image: "",
        favicon: "",
        domain
    };
};
