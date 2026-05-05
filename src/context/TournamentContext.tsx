import React, { createContext, useContext, useState, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
    Tournament,
    TournamentSettings,
    Participant,
    Match,
    BracketType,
    ParticipantResult,
} from '../types/types';

interface TournamentContextType {
    tournament: Tournament | null;
    createTournament: (settings: TournamentSettings) => void;
    addParticipant: (participant: Omit<Participant, 'id' | 'seed'>) => void;
    updateParticipant: (participant: Participant) => void;
    removeParticipant: (id: string) => void;
    generateBracket: () => void;
    updateMatchResult: (matchId: string, score1: number, score2: number) => void;
    getParticipantMatches: (participantId: string) => Match[];
    getCurrentRoundMatches: () => Match[];
    getMatchById: (matchId: string) => Match | undefined;
}

const TournamentContext = createContext<TournamentContextType | undefined>(undefined);

export const useTournament = () => {
    const context = useContext(TournamentContext);
    if (context === undefined) {
        throw new Error('useTournament must be used within a TournamentProvider');
    }
    return context;
};

export const TournamentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [tournament, setTournament] = useState<Tournament | null>(null);

    const createTournament = (settings: TournamentSettings) => {
        setTournament({
            settings,
            participants: [],
            matches: [],
            results: [],
            currentRound: 0
        });
    };

    const addParticipant = (participant: Omit<Participant, 'id' | 'seed'>) => {
        if (!tournament) return;

        const newParticipant: Participant = {
            ...participant,
            id: uuidv4(),
            seed: tournament.participants.length + 1
        };

        const initialResult: ParticipantResult = {
            participantId: newParticipant.id,
            wins: 0,
            losses: 0,
            draws: 0,
            goalsScored: 0,
            goalsConceded: 0,
            points: 0
        };

        setTournament(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                participants: [...prev.participants, newParticipant],
                results: [...prev.results, initialResult]
            };
        });
    };

    const updateParticipant = (participant: Participant) => {
        if (!tournament) return;
        setTournament(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                participants: prev.participants.map(p =>
                    p.id === participant.id ? participant : p
                )
            };
        });
    };

    const removeParticipant = (id: string) => {
        if (!tournament) return;
        setTournament(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                participants: prev.participants.filter(p => p.id !== id),
                results: prev.results.filter(r => r.participantId !== id),
                matches: prev.matches.map(m => ({
                    ...m,
                    participant1Id: m.participant1Id === id ? null : m.participant1Id,
                    participant2Id: m.participant2Id === id ? null : m.participant2Id,
                    winnerId: m.winnerId === id ? null : m.winnerId,
                    loserId: m.loserId === id ? null : m.loserId,
                }))
            };
        });
    };

    const generateBracket = () => {
    if (!tournament || tournament.participants.length < 2) return;

    let currentParticipants = [...tournament.participants];
    const size = tournament.settings.participantsCount;
    const requiredSize = Math.pow(2, Math.ceil(Math.log2(currentParticipants.length)));
    
    // Добавляем BYE-участников при необходимости
    while (currentParticipants.length < requiredSize) {
        const byeParticipant: Participant = {
            id: `bye-${uuidv4()}`,
            firstName: 'BYE',
            lastName: '',
            rating: 0,
            seed: 9999
        };
        currentParticipants.push(byeParticipant);
    }

    // Сортировка участников по рейтингу для посева
    const seededParticipants = [...currentParticipants].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    
    const allMatches: Match[] = [];  // ← Переименовано, чтобы избежать конфликта
    const totalRounds = Math.log2(requiredSize);
    let previousRoundMatches: Match[] = [];

    for (let round = 1; round <= totalRounds; round++) {
        const matchesInRound = requiredSize / Math.pow(2, round);
        const roundMatches: Match[] = [];  // ← Объявляем ЗДЕСЬ, внутри цикла
        
        for (let i = 0; i < matchesInRound; i++) {
            const matchId = uuidv4();
            let p1Id: string | null = null;
            let p2Id: string | null = null;
            
            if (round === 1) {
                p1Id = seededParticipants[i * 2]?.id ?? null;
                p2Id = seededParticipants[i * 2 + 1]?.id ?? null;
            } else {
                // Для следующих раундов связываем с предыдущими матчами
                const prevMatch1 = previousRoundMatches[i * 2];
                const prevMatch2 = previousRoundMatches[i * 2 + 1];
                if (prevMatch1) prevMatch1.nextMatchId = matchId;
                if (prevMatch2) prevMatch2.nextMatchId = matchId;
            }
            
            const newMatch: Match = {
                id: matchId,
                round: round,
                matchNumber: i + 1,
                participant1Id: p1Id,
                participant2Id: p2Id,
                score1: null,
                score2: null,
                winnerId: null,
                loserId: null,
                nextMatchId: null,
                played: false,
            };
            
            // Автоматический проход BYE
            if (round === 1) {
                if (p1Id?.startsWith('bye-') && p2Id && !p2Id.startsWith('bye-')) {
                    newMatch.winnerId = p2Id;
                    newMatch.loserId = p1Id;
                    newMatch.played = true;
                } else if (p2Id?.startsWith('bye-') && p1Id && !p1Id.startsWith('bye-')) {
                    newMatch.winnerId = p1Id;
                    newMatch.loserId = p2Id;
                    newMatch.played = true;
                }
            }
            
            roundMatches.push(newMatch);
        }
        
        allMatches.push(...roundMatches);
        previousRoundMatches = roundMatches;
    }

    setTournament(prev => {
        if (!prev) return prev;
        return {
            ...prev,
            matches: allMatches,
            currentRound: 1
        };
    });
};

    const updateMatchResult = (matchId: string, score1: number, score2: number) => {
        if (!tournament) return;

        setTournament(prev => {
            if (!prev) return prev;

            const matchIndex = prev.matches.findIndex(m => m.id === matchId);
            if (matchIndex === -1) return prev;

            const match = prev.matches[matchIndex];
            
            // Определяем победителя
           let winnerId: string | null = null;
           let loserId: string | null = null;
           let isTie = false;

            if (score1 > score2) {
            winnerId = match.participant1Id;
            loserId = match.participant2Id;
            } else if (score2 > score1) {
            winnerId = match.participant2Id;
            loserId = match.participant1Id;
            } else {
            // НИЧЬЯ - определяем победителя по рейтингу
            const p1 = prev.participants.find(p => p.id === match.participant1Id);
            const p2 = prev.participants.find(p => p.id === match.participant2Id);
            
            // Побеждает участник с более высоким рейтингом
            if ((p1?.rating || 0) >= (p2?.rating || 0)) {
                winnerId = match.participant1Id;
                loserId = match.participant2Id;
            } else {
                winnerId = match.participant2Id;
                loserId = match.participant1Id;
            }
            
            console.log(`Ничья ${score1}:${score2}. Победитель по рейтингу: ${winnerId === match.participant1Id ? p1?.firstName : p2?.firstName}`);
        }
    

            
            const updatedMatches = [...prev.matches];
            updatedMatches[matchIndex] = {
                ...match,
                score1,
                score2,
                winnerId,
                loserId,
                played: true,
            };
            
            // Обновляем статистику участников
            const updatedResults = [...prev.results];
            
            const updateStats = (participantId: string | null, isWinner: boolean, isLoser: boolean, goalsFor: number, goalsAgainst: number) => {
                if (!participantId || participantId.startsWith('bye-')) return;
                const idx = updatedResults.findIndex(r => r.participantId === participantId);
                if (idx !== -1) {
                    const current = updatedResults[idx];
                    updatedResults[idx] = {
                        ...current,
                        wins: current.wins + (isWinner ? 1 : 0),
                        losses: current.losses + (isLoser ? 1 : 0),
                        draws: current.draws + (isTie ? 1 : 0),
                        goalsScored: current.goalsScored + goalsFor,
                        goalsConceded: current.goalsConceded + goalsAgainst,
                        points: current.points + (isWinner ? 3 : (isTie ? 1 : 0))
                    };
                }
            };
            
            updateStats(match.participant1Id, winnerId === match.participant1Id, loserId === match.participant1Id, score1, score2);
            updateStats(match.participant2Id, winnerId === match.participant2Id, loserId === match.participant2Id, score2, score1);
            
            // Продвигаем победителя в следующий раунд
            if (!isTie && winnerId && match.nextMatchId) {
                const nextMatchIndex = updatedMatches.findIndex(m => m.id === match.nextMatchId);
                if (nextMatchIndex !== -1) {
                    const nextMatch = updatedMatches[nextMatchIndex];
                    const feedingMatches = updatedMatches.filter(m => m.nextMatchId === nextMatch.id);
                    const isFirstSlot = feedingMatches.length > 0 && feedingMatches[0].id === match.id;
                    
                    if (isFirstSlot && !nextMatch.participant1Id?.startsWith('bye-')) {
                        updatedMatches[nextMatchIndex] = { ...nextMatch, participant1Id: winnerId };
                    } else if (!isFirstSlot && !nextMatch.participant2Id?.startsWith('bye-')) {
                        updatedMatches[nextMatchIndex] = { ...nextMatch, participant2Id: winnerId };
                    }
                }
            }
            
            // *** АВТОМАТИЧЕСКИЙ ПЕРЕХОД К СЛЕДУЮЩЕМУ РАУНДУ ***
            const currentRoundMatches = updatedMatches.filter(m => m.round === prev.currentRound);
            const allPlayed = currentRoundMatches.length > 0 && currentRoundMatches.every(m => m.played === true);
            const maxRound = Math.max(...updatedMatches.map(m => m.round));
            
            if (allPlayed && prev.currentRound < maxRound) {
                return {
                    ...prev,
                    matches: updatedMatches,
                    results: updatedResults,
                    currentRound: prev.currentRound + 1
                };
            }
            
            return {
                ...prev,
                matches: updatedMatches,
                results: updatedResults
            };
        });
    };

    const getParticipantMatches = (participantId: string): Match[] => {
        if (!tournament) return [];
        return tournament.matches.filter(match =>
            match.participant1Id === participantId || match.participant2Id === participantId
        );
    };

    const getCurrentRoundMatches = (): Match[] => {
        if (!tournament) return [];
        return tournament.matches.filter(match => match.round === tournament.currentRound);
    };

    const getMatchById = (matchId: string): Match | undefined => {
        return tournament?.matches.find(m => m.id === matchId);
    };

    const value = {
        tournament,
        createTournament,
        addParticipant,
        updateParticipant,
        removeParticipant,
        generateBracket,
        updateMatchResult,
        getParticipantMatches,
        getCurrentRoundMatches,
        getMatchById,
    };

    return (
        <TournamentContext.Provider value={value}>
            {children}
        </TournamentContext.Provider>
    );
};