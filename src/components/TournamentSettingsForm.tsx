import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTournament } from '../context/TournamentContext';
import { TournamentSettings, TiebreakType, BracketType } from '../types/types';
import styles from './TournamentSettingsForm.module.css'; // Import the CSS module

const TournamentSettingsForm: React.FC = () => {
    const navigate = useNavigate();
    const { createTournament } = useTournament();

    const [settings, setSettings] = useState<TournamentSettings>({
        name: '',
        participantsCount: 16,
        matchesPerStage: 1,
        tiebreakType: TiebreakType.GOALS_DIFFERENCE,
        bracketType: BracketType.FIXED
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        setSettings(prev => ({
            ...prev,
            [name]: name === 'participantsCount' || name === 'matchesPerStage'
                ? parseInt(value, 10)
                : value
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Add basic validation if needed, e.g., for name
        if (!settings.name.trim()) {
            alert("Пожалуйста, введите название турнира.");
            return;
        }
        createTournament(settings);
        navigate('/participants');
    };

    return (
        <div className={styles.settingsFormContainer}>
            <h1 className={styles.title}>Настройка турнира</h1>

            <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formGroup}>
                    <label htmlFor="tournamentName" className={styles.label}>Название турнира</label>
                    <input
                        type="text"
                        id="tournamentName"
                        name="name"
                        value={settings.name}
                        onChange={handleChange}
                        className={styles.input} // Uses global input style via index.css
                        required
                        aria-required="true"
                    />
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="participantsCount" className={styles.label}>Количество участников</label>
                    <select
                        id="participantsCount"
                        name="participantsCount"
                        value={settings.participantsCount}
                        onChange={handleChange}
                        className={styles.select} // Uses global select style via index.css
                    >
                        <option value={4}>4</option>
                        <option value={8}>8</option>
                        <option value={16}>16</option>
                        <option value={32}>32</option>
                    </select>
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="matchesPerStage" className={styles.label}>Количество партий на каждом этапе</label>
                    <select
                        id="matchesPerStage"
                        name="matchesPerStage"
                        value={settings.matchesPerStage}
                        onChange={handleChange}
                        className={styles.select}
                    >
                        <option value={1}>1 (одна игра)</option>
                        <option value={2}>2 (дома и в гостях)</option>
                        <option value={3}>3 (серия до 2-х побед)</option>
                        <option value={5}>5 (серия до 3-х побед)</option>
                        <option value={7}>7 (серия до 4-х побед)</option>
                    </select>
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="tiebreakType" className={styles.label}>Тип тайбрейка</label>
                    <select
                        id="tiebreakType"
                        name="tiebreakType"
                        value={settings.tiebreakType}
                        onChange={handleChange}
                        className={styles.select}
                    >
                        <option value={TiebreakType.GOALS_DIFFERENCE}>Разница голов</option>
                        <option value={TiebreakType.PENALTY_SHOOTOUT}>Серия пенальти</option>
                        <option value={TiebreakType.ADDITIONAL_TIME}>Дополнительное время</option>
                    </select>
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="bracketType" className={styles.label}>Тип сетки</label>
                    <select
                        id="bracketType"
                        name="bracketType"
                        value={settings.bracketType}
                        onChange={handleChange}
                        className={styles.select}
                    >
                        <option value={BracketType.FIXED}>Жесткая сетка</option>
                        <option value={BracketType.RESEEDING}>Перепосев</option>
                        <option value={BracketType.DRAW_EACH_ROUND}>Жеребьевка после каждого тура</option>
                    </select>
                </div>

                <button
                    type="submit"
                    className={styles.submitButton} // Apply the button style from the module
                >
                    Далее: Добавить участников
                </button>
            </form>
        </div>
    );
};

export default TournamentSettingsForm;