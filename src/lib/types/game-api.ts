// Type definitions for Game Portal API

export interface GameMode {
    id: string;
    game_id: string;
    name: string;
    slug: string;
    description?: string;
    platform_fee: number;
    prize_distribution: Record<string, number>; // e.g., {"1": 60, "2": 30, "3": 10, "4": 0}
    min_players: number;
    max_players: number;
    affects_leaderboard: boolean;
    is_active: boolean;
}

export interface Room {
    id: string;
    game_id: string;
    mode_id: string;
    code: string;
    host_user_id: string;
    config: Record<string, any>;
    stakes: number;
    prize_distribution: Record<string, number>; // Player-configured splits for friend rooms
    status: 'waiting' | 'in_progress' | 'completed' | 'cancelled';
    max_players: number;
    created_at: string;
}

export interface RoomPlayer {
    room_id: string;
    user_id: string;
    status: 'joined' | 'ready' | 'playing' | 'left';
    score: number;
    is_winner: boolean;
    joined_at: string;
}

export interface UserSession {
    user: {
        id: string;
        username: string;
        avatar?: string;
        coins: number;
    };
    room?: {
        id: string;
        code: string;
        players: RoomPlayer[];
        config: Record<string, any>;
        stakes: number;
    };
    mode: 'online' | 'room' | 'practice';
    game_id: string;
}

export interface GameReportRequest {
    winner_id: string;
    scores: Record<string, number>;
    duration_seconds?: number;
    metadata?: Record<string, any>;
}

export interface GameReportResponse {
    success: boolean;
    coins_awarded?: number;
    new_balance?: number;
    leaderboard_updated: boolean;
    message?: string;
}

export interface LeaderboardEntry {
    user_id: string;
    username: string;
    avatar?: string;
    score: number;
    matches_played: number;
    wins: number;
    losses: number;
    rank: number;
}
