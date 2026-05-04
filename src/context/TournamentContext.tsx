import React, { createContext, useContext, useState, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
    Tournament,
    TournamentSettings,
    Participant,
    Match, // Убедись, что Match включает visualPosition?
    BracketType,
    ParticipantResult,
    // Добавь, если нужно будет использовать TiebreakType
    // TiebreakType
} from '../types/types'; // Убедись, что путь правильный

// Создаем тип для контекста
interface TournamentContextType {
    tournament: Tournament | null;
    createTournament: (settings: TournamentSettings) => void;
    addParticipant: (participant: Omit<Participant, 'id' | 'seed'>) => void;
    updateParticipant: (participant: Participant) => void;
    removeParticipant: (id: string) => void;
    generateBracket: () => void;
    updateMatchResult: (matchId: string, score1: number, score2: number) => void;
    // Новая функция для разрешения ничьи (если нужна отдельная логика)
    resolveTie?: (matchId: string, winnerId: string) => void; // Опционально
    getParticipantMatches: (participantId: string) => Match[];
    getCurrentRoundMatches: () => Match[];
    moveToNextRound: () => { success: boolean; reason?: string }; // Возвращаем статус
    getMatchById: (matchId: string) => Match | undefined; // Вспомогательная функция
}

// Создаем контекст
const TournamentContext = createContext<TournamentContextType | undefined>(undefined);

// Хук для использования контекста
export const useTournament = () => {
    const context = useContext(TournamentContext);
    if (context === undefined) {
        throw new Error('useTournament must be used within a TournamentProvider');
    }
    return context;
};

// Провайдер контекста
export const TournamentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [tournament, setTournament] = useState<Tournament | null>(null);

    // --- Старые функции (без изменений или с мелкими правками) ---

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
            seed: tournament.participants.length + 1 // Посев по порядку добавления
        };

        // Инициализация результатов для нового участника
        const initialResult: ParticipantResult = {
            participantId: newParticipant.id,
            wins: 0,
            losses: 0,
            draws: 0, // Добавим ничьи, если нужно
            goalsScored: 0,
            goalsConceded: 0,
            points: 0 // Добавим очки, если нужно
        };

        setTournament(prev => {
            if (!prev) return prev;
            // Пересчитываем посев для всех при добавлении, если не жесткая сетка
            const updatedParticipants = [...prev.participants, newParticipant];
            // Если не жесткая сетка, посев может быть не важен или пересчитываться при генерации
            // if (prev.settings.bracketType !== BracketType.FIXED) {
            //     // Можно оставить посев по порядку добавления или реализовать логику перепосева
            // }

            return {
                ...prev,
                participants: updatedParticipants,
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
            const remainingParticipants = prev.participants.filter(p => p.id !== id);
            // Можно добавить пересчет посева оставшихся
            return {
                ...prev,
                participants: remainingParticipants,
                results: prev.results.filter(r => r.participantId !== id),
                // Возможно, нужно очистить матчи, если участник удален до начала
                matches: prev.matches.map(m => ({
                    ...m,
                    participant1Id: m.participant1Id === id ? null : m.participant1Id,
                    participant2Id: m.participant2Id === id ? null : m.participant2Id,
                    winnerId: m.winnerId === id ? null : m.winnerId,
                    loserId: m.loserId === id ? null : m.loserId,
                    // Если матч стал неиграбельным, сбросить played? Зависит от логики.
                }))
            };
        });
    };

    const generateBracket = () => {
        if (!tournament || tournament.participants.length < 2) {
            console.error("Недостаточно участников для генерации сетки");
            return;
        }

        const participantsCount = tournament.settings.participantsCount;
        if (participantsCount <= 0 || !Number.isInteger(Math.log2(participantsCount))) {
            console.warn(`Количество участников (${participantsCount}) должно быть степенью двойки для стандартной сетки. Используется ${tournament.participants.length} реальных участников.`);
            // Здесь можно либо кинуть ошибку, либо адаптировать логику под нестепенное число
            // Пока оставляем генерацию на основе РЕАЛЬНОГО числа участников, ближайшего к степени двойки снизу?
            // Или добивать пустышками до ближайшей степени двойки сверху?
            // Пока будем добивать пустышками до settings.participantsCount, если оно степень двойки
        }

        const currentParticipants = [...tournament.participants];
        const requiredParticipants = Number.isInteger(Math.log2(participantsCount))
            ? participantsCount
            : Math.pow(2, Math.ceil(Math.log2(currentParticipants.length))); // Ближайшая степень двойки сверху


        // Добавить "пустых" участников (bye), если необходимо
        while (currentParticipants.length < requiredParticipants) {
            const byeParticipant: Participant = {
                id: `bye-${uuidv4()}`,
                firstName: 'BYE', // Или "Пропуск"
                lastName: '',
                rating: 0,
                seed: 9999 + currentParticipants.length // Даем большой посев
            };
            currentParticipants.push(byeParticipant);
        }

        // Перемешать или отсортировать участников
        let seededParticipants: Participant[];
        if (tournament.settings.bracketType === BracketType.FIXED) {
            seededParticipants = [...currentParticipants].sort((a, b) => (a.seed ?? 999) - (b.seed ?? 999));
        } else {
            // Жеребьевка (простое перемешивание)
            // Для более сложных типов (RESEEDING, DRAW_EACH_ROUND) логика будет в других местах
            seededParticipants = [...currentParticipants].sort(() => Math.random() - 0.5);
        }

        const matches: Match[] = [];
        const totalRounds = Math.log2(requiredParticipants);
        let previousRoundMatches: Match[] = [];

        // Генерация раундов и матчей
        for (let round = 1; round <= totalRounds; round++) {
            const roundMatches: Match[] = [];
            const matchesInThisRound = requiredParticipants / Math.pow(2, round);

            for (let i = 0; i < matchesInThisRound; i++) {
                const matchId = uuidv4();
                let p1Id: string | null = null;
                let p2Id: string | null = null;
                let nextMatchForPrev1: string | null = null;
                let nextMatchForPrev2: string | null = null;

                if (round === 1) {
                    // Первый раунд: берем из отсортированного/перемешанного списка
                    p1Id = seededParticipants[i * 2]?.id ?? null;
                    p2Id = seededParticipants[i * 2 + 1]?.id ?? null;
                } else {
                    // Последующие раунды: участники пока неизвестны (null)
                    // Найдем предыдущие матчи, которые ведут в этот
                    const prevMatch1 = previousRoundMatches[i * 2];
                    const prevMatch2 = previousRoundMatches[i * 2 + 1];
                    if (prevMatch1) prevMatch1.nextMatchId = matchId;
                    if (prevMatch2) prevMatch2.nextMatchId = matchId;
                }

                const newMatch: Match = {
                    id: matchId,
                    round: round,
                    matchNumber: i + 1, // Нумерация внутри раунда
                    participant1Id: p1Id,
                    participant2Id: p2Id,
                    score1: null,
                    score2: null,
                    winnerId: null,
                    loserId: null,
                    nextMatchId: null, // Будет установлен для предыдущего раунда или останется null для финала
                    played: false,
                    // status: 'pending', // Если используем статус
                };

                // Автоматический проход "BYE" участников
                if (round === 1) {
                    if (newMatch.participant1Id?.startsWith('bye-') && newMatch.participant2Id && !newMatch.participant2Id.startsWith('bye-')) {
                        newMatch.winnerId = newMatch.participant2Id;
                        newMatch.loserId = newMatch.participant1Id;
                        newMatch.score1 = null; // Или 0
                        newMatch.score2 = null; // Или 1 (W)
                        newMatch.played = true;
                    } else if (newMatch.participant2Id?.startsWith('bye-') && newMatch.participant1Id && !newMatch.participant1Id.startsWith('bye-')) {
                        newMatch.winnerId = newMatch.participant1Id;
                        newMatch.loserId = newMatch.participant2Id;
                        newMatch.score1 = null; // Или 1 (W)
                        newMatch.score2 = null; // Или 0
                        newMatch.played = true;
                    } else if (newMatch.participant1Id?.startsWith('bye-') && newMatch.participant2Id?.startsWith('bye-')) {
                        // Два BYE играют? Маловероятно, но обработаем - ничья без победителя? Или один проходит?
                        // Пока оставим без победителя, чтобы не создавать пустые матчи дальше
                        newMatch.played = true; // Считаем сыгранным, но без победителя
                    }
                }

                roundMatches.push(newMatch);
            }

            matches.push(...roundMatches);
            previousRoundMatches = roundMatches; // Сохраняем матчи текущего раунда для связки со следующим
        }

        // После генерации всех матчей, пройдемся и продвинем победителей BYE матчей
        let changed = true;
        while(changed) {
            changed = false;
            matches.forEach(match => {
                if (match.played && match.winnerId && match.nextMatchId) {
                    const nextMatch = matches.find(m => m.id === match.nextMatchId);
                    if (nextMatch) {
                        // Определяем, какая позиция свободна в следующем матче
                        const isP1FromPrev1 = previousRoundMatches.find(pm => pm.nextMatchId === nextMatch.id && pm.matchNumber % 2 !== 0)?.id === match.id;

                        if (isP1FromPrev1 && nextMatch.participant1Id === null) {
                            nextMatch.participant1Id = match.winnerId;
                            changed = true;
                        } else if (!isP1FromPrev1 && nextMatch.participant2Id === null) {
                            nextMatch.participant2Id = match.winnerId;
                            changed = true;
                        }

                        // Если оба участника в nextMatch теперь BYE, обрабатываем и его
                        if (nextMatch.participant1Id?.startsWith('bye-') && nextMatch.participant2Id?.startsWith('bye-') && !nextMatch.played) {
                            nextMatch.played = true;
                            changed = true;
                        }
                        // Если один из участников BYE, а второй определен и не BYE
                        else if (nextMatch.participant1Id && !nextMatch.participant1Id.startsWith('bye-') && nextMatch.participant2Id?.startsWith('bye-') && !nextMatch.played) {
                            nextMatch.winnerId = nextMatch.participant1Id;
                            nextMatch.loserId = nextMatch.participant2Id;
                            nextMatch.played = true;
                            changed = true;
                        } else if (nextMatch.participant2Id && !nextMatch.participant2Id.startsWith('bye-') && nextMatch.participant1Id?.startsWith('bye-') && !nextMatch.played) {
                            nextMatch.winnerId = nextMatch.participant2Id;
                            nextMatch.loserId = nextMatch.participant1Id;
                            nextMatch.played = true;
                            changed = true;
                        }
                    }
                }
            });
            // Обновляем previousRoundMatches для следующей итерации цикла while, если нужно
            previousRoundMatches = matches.filter(m => m.round === Math.min(...matches.filter(match => match.played && match.winnerId && match.nextMatchId && !matches.find(nm => nm.id === match.nextMatchId)?.played).map(m=>m.round)));
        }


        setTournament(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                matches,
                currentRound: 1 // Начинаем с первого раунда
            };
        });
    };

    // --- КЛЮЧЕВОЕ ИЗМЕНЕНИЕ ---
    // Обновить результат матча
    const updateMatchResult = (matchId: string, score1: number, score2: number) => {
        if (!tournament) return;

        setTournament(prev => {
            if (!prev) return prev;

            let winnerId: string | null = null;
            let loserId: string | null = null;
            let isTie = false;

            const matchIndex = prev.matches.findIndex(m => m.id === matchId);
            if (matchIndex === -1) return prev; // Матч не найден

            const match = prev.matches[matchIndex];

            // Проверяем, есть ли вообще участники
            if (!match.participant1Id || !match.participant2Id) {
                console.error("Нельзя обновить результат матча без участников");
                return prev; // Не обновляем состояние
            }

            // Определяем победителя, проигравшего или ничью
            if (score1 > score2) {
                winnerId = match.participant1Id;
                loserId = match.participant2Id;
            } else if (score2 > score1) {
                winnerId = match.participant2Id;
                loserId = match.participant1Id;
            } else {
                // НИЧЬЯ!
                isTie = true;
                winnerId = null; // Победителя нет
                loserId = null;  // Проигравшего нет
                // Продвигать в следующий раунд никого не нужно сейчас
                console.log(`Матч ${matchId} завершился вничью ${score1}-${score2}. Победитель не определен.`);
            }

            const updatedMatches = [...prev.matches];
            updatedMatches[matchIndex] = {
                ...match,
                score1,
                score2,
                winnerId, // Будет null при ничьей
                loserId,  // Будет null при ничьей
                played: true,
                // status: isTie ? 'tie_unresolved' : 'played', // Если используем статус
            };

            // Обновляем следующий матч ТОЛЬКО ЕСЛИ НЕТ НИЧЬЕЙ
            if (!isTie && match.nextMatchId && winnerId) {
                const nextMatchIndex = updatedMatches.findIndex(m => m.id === match.nextMatchId);
                if (nextMatchIndex !== -1) {
                    const nextMatch = updatedMatches[nextMatchIndex];

                    // Определяем, из какого из двух предыдущих матчей пришел победитель
                    // Находим оба матча, ведущих в nextMatch
                    const feedingMatches = updatedMatches.filter(m => m.nextMatchId === nextMatch.id);
                    const isWinnerFromFirstSlot = feedingMatches.length > 0 && feedingMatches[0].id === match.id;

                    if (isWinnerFromFirstSlot) {
                        // Если победитель из первого матча (обычно верхний в паре)
                        updatedMatches[nextMatchIndex] = { ...nextMatch, participant1Id: winnerId };
                        console.log(`Победитель ${winnerId} матча ${matchId} переходит в слот 1 матча ${nextMatch.id}`);
                    } else {
                        // Если победитель из второго матча (обычно нижний в паре)
                        updatedMatches[nextMatchIndex] = { ...nextMatch, participant2Id: winnerId };
                        console.log(`Победитель ${winnerId} матча ${matchId} переходит в слот 2 матча ${nextMatch.id}`);
                    }

                    // Проверяем авто-победу в следующем матче, если один из участников BYE
                    const finalNextMatch = updatedMatches[nextMatchIndex];
                    if(finalNextMatch.participant1Id && finalNextMatch.participant2Id && !finalNextMatch.played) {
                        if (finalNextMatch.participant1Id.startsWith('bye-')) {
                            finalNextMatch.winnerId = finalNextMatch.participant2Id;
                            finalNextMatch.loserId = finalNextMatch.participant1Id;
                            finalNextMatch.played = true;
                        } else if (finalNextMatch.participant2Id.startsWith('bye-')) {
                            finalNextMatch.winnerId = finalNextMatch.participant1Id;
                            finalNextMatch.loserId = finalNextMatch.participant2Id;
                            finalNextMatch.played = true;

                            // Если и этот матч был выигран автоматом, продвигаем дальше рекурсивно?
                            // Пока не будем усложнять, но это возможное улучшение
                        }
                    }
                } else {
                    console.warn(`Не найден следующий матч (${match.nextMatchId}) для матча ${matchId}`);
                }
            } else if (isTie) {
                console.log(`Ничья в матче ${matchId}. Победитель не продвигается.`);
                // Здесь можно добавить логику для обработки ничьи согласно настройкам турнира
                // Например, пометить матч как требующий переигровки или разрешения по доп. показателям.
                // Это потребует доп. UI и, возможно, функции resolveTie.
            }

            // --- Обновление статистики участников ---
            // (можно добавить поле draws и points в ParticipantResult)
            const updatedResults = [...prev.results];
            const p1ResultIndex = updatedResults.findIndex(r => r.participantId === match.participant1Id);
            const p2ResultIndex = updatedResults.findIndex(r => r.participantId === match.participant2Id);

            if (p1ResultIndex !== -1) {
                const current = updatedResults[p1ResultIndex];
                updatedResults[p1ResultIndex] = {
                    ...current,
                    wins: current.wins + (winnerId === match.participant1Id ? 1 : 0),
                    losses: current.losses + (loserId === match.participant1Id ? 1 : 0),
                    draws: current.draws + (isTie ? 1 : 0), // Обновляем ничьи
                    goalsScored: current.goalsScored + score1,
                    goalsConceded: current.goalsConceded + score2,
                    points: current.points + (isTie ? 1 : (winnerId === match.participant1Id ? 3 : 0)) // Пример: 3 за победу, 1 за ничью
                };
            }
            if (p2ResultIndex !== -1) {
                const current = updatedResults[p2ResultIndex];
                updatedResults[p2ResultIndex] = {
                    ...current,
                    wins: current.wins + (winnerId === match.participant2Id ? 1 : 0),
                    losses: current.losses + (loserId === match.participant2Id ? 1 : 0),
                    draws: current.draws + (isTie ? 1 : 0), // Обновляем ничьи
                    goalsScored: current.goalsScored + score2,
                    goalsConceded: current.goalsConceded + score1,
                    points: current.points + (isTie ? 1 : (winnerId === match.participant2Id ? 3 : 0)) // Пример: 3 за победу, 1 за ничью
                };
            }

            return {
                ...prev,
                matches: updatedMatches,
                results: updatedResults
            };
        });
    };

    // --- Новая функция для разрешения ничьей (пример) ---
    // Эта функция нужна, если ты хочешь дать пользователю возможность
    // вручную указать победителя после ничьи (например, по пенальти)
    const resolveTie = (matchId: string, winnerId: string) => {
        if (!tournament) return;

        setTournament(prev => {
            if (!prev) return prev;

            const matchIndex = prev.matches.findIndex(m => m.id === matchId);
            if (matchIndex === -1) return prev;

            const match = prev.matches[matchIndex];

            // Проверяем, что это действительно была ничья и победитель не был определен
            if (!match.played || match.score1 !== match.score2 || match.winnerId !== null) {
                console.warn(`Матч ${matchId} не является неразрешенной ничьей.`);
                return prev;
            }

            // Определяем проигравшего
            const loserId = match.participant1Id === winnerId ? match.participant2Id : match.participant1Id;
            if (!loserId) return prev; // Не должно случиться, если оба участника были

            const updatedMatches = [...prev.matches];
            updatedMatches[matchIndex] = {
                ...match,
                winnerId: winnerId,
                loserId: loserId,
                // Можно добавить флаг, что ничья разрешена
                // status: 'played',
            };

            // Продвигаем победителя в следующий матч (дублируем логику из updateMatchResult)
            if (match.nextMatchId && winnerId) {
                const nextMatchIndex = updatedMatches.findIndex(m => m.id === match.nextMatchId);
                if (nextMatchIndex !== -1) {
                    const nextMatch = updatedMatches[nextMatchIndex];
                    const feedingMatches = updatedMatches.filter(m => m.nextMatchId === nextMatch.id);
                    const isWinnerFromFirstSlot = feedingMatches.length > 0 && feedingMatches[0].id === match.id;

                    if (isWinnerFromFirstSlot) {
                        updatedMatches[nextMatchIndex] = { ...nextMatch, participant1Id: winnerId };
                        console.log(`Победитель (после ничьи) ${winnerId} матча ${matchId} переходит в слот 1 матча ${nextMatch.id}`);
                    } else {
                        updatedMatches[nextMatchIndex] = { ...nextMatch, participant2Id: winnerId };
                        console.log(`Победитель (после ничьи) ${winnerId} матча ${matchId} переходит в слот 2 матча ${nextMatch.id}`);
                    }
                    // Проверка на BYE в следующем матче (дублирование)
                    const finalNextMatch = updatedMatches[nextMatchIndex];
                    if(finalNextMatch.participant1Id && finalNextMatch.participant2Id && !finalNextMatch.played) {
                        if (finalNextMatch.participant1Id.startsWith('bye-')) {
                            finalNextMatch.winnerId = finalNextMatch.participant2Id;
                            finalNextMatch.loserId = finalNextMatch.participant1Id;
                            finalNextMatch.played = true;
                        } else if (finalNextMatch.participant2Id.startsWith('bye-')) {
                            finalNextMatch.winnerId = finalNextMatch.participant1Id;
                            finalNextMatch.loserId = finalNextMatch.participant2Id;
                            finalNextMatch.played = true;
                        }
                    }

                }
            }

            // Обновляем статистику (здесь можно скорректировать очки/победы/поражения для ничейного матча)
            // Например, победителю по пенальти можно не давать 3 очка, а оставить 1 за ничью + проход дальше
            const updatedResults = [...prev.results];
            // ... (логика обновления results, возможно, отличается от обычной победы)


            return {
                ...prev,
                matches: updatedMatches,
                results: updatedResults // Обнови, если нужно
            };
        });
    };


    // --- Вспомогательные функции ---
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
    }

    // --- Обновленный Переход к следующему раунду ---
    const moveToNextRound = (): { success: boolean; reason?: string } => {
        if (!tournament) return { success: false, reason: "Турнир не инициализирован" };

        const currentRoundMatches = getCurrentRoundMatches();
        if (currentRoundMatches.length === 0 && tournament.currentRound > 0) {
            // Возможно, это конец турнира
            const maxRound = Math.max(...tournament.matches.map(m => m.round));
            if (tournament.currentRound >= maxRound) {
                return { success: false, reason: "Турнир уже завершен" };
            }
            // Или просто нет матчей в текущем раунде (ошибка?)
            return { success: false, reason: `Нет матчей для раунда ${tournament.currentRound}`};

        }

        // Проверяем, все ли матчи текущего раунда сыграны И имеют победителя (т.е. нет неразрешенных ничьих)
        const allPlayedAndResolved = currentRoundMatches.every(match =>
            match.played && (match.winnerId !== null || match.participant1Id?.startsWith('bye-') || match.participant2Id?.startsWith('bye-')) // Допускаем матчи с BYE или где победитель определен
        );

        if (!allPlayedAndResolved) {
            const unresolvedMatch = currentRoundMatches.find(match => !match.played || (match.played && match.winnerId === null && !match.participant1Id?.startsWith('bye-') && !match.participant2Id?.startsWith('bye-') ) );
            const reason = unresolvedMatch
                ? `Матч ${unresolvedMatch.id} (${getParticipant(unresolvedMatch.participant1Id)?.lastName || 'TBD'} vs ${getParticipant(unresolvedMatch.participant2Id)?.lastName || 'TBD'}) еще не сыгран или закончился неразрешенной ничьей.`
                : "Не все матчи текущего раунда завершены.";
            console.warn("Нельзя перейти к следующему раунду:", reason);
            return { success: false, reason };
        }

        // Проверяем, есть ли следующий раунд
        const nextRound = tournament.currentRound + 1;
        const hasNextRound = tournament.matches.some(match => match.round === nextRound);

        if (hasNextRound) {
            setTournament(prev => {
                if (!prev) return prev;
                console.log(`Переход к раунду ${nextRound}`);
                return {
                    ...prev,
                    currentRound: nextRound
                };
            });
            return { success: true };
        } else {
            console.log("Следующего раунда нет. Турнир завершен?");
            // Можно установить флаг завершения турнира
            return { success: false, reason: "Это был последний раунд" };
        }
    };

    // Вспомогательная функция для получения участника (для логов и сообщений)
    const getParticipant = (id: string | null): Participant | null => {
        if (!tournament || !id || id.startsWith('bye-')) return null;
        return tournament.participants.find(p => p.id === id) || null;
    };

    // --- Значение контекста ---
    const value = {
        tournament,
        createTournament,
        addParticipant,
        updateParticipant,
        removeParticipant,
        generateBracket,
        updateMatchResult,
        resolveTie, // Добавлено
        getParticipantMatches,
        getCurrentRoundMatches,
        moveToNextRound, // Обновлено
        getMatchById, // Добавлено
    };

    return (
        <TournamentContext.Provider value={value}>
            {children}
        </TournamentContext.Provider>
    );
};