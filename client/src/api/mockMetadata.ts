export interface LinkMetadata {
    url: string;
    title: string;
    description: string;
    image: string;
    favicon: string;
    domain: string;
}

export const fetchLinkMetadata = async (url: string): Promise<LinkMetadata> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (url.includes("error")) {
                reject(new Error("Failed to fetch metadata"));
                return;
            }

            if (url.includes("instagram")) {
                resolve({
                    url,
                    title: "Instagram",
                    description: "Create an account or log in to Instagram - A simple, fun & creative way to capture, edit & share photos, videos & messages with friends & family.",
                    image: "https://images.unsplash.com/photo-1611262588024-d12430b98920?w=1200&h=630&fit=crop",
                    favicon: "https://www.instagram.com/static/images/ico/favicon-192.png/68d99ba29cc8.png",
                    domain: "instagram.com",
                });
                return;
            }

            if (url.includes("linkedin")) {
                resolve({
                    url,
                    title: "LinkedIn: Log In or Sign Up",
                    description: "750 million+ members | Manage your professional identity. Build and engage with your professional network. Access knowledge, insights and opportunities.",
                    image: "https://images.unsplash.com/photo-1633409361618-c73427e4e206?w=1200&h=630&fit=crop",
                    favicon: "https://static.licdn.com/aero-v1/sc/h/al2o9zrvru7aqj8e1x2rzsrca",
                    domain: "linkedin.com",
                });
                return;
            }

            if (url.includes("twitter") || url.includes("x.com")) {
                resolve({
                    url,
                    title: "X. It's what's happening",
                    description: "From breaking news and entertainment to sports and politics, get the full story with all the live commentary.",
                    image: "https://images.unsplash.com/photo-1611605698323-b1e99cfd37ea?w=1200&h=630&fit=crop",
                    favicon: "https://abs.twimg.com/favicons/twitter.3.ico",
                    domain: "twitter.com",
                });
                return;
            }

            if (url.includes("youtube")) {
                resolve({
                    url,
                    title: "YouTube",
                    description: "Enjoy the videos and music you love, upload original content, and share it all with friends, family, and the world on YouTube.",
                    image: "https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=1200&h=630&fit=crop",
                    favicon: "https://www.youtube.com/favicon.ico",
                    domain: "youtube.com",
                });
                return;
            }

            if (url.includes("dribbble")) {
                resolve({
                    url,
                    title: "Dribbble - Discover the World's Top Designers & Creative Professionals",
                    description: "Find Top Designers & Creative Professionals on Dribbble. We are where designers gain inspiration, feedback, community, and jobs.",
                    image: "https://images.unsplash.com/photo-1626785774573-4b799315345d?w=1200&h=630&fit=crop",
                    favicon: "https://cdn.dribbble.com/assets/favicon-b38525134603b9513b174ec887944bde1a869eb6cd414f4d640ee48ab2a15a26b.ico",
                    domain: "dribbble.com",
                });
                return;
            }

            if (url.includes("medium")) {
                resolve({
                    url,
                    title: "How to Paint Like Hayao Miyazaki",
                    description: "A deep dive into the artistic techniques and philosophy behind Studio Ghibli's legendary animation style.",
                    image: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=1200&h=630&fit=crop",
                    favicon: "https://miro.medium.com/v2/1*m-R_BkNf1Qjr1YbyOIJY2w.png",
                    domain: "medium.com",
                });
                return;
            }

            if (url.includes("buymeacoffee")) {
                resolve({
                    url,
                    title: "Buy Me a Coffee",
                    description: "A simple way to support creators you love. Make someone's day!",
                    image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=1200&h=630&fit=crop",
                    favicon: "https://cdn.buymeacoffee.com/assets/img/favicon.ico",
                    domain: "buymeacoffee.com",
                });
                return;
            }

            if (url.includes("unsplash")) {
                resolve({
                    url,
                    title: "Berlin Architecture - Unsplash",
                    description: "Beautiful free images & pictures of Berlin's stunning architecture. Download royalty-free photos.",
                    image: "https://images.unsplash.com/photo-1560969184-10fe8719e047?w=1200&h=630&fit=crop",
                    favicon: "https://unsplash.com/favicon.ico",
                    domain: "unsplash.com",
                });
                return;
            }

            if (url.includes("github")) {
                resolve({
                    url,
                    title: "GitHub: Let's build from here",
                    description: "GitHub is where over 100 million developers shape the future of software, together. Contribute to the open source community, manage your Git repositories, review code like a pro, track bugs and features, power your CI/CD and DevOps workflows, and secure code before you commit it.",
                    image: "https://github.githubassets.com/images/modules/site/social-cards/github-social.png",
                    favicon: "https://github.githubassets.com/favicons/favicon.svg",
                    domain: "github.com",
                });
                return;
            }

            if (url.includes("vercel")) {
                resolve({
                    url,
                    title: "Vercel: Develop. Preview. Ship.",
                    description: "Vercel is the platform for frontend developers, providing the speed and reliability innovators need to create at the moment of inspiration.",
                    image: "https://assets.vercel.com/image/upload/front/vercel/twitter-card.png",
                    favicon: "https://assets.vercel.com/image/upload/front/favicon/vercel/favicon.ico",
                    domain: "vercel.com",
                });
                return;
            }

            // Default
            resolve({
                url,
                title: "Example Website - Page Title",
                description: "This is a generic description for the link preview. It represents what a user might see when sharing a link from a typical website.",
                image: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
                favicon: "https://www.google.com/favicon.ico",
                domain: "example.com",
            });
        }, 1500); // 1.5s delay
    });
};
