"use client"

import React, { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useTournament } from "../context/TournamentContext"
import type { Match, Participant } from "../types/types"
import styles from "./TournamentBracket.module.css"
import { ReactComponent as DefaultTeamIcon } from "../assets/team-icon.svg"

const SimplifiedTournamentBracket: React.FC = () => {
    const navigate = useNavigate()
    const { tournament, getMatchById } = useTournament(); // Добавим getMatchById, если нужен для checkPreviousRoundTies

    // --- Effect Hooks ---
    useEffect(() => {
        // Убран console.log, чтобы не засорять консоль
    }, [tournament]);

    // --- Guard Clauses ---
    if (!tournament) {
        // Не редиректим сразу, может быть кратковременное состояние null при загрузке
        return <div>Загрузка турнира...</div>; // Или другой плейсхолдер
    }
    if (tournament.matches.length === 0) {
        // Можно показать сообщение или кнопку для генерации, если участников > 1
        if (tournament.participants.length >= 2) {
            return (
                <div className={styles.pageContainer}>
                    <div className={styles.header}>
                        <h1 className={styles.title}>Турнирная сетка: {tournament.settings.name}</h1>
                    </div>
                    <p>Сетка еще не сгенерирована. Перейдите к добавлению участников, чтобы сгенерировать сетку.</p>
                    <button onClick={() => navigate('/participants')} className={styles.headerButton}>
                        К участникам
                    </button>
                </div>
            );
        } else {
            // Если и участников нет, редирект оправдан
            navigate("/");
            return null;
        }
    }


    // --- Helper Functions ---
    const getParticipant = (id: string | null | undefined): Participant | null => {
        if (!id || id.startsWith("bye-")) return null; // Не показываем BYE как участника
        return tournament.participants.find((p) => p.id === id) || null;
    };

    // Check if previous rounds had ties leading to this match
    const checkPreviousRoundTies = (match: Match): boolean => {
        if (!getMatchById) return false; // Защита, если функция не передана

        // Find matches from previous round that feed into this match
        const feedingMatches = tournament.matches.filter(
            m => m.round === match.round - 1 && m.nextMatchId === match.id
        );

        // If any previous *played* match was a tie (winner is null)
        return feedingMatches.some(prevMatch =>
            prevMatch.played &&
            prevMatch.winnerId === null && // Явный признак неразрешенной ничьи
            !prevMatch.participant1Id?.startsWith('bye-') && // Исключаем авто-ничьи BYE vs BYE
            !prevMatch.participant2Id?.startsWith('bye-')
        );
    };

    const goToMatch = (match: Match) => {
        // Переписана проверка на играбельность для ясности
        const p1 = match.participant1Id;
        const p2 = match.participant2Id;

        // 1. Оба участника должны быть определены и не быть BYE
        const hasRealParticipants = p1 && !p1.startsWith('bye-') && p2 && !p2.startsWith('bye-');

        // 2. Матч не должен быть уже сыгран
        const isNotPlayed = !match.played;

        // 3. Матч должен быть в текущем раунде ИЛИ это матч 2-го раунда (часто играют параллельно) ИЛИ он следует за ничьей
        const isPlayableRound = match.round === tournament.currentRound ||
            match.round === 2 || // Разрешаем играть 2 раунд параллельно с 1ым? (Опционально)
            (match.round > 1 && checkPreviousRoundTies(match));

        if (hasRealParticipants && isNotPlayed && isPlayableRound) {
            navigate(`/match/${match.id}`);
        } else {
            console.log("Навигация к матчу отменена:", { hasRealParticipants, isNotPlayed, isPlayableRound, match });
        }
    };


    // Group matches by round
    const groupMatchesByRound = () => {
        const rounds: { [key: number]: Match[] } = {};
        const maxRound = tournament.matches.length > 0
            ? Math.max(...tournament.matches.map(m => m.round))
            : 0;

        for (let i = 1; i <= maxRound; i++) {
            rounds[i] = [];
        }

        tournament.matches.forEach(match => {
            if (rounds[match.round]) { // Добавлена проверка на существование раунда
                rounds[match.round].push(match);
            }
        });

        Object.keys(rounds).forEach(roundNum => {
            rounds[Number(roundNum)].sort((a, b) => a.matchNumber - b.matchNumber);
        });

        // Убрана функция adjustMatchPositions, так как она не использовалась для рендеринга
        return rounds;
    };

    const matchesByRound = groupMatchesByRound();
    const maxRound = Object.keys(matchesByRound).length > 0
        ? Math.max(...Object.keys(matchesByRound).map(Number))
        : 0;
    const finalMatch = maxRound > 0 ? matchesByRound[maxRound]?.[0] : undefined;
    const champion = finalMatch ? getParticipant(finalMatch.winnerId) : null; // Убрана проверка finalMatch?.winnerId, т.к. getParticipant обработает null

    // --- Rendering Functions ---
    const renderParticipant = (participantId: string | null | undefined, match: Match, position: 'top' | 'bottom') => {
        const participant = getParticipant(participantId); // Получаем реального участника (или null для BYE/TBD)
        const isBye = participantId?.startsWith('bye-');
        const displayName = participant
            ? participant.teamName || `${participant.lastName} ${participant.firstName}`
            : (isBye ? "Пропуск (BYE)" : "TBD"); // Отображаем BYE или TBD

        const isPlayer1 = position === 'top' && participantId === match.participant1Id;
        const isPlayer2 = position === 'bottom' && participantId === match.participant2Id;

        const isWinner = match.played && participantId && match.winnerId === participantId;
        const isLoser = match.played && participantId && match.loserId === participantId;

        const blockStyles = [
            styles.participantBlock,
            participant ? styles.hasData : '',
            isWinner ? styles.winner : '',
            isLoser ? styles.loser : '',
            isBye ? styles.byeParticipant : '', // Добавим стиль для BYE
        ].filter(Boolean).join(' '); // filter(Boolean) удаляет пустые строки

        return (
            <div className={blockStyles} key={`participant-${match.id}-${position}-${participantId || 'null'}`}>
                {/* Не показываем seed для BYE */}
                {participant && !isBye && <span className={styles.seed}>{participant.seed}</span>}
                {/* Можно скрыть иконку для BYE/TBD */}
                {/* {!isBye && ( */}
                <div className={styles.logo}><DefaultTeamIcon /></div>
                {/* )} */}
                <div className={styles.teamDetails}>
                    <div className={styles.teamName}>
                        {displayName}
                    </div>
                    {participant?.city && <div className={styles.teamCity}>{participant.city}</div>}
                </div>
            </div>
        );
    };

    const renderMatch = (match: Match) => {
        const p1 = match.participant1Id;
        const p2 = match.participant2Id;

        // КЛЮЧЕВОЕ ИЗМЕНЕНИЕ: Определяем, является ли этот матч "пустым" в будущем раунде
        // Он пуст, если оба участника null И это не первый раунд
        const isEmptyFutureMatch = !p1 && !p2 && match.round > 1;

        // Определяем играбельность (дублируем логику goToMatch для стилизации кнопки)
        const hasRealParticipants = p1 && !p1.startsWith('bye-') && p2 && !p2.startsWith('bye-');
        const isNotPlayed = !match.played;
        const isPlayableRound = match.round === tournament.currentRound ||
            match.round === 2 ||
            (match.round > 1 && checkPreviousRoundTies(match));
        const isPlayable = hasRealParticipants && isNotPlayed && isPlayableRound;

        // Определяем ничью
        const isTie = match.played && match.winnerId === null && !p1?.startsWith('bye-') && !p2?.startsWith('bye-');

        const handleClick = () => {
            // goToMatch уже содержит всю логику проверки
            goToMatch(match);
            // Дополнительно можно обработать клик по ничьей для вызова resolveTie, если он будет
            // if (isTie && resolveTie) { /* open resolution modal? */ }
        };

        // Отображение счета
        const scoreDisplay = match.played
            ? (isTie ? `Ничья ${match.score1 ?? '?'}–${match.score2 ?? '?'}` : `${match.score1 ?? '?'}–${match.score2 ?? '?'}`)
            : (isPlayable ? "Играть" : "—"); // Показываем "Играть" если можно

        // Классы для матча
        const matchClasses = [
            styles.match,
            isTie ? styles.tieMatch : '',
            isEmptyFutureMatch ? styles.emptyFutureMatch : '', // <-- ДОБАВЛЕН КЛАСС
        ].filter(Boolean).join(' ');

        return (
            <div
                className={matchClasses}
                onClick={handleClick}
                key={`match-${match.id}`}
                data-match-id={match.id}
                data-playable={isPlayable} // Атрибут для стилизации или отладки
                data-tie={isTie}
                style={{ marginBottom: '20px' }} // Явный отступ, чтобы компенсировать возможное скрытие .emptyFutureMatch
            >
                {renderParticipant(match.participant1Id, match, 'top')}
                {renderParticipant(match.participant2Id, match, 'bottom')}

                {/* Не показываем кнопку счета для пустых будущих матчей */}
                {!isEmptyFutureMatch && (
                    <div className={styles.inlineScore}>
                        <span
                            className={`${styles.scoreValue} ${isPlayable ? styles.scorePlayable : ""} ${isTie ? styles.tieSc : ""}`}
                            onClick={(e) => { e.stopPropagation(); handleClick(); }}
                            title={
                                isPlayable ? "Ввести результат" :
                                    (match.played ?
                                        (isTie ? `Ничья ${match.score1}–${match.score2}, требуется разрешение` : `Счет ${match.score1}–${match.score2}`) :
                                        (p1 || p2 ? 'Ожидание участников / результата' : 'Ожидание участников')) // Более точные title
                            }
                        >
                            {scoreDisplay}
                        </span>
                    </div>
                )}
            </div>
        );
    };

    // --- Main Render ---
    return (
        <div className={styles.pageContainer}>
            {/* Header */}
            <div className={styles.header}>
                <h1 className={styles.title}>Турнирная сетка: {tournament.settings.name}</h1>
                <button onClick={() => navigate("/results")} className={styles.headerButton}>
                    Таблица результатов
                </button>
                {/* Можно добавить кнопку для перехода к следующему раунду */}
                {/* <button onClick={handleNextRound} className={styles.headerButton} disabled={!canGoNextRound}>
                    Следующий раунд
                </button> */}
            </div>

            {/* Tournament Bracket */}
            <div className={styles.bracketContainer}>
                <div className={styles.bracketLayout}>
                    {Object.keys(matchesByRound)
                        .map(Number)
                        .sort((a, b) => a - b)
                        .map(roundNum => {
                            // Не рендерим раунд, если в нем вообще нет матчей (на всякий случай)
                            if (!matchesByRound[roundNum] || matchesByRound[roundNum].length === 0) {
                                return null;
                            }
                            return (
                                <div
                                    className={styles.bracketStage}
                                    key={`round-${roundNum}`}
                                    data-round={roundNum}
                                >
                                    <div className={styles.roundTitle}>Раунд {roundNum}</div>
                                    <div className={styles.matchContainer}>
                                        {matchesByRound[roundNum].map(match => renderMatch(match))}
                                    </div>
                                </div>
                            );
                        })
                    }
                </div>
            </div>

            {/* Champion Display Area */}
            {champion && (
                <div className={styles.championArea}>
                    <div className={styles.championTitle}>Победитель:</div>
                    <div className={styles.championLogo}><DefaultTeamIcon /></div>
                    <div className={styles.championName}>
                        {champion.teamName || `${champion.lastName} ${champion.firstName}`}
                    </div>
                    {champion.city && <div className={styles.championCity}>{champion.city}</div>}
                </div>
            )}
            {/* Сообщение, если турнир завершен, но победитель еще не определился в последнем матче */}
            {finalMatch && finalMatch.played && !champion && (
                <div className={styles.championArea}>
                    <div className={styles.championTitle}>Турнир завершен</div>
                    <p>Финальный матч завершился вничью ({finalMatch.score1}-{finalMatch.score2}) и требует разрешения.</p>
                    {/* Здесь можно добавить кнопку для разрешения ничьи финала */}
                </div>
            )}
        </div>
    );
};

export default SimplifiedTournamentBracket;