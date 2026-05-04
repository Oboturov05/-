import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { TournamentProvider } from './context/TournamentContext';
import {
    Container,
    AppBar,
    Toolbar,
    Typography,
    Box,
    CssBaseline
} from '@mui/material';

// Импорт компонентов
import TournamentSettingsForm from './components/TournamentSettingsForm';
import ParticipantsList from './components/ParticipantsList';
import TournamentBracket from './components/TournamentBracket';
import MatchDetails from './components/MatchDetails';
import ResultsTable from './components/ResultsTable';

const App: React.FC = () => {
    return (
        <TournamentProvider>
            <CssBaseline />
            <Router>
                <AppBar position="static">
                    <Toolbar>
                        <Link to="/" style={{ textDecoration: 'none', color: 'inherit', flexGrow: 1 /* Чтобы занять место */ }}>
                            <Typography variant="h6" component="div">
                                Система управления турнирами
                            </Typography>
                        </Link>
                    </Toolbar>
                </AppBar>

                <Container maxWidth="lg" sx={{ py: 3 }}>
                    <Routes>
                        <Route path="/" element={<TournamentSettingsForm />} />
                        <Route path="/participants" element={<ParticipantsList />} />
                        <Route path="/bracket" element={<TournamentBracket />} />
                        <Route path="/match/:matchId" element={<MatchDetails />} />
                        <Route path="/results" element={<ResultsTable />} />
                    </Routes>
                </Container>

                <Box
                    component="footer"
                    sx={{
                        bgcolor: 'background.paper',
                        py: 2,
                        marginTop: 'auto',
                        borderTop: 1,
                        borderColor: 'divider',
                        textAlign: 'center'
                    }}
                >
                    <Typography variant="body2" color="text.secondary">
                        © 2025 Система управления турнирами
                    </Typography>
                </Box>
            </Router>
        </TournamentProvider>
    );
};

export default App;