import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTournament } from '../context/TournamentContext';
import { Participant } from '../types/types'; // Removed unused ParticipantResult import
import { ReactComponent as TeamIcon } from '../assets/team-icon.svg';
import styles from './ResultsTable.module.css'; // Import the CSS Module

const ResultsTable: React.FC = () => {
    const navigate = useNavigate();
    const { tournament, getParticipantMatches } = useTournament();
    const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);

    if (!tournament) {
        navigate('/');
        return null;
    }

    // Sort results by wins (desc), then goal difference (desc)
    const sortedResults = [...tournament.results].sort((a, b) => {
        if (a.wins !== b.wins) {
            return b.wins - a.wins;
        }
        const diffA = a.goalsScored - a.goalsConceded;
        const diffB = b.goalsScored - b.goalsConceded;
        return diffB - diffA;
    });

    const getParticipant = (id: string): Participant | undefined => {
        return tournament.participants.find(p => p.id === id);
    };

    // Render details modal for the selected participant
    const renderParticipantDetails = () => {
        if (!selectedParticipant) return null;

        const result = tournament.results.find(r => r.participantId === selectedParticipant.id);
        const matches = getParticipantMatches(selectedParticipant.id);

        return (
            <div className={styles.participantDetailsCard}>
                <div className={styles.detailsHeader}>
                    <div className={styles.detailsLogo}>
                        <TeamIcon />
                    </div>
                    <div className={styles.detailsInfo}>
                        <h3>
                            {selectedParticipant.teamName ||
                                `${selectedParticipant.lastName} ${selectedParticipant.firstName}`}
                        </h3>
                        <div>
                            {selectedParticipant.city && `${selectedParticipant.city}, `}
                            Рейтинг: {selectedParticipant.rating}
                        </div>
                    </div>
                    <button
                        className={styles.closeButton}
                        onClick={() => setSelectedParticipant(null)}
                        aria-label="Закрыть детали участника"
                    >
                        × {/* Close icon */}
                    </button>
                </div>

                {result && (
                    <div className={styles.statsGrid}>
                        <div className={styles.statItem}>
                            <div className={styles.statLabel}>Матчи</div>
                            <div className={styles.statValue}>{result.wins + result.losses}</div>
                        </div>
                        <div className={styles.statItem}>
                            <div className={styles.statLabel}>Победы</div>
                            <div className={styles.statValue}>{result.wins}</div>
                        </div>
                        <div className={styles.statItem}>
                            <div className={styles.statLabel}>Поражения</div>
                            <div className={styles.statValue}>{result.losses}</div>
                        </div>
                        <div className={styles.statItem}>
                            <div className={styles.statLabel}>Разница</div>
                            <div className={styles.statValue}>{result.goalsScored - result.goalsConceded}</div>
                        </div>
                    </div>
                )}

                <h4 className={styles.matchHistoryTitle}>История матчей</h4>
                {matches.length > 0 ? (
                    <div className={styles.matchHistoryList}>
                        {matches.map(match => {
                            const opponent = match.participant1Id === selectedParticipant.id
                                ? getParticipant(match.participant2Id || '')
                                : getParticipant(match.participant1Id || '');

                            const isWinner = match.winnerId === selectedParticipant.id;
                            const isLoser = match.loserId === selectedParticipant.id;
                            const isHome = match.participant1Id === selectedParticipant.id;
                            const score = isHome
                                ? `${match.score1 ?? '?'} - ${match.score2 ?? '?'}` // Handle null scores
                                : `${match.score2 ?? '?'} - ${match.score1 ?? '?'}`;

                            const matchItemClass = !match.played
                                ? styles.matchItemPending
                                : isWinner
                                    ? `${styles.matchItemWin} ${styles.matchItemPlayed}`
                                    : (isLoser ? `${styles.matchItemLoss} ${styles.matchItemPlayed}` : styles.matchItemPending); // Handle draws if needed

                            return (
                                <div
                                    key={match.id}
                                    className={`${styles.matchItem} ${matchItemClass}`}
                                >
                                    <div>
                                        <span style={{ fontWeight: '500', marginRight: '4px' }}>
                                            Раунд {match.round}:
                                        </span>
                                        <span>
                                            {isHome ? 'vs' : '@'} {opponent
                                            ? (opponent.teamName || `${opponent.lastName} ${opponent.firstName}`)
                                            : 'TBD'}
                                        </span>
                                    </div>
                                    <div className={styles.matchScore}>
                                        {match.played ? score : 'Не сыгран'}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className={styles.noMatchesMessage}>Нет сыгранных матчей</div>
                )}
            </div>
        );
    };

    return (
        <div className={styles.resultsContainer}>
            {/* Header */}
            <div className={styles.header}>
                <h1 className={styles.title}>
                    Таблица результатов: {tournament.settings.name}
                </h1>
                <button
                    onClick={() => navigate('/bracket')}
                    className={styles.backButton} // Apply button style
                >
                    Вернуться к сетке
                </button>
            </div>

            {/* Optional Participant Details Modal */}
            {selectedParticipant && renderParticipantDetails()}

            {/* Results Table */}
            <div className={styles.tableContainer}>
                <table className={styles.resultsTable}>
                    <thead>
                    <tr>
                        <th className={styles.center}>Место</th>
                        <th>Участник</th>
                        <th className={styles.center}>И</th> {/* Игры */}
                        <th className={styles.center}>В</th> {/* Выигрыши */}
                        <th className={styles.center}>П</th> {/* Поражения */}
                        <th className={styles.center}>Заб</th> {/* Забито */}
                        <th className={styles.center}>Проп</th>{/* Пропущено */}
                        <th className={styles.center}>Разн</th>{/* Разница */}
                    </tr>
                    </thead>
                    <tbody>
                    {sortedResults.map((result, index) => {
                        const participant = getParticipant(result.participantId);
                        if (!participant) return null; // Skip if participant data is missing

                        return (
                            <tr
                                key={result.participantId}
                                onClick={() => setSelectedParticipant(participant)}
                                tabIndex={0} // Make row focusable
                                onKeyPress={(e) => (e.key === 'Enter' || e.key === ' ') && setSelectedParticipant(participant)} // Allow selection with keyboard
                            >
                                <td className={styles.rank}>{index + 1}</td>
                                <td>
                                    <div className={styles.participantCell}>
                                        <div className={styles.tableLogo}>
                                            <TeamIcon />
                                        </div>
                                        <div>
                                            <div className={styles.tableName}>
                                                {participant.teamName ||
                                                    `${participant.lastName} ${participant.firstName}`}
                                            </div>
                                            {participant.city && (
                                                <div className={styles.tableCity}>
                                                    {participant.city}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className={styles.center}>
                                    {result.wins + result.losses}
                                </td>
                                <td className={styles.center}>
                                    {result.wins}
                                </td>
                                <td className={styles.center}>
                                    {result.losses}
                                </td>
                                <td className={styles.center}>
                                    {result.goalsScored}
                                </td>
                                <td className={styles.center}>
                                    {result.goalsConceded}
                                </td>
                                <td className={`${styles.center} ${styles.rank}`}> {/* Bold difference */}
                                    {result.goalsScored - result.goalsConceded}
                                </td>
                            </tr>
                        );
                    })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ResultsTable;