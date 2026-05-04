import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTournament } from '../context/TournamentContext';
import { ReactComponent as TeamIcon } from '../assets/team-icon.svg';
import styles from './MatchDetails.module.css'; // Import the CSS Module

const MatchDetails: React.FC = () => {
    const { matchId } = useParams<{ matchId: string }>();
    const navigate = useNavigate();
    const { tournament, updateMatchResult } = useTournament();

    const [score1, setScore1] = useState<number>(0);
    const [score2, setScore2] = useState<number>(0);

    useEffect(() => {
        if (tournament && matchId) {
            const match = tournament.matches.find(m => m.id === matchId);
            if (match && match.played && match.score1 !== null && match.score2 !== null) {
                setScore1(match.score1);
                setScore2(match.score2);
            } else {
                // Reset scores if match not found or not played
                setScore1(0);
                setScore2(0);
            }
        }
    }, [tournament, matchId]);

    if (!tournament || !matchId) {
        navigate('/bracket');
        return null;
    }

    const match = tournament.matches.find(m => m.id === matchId);

    if (!match) {
        console.warn(`Match with ID ${matchId} not found.`);
        navigate('/bracket');
        return null;
    }

    const participant1 = tournament.participants.find(p => p.id === match.participant1Id);
    const participant2 = tournament.participants.find(p => p.id === match.participant2Id);

    const handleSaveResult = () => {
        if (matchId) {
            updateMatchResult(matchId, score1, score2);
            navigate('/bracket');
        }
    };

    return (
        <div className={styles.detailsContainer}>
            <h1 className={styles.title}>Результат матча</h1>

            <div className={styles.card}>
                <div className={styles.matchInfo}>
                    Раунд {match.round}, Матч {match.matchNumber}
                </div>

                {/* Participants Section */}
                <div className={styles.participantsVs}>
                    <div className={styles.participantDisplay}>
                        <div className={styles.logoContainer}>
                            <TeamIcon /> {/* SVG will inherit color via CSS */}
                        </div>
                        <div className={styles.participantName}>
                            {participant1 ? (participant1.teamName || `${participant1.lastName} ${participant1.firstName}`) : 'Участник 1'}
                        </div>
                        <div className={styles.participantCity}>
                            {participant1?.city || ''}
                        </div>
                    </div>

                    <div className={styles.vsSeparator}>VS</div>

                    <div className={styles.participantDisplay}>
                        <div className={styles.logoContainer}>
                            <TeamIcon /> {/* SVG will inherit color via CSS */}
                        </div>
                        <div className={styles.participantName}>
                            {participant2 ? (participant2.teamName || `${participant2.lastName} ${participant2.firstName}`) : 'Участник 2'}
                        </div>
                        <div className={styles.participantCity}>
                            {participant2?.city || ''}
                        </div>
                    </div>
                </div>

                {/* Score Input Section */}
                <div className={styles.scoreSection}>
                    <div className={styles.scoreInputContainer}>
                        <input
                            type="number"
                            min="0"
                            value={score1}
                            onChange={(e) => setScore1(parseInt(e.target.value) || 0)}
                            className={styles.scoreInput}
                            aria-label="Счет участника 1"
                        />
                    </div>

                    <div className={styles.scoreLabel}>Счет</div>

                    <div className={styles.scoreInputContainer}>
                        <input
                            type="number"
                            min="0"
                            value={score2}
                            onChange={(e) => setScore2(parseInt(e.target.value) || 0)}
                            className={styles.scoreInput}
                            aria-label="Счет участника 2"
                        />
                    </div>
                </div>

                {/* Action Buttons Section */}
                <div className={styles.buttonGroup}>
                    <button
                        onClick={() => navigate('/bracket')}
                        className={`${styles.buttonBase} ${styles.cancelButton}`} // Combine base and specific styles
                    >
                        Отмена
                    </button>

                    <button
                        onClick={handleSaveResult}
                        className={`${styles.buttonBase} ${styles.saveButton}`} // Combine base and specific styles
                    >
                        Сохранить результат
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MatchDetails;