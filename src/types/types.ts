// Типы для параметров турнира
export interface TournamentSettings {
    name: string;
    participantsCount: number;
    matchesPerStage: number;
    tiebreakType: TiebreakType;
    bracketType: BracketType;
}

// Типы тайбрейка
export enum TiebreakType {
    GOALS_DIFFERENCE = "Разница голов",
    PENALTY_SHOOTOUT = "Серия пенальти",
    ADDITIONAL_TIME = "Дополнительное время"
}

// Типы сетки
export enum BracketType {
    FIXED = "Жесткая сетка",
    RESEEDING = "Перепосев",
    DRAW_EACH_ROUND = "Жеребьевка после каждого тура"
}

// Тип для участника
export interface Participant {
    id: string;
    firstName: string;
    lastName: string;
    rating: number;
    city?: string;
    teamName?: string;
    logo?: string;
    seed?: number;
}

// Тип для матча
export interface Match {
    id: string;
    round: number;
    matchNumber: number;
    participant1Id: string | null;
    participant2Id: string | null;
    score1: number | null;
    score2: number | null;
    winnerId: string | null;
    loserId: string | null;
    nextMatchId: string | null;
    played: boolean;
}

// Тип для результатов участника
export interface ParticipantResult {
    participantId: string;
    wins: number;
    losses: number;
    draws: number;
    goalsScored: number;
    goalsConceded: number;
    points: number;
}

// Тип для всего турнира
export interface Tournament {
    settings: TournamentSettings;
    participants: Participant[];
    matches: Match[];
    results: ParticipantResult[];
    currentRound: number;
}

// Add this to your types.ts file to support the visualPosition property

// Extending the Match interface
export interface Match {
    id: string;
    round: number;
    matchNumber: number;
    participant1Id: string | null;
    participant2Id: string | null;
    score1: number | null;
    score2: number | null;
    winnerId: string | null;
    loserId: string | null;
    nextMatchId: string | null;
    played: boolean;
    // For visualization purposes
    visualPosition?: number;
}
