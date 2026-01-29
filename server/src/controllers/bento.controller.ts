import { Request, Response } from 'express';
import { BentoConfig } from '../models/BentoConfig';
import { User } from '../models/User';



export const getConfig = async (req: Request, res: Response) => {
    try {
        const { username } = req.params;
        const config = await BentoConfig.findOne({ username });

        // Also check if user exists/is blocked
        const user = await User.findOne({ username });

        if (!user) return res.status(404).json({ message: 'User not found' });
        if (user.is_blocked) return res.status(403).json({ message: 'User is blocked' });

        // If no config but user exists (shouldn't happen with new signup flow but possible for old data), return empty
        if (!config) {
            return res.json({ widgets: [], layouts: {} });
        }

        res.json(config);
    } catch (error) {
        res.status(500).json({ message: 'Fetch failed', error });
    }
};

export const syncConfig = async (req: Request & { user?: any }, res: Response) => {
    try {
        const { widgets, layouts } = req.body;
        const userId = req.user.id;

        // Verify user exists
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const config = await BentoConfig.findOneAndUpdate(
            { user: userId },
            {
                username: user.username, // keep synced
                widgets,
                layouts
            },
            { new: true, upsert: true }
        );



        res.json(config);
    } catch (error) {
        res.status(500).json({ message: 'Sync failed', error });
    }
};
