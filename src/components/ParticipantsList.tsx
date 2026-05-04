import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTournament } from '../context/TournamentContext';
import { Participant } from '../types/types';
import styles from './ParticipantsList.module.css'; // Import CSS Module

const ParticipantsList: React.FC = () => {
    const navigate = useNavigate();
    const { tournament, addParticipant, removeParticipant, generateBracket } = useTournament();

    const [newParticipant, setNewParticipant] = useState<Omit<Participant, 'id' | 'seed'>>({
        firstName: '',
        lastName: '',
        rating: 1000,
        teamName: '',
        city: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;

        setNewParticipant(prev => ({
            ...prev,
            [name]: name === 'rating' ? parseInt(value, 10) || 0 : value // Ensure rating is number or 0
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newParticipant.firstName.trim() || !newParticipant.lastName.trim()) {
            alert("Имя и Фамилия обязательны для заполнения.");
            return;
        }
        addParticipant(newParticipant);

        // Reset form
        setNewParticipant({
            firstName: '',
            lastName: '',
            rating: 1000,
            teamName: '',
            city: ''
        });
    };

    const handleGenerateBracket = () => {
        generateBracket();
        navigate('/bracket');
    };

    if (!tournament) {
        navigate('/');
        return null;
    }

    const canGenerateBracket = tournament.participants.length >= 2 &&
        tournament.participants.length <= tournament.settings.participantsCount;

    return (
        <div className={styles.participantsContainer}>
            <h1 className={styles.title}>
                Участники турнира "{tournament.settings.name}"
            </h1>

            <div className={styles.layoutGrid}>
                {/* Add Participant Section */}
                <div className={styles.formSection}>
                    <h2 className={styles.sectionTitle}>Добавить участника</h2>

                    <form onSubmit={handleSubmit} className={styles.addParticipantForm}>
                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label htmlFor="firstName" className={styles.label}>Имя</label>
                                <input
                                    type="text"
                                    id="firstName"
                                    name="firstName"
                                    value={newParticipant.firstName}
                                    onChange={handleChange}
                                    className={styles.input} // Uses global style
                                    required
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="lastName" className={styles.label}>Фамилия</label>
                                <input
                                    type="text"
                                    id="lastName"
                                    name="lastName"
                                    value={newParticipant.lastName}
                                    onChange={handleChange}
                                    className={styles.input} // Uses global style
                                    required
                                />
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="teamName" className={styles.label}>Название команды (необязательно)</label>
                            <input
                                type="text"
                                id="teamName"
                                name="teamName"
                                value={newParticipant.teamName}
                                onChange={handleChange}
                                className={styles.input}
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="city" className={styles.label}>Город (необязательно)</label>
                            <input
                                type="text"
                                id="city"
                                name="city"
                                value={newParticipant.city}
                                onChange={handleChange}
                                className={styles.input}
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="rating" className={styles.label}>Рейтинг</label>
                            <input
                                type="number"
                                id="rating"
                                name="rating"
                                value={newParticipant.rating}
                                onChange={handleChange}
                                className={styles.input}
                                min="1"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className={styles.addButton} // Apply Add button style
                        >
                            Добавить
                        </button>
                    </form>
                </div>

                {/* List Participants Section */}
                <div className={styles.listSection}>
                    <h2 className={styles.sectionTitle}>Список участников</h2>

                    {tournament.participants.length === 0 ? (
                        <p className={styles.noParticipantsMessage}>Еще не добавлено ни одного участника</p>
                    ) : (
                        <div className={styles.participantsList}>
                            {tournament.participants.map((participant) => (
                                <div
                                    key={participant.id}
                                    className={styles.participantItem}
                                >
                                    <div className={styles.participantInfo}>
                                        <div className={styles.participantName}>
                                            {participant.firstName} {participant.lastName}
                                        </div>
                                        <div className={styles.participantDetails}>
                                            {participant.teamName && `${participant.teamName}, `}
                                            {participant.city && `${participant.city}, `}
                                            Рейтинг: {participant.rating}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => removeParticipant(participant.id)}
                                        className={styles.removeButton} // Apply Remove button style
                                        aria-label={`Удалить участника ${participant.firstName} ${participant.lastName}`}
                                    >
                                        Удалить
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Generate Bracket Section */}
                    <div className={styles.generationSection}>
                        <p className={styles.countIndicator}>
                            Добавлено {tournament.participants.length} из {tournament.settings.participantsCount} участников
                        </p>

                        <button
                            onClick={handleGenerateBracket}
                            disabled={!canGenerateBracket}
                            className={styles.generateButton} // Apply Generate button style (disabled state handled by CSS)
                        >
                            Сформировать турнирную сетку
                        </button>

                        {!canGenerateBracket && tournament.participants.length < 2 && (
                            <p className={styles.errorMessage}>
                                Необходимо добавить минимум 2 участника
                            </p>
                        )}
                        {!canGenerateBracket && tournament.participants.length > tournament.settings.participantsCount && (
                            <p className={styles.errorMessage}>
                                Слишком много участников. Максимум: {tournament.settings.participantsCount}.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ParticipantsList;