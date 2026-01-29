import { Request, Response } from 'express';
import { User } from '../models/User';

export const getAllUsers = async (req: Request, res: Response) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Fetch failed', error });
    }
};

export const toggleBlockUser = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { is_blocked } = req.body;

        const user = await User.findByIdAndUpdate(id, { is_blocked }, { new: true });

        if (!user) return res.status(404).json({ message: 'User not found' });

        res.json({ message: `User ${is_blocked ? 'blocked' : 'unblocked'}`, user });
    } catch (error) {
        res.status(500).json({ message: 'Update failed', error });
    }
};
