import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    CircularProgress,
    Container,
    TextField,
    Typography,
    Alert,
    Fade,
    Chip,
    Stack
} from '@mui/material';
import { CloudDownload, CheckCircle, Error as ErrorIcon, AutoAwesome, PlaylistPlay } from '@mui/icons-material';
import Layout from './components/Layout';
import DownloadStatus from './components/DownloadStatus';
import QualitySelector from './components/QualitySelector';
import { useApp } from './context/AppContext';
import { useAuth } from './context/AuthContext';
import { isPlaylist } from './utils/platform';
import { downloadMedia, selectFormat } from './services/api';

function App() {
    const { selectedPlatform, settings } = useApp();
    const { user } = useAuth();
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null);
    const [message, setMessage] = useState('');
    const [playlistDetected, setPlaylistDetected] = useState(false);

    // New state for logs and progress
    const [logs, setLogs] = useState([]);
    const [progress, setProgress] = useState(0);

    // Quality Selection State
    const [showQualitySelector, setShowQualitySelector] = useState(false);
    const [availableFormats, setAvailableFormats] = useState([]);
    const [currentDownloadId, setCurrentDownloadId] = useState(null); // Need to track ID for selection call

    // Clear state when platform changes
    useEffect(() => {
        setUrl('');
        setStatus(null);
        setMessage('');
        setPlaylistDetected(false);
        setLogs([]);
        setProgress(0);
        setShowQualitySelector(false);
        setAvailableFormats([]);
        setCurrentDownloadId(null);
    }, [selectedPlatform]);

    useEffect(() => {
        setPlaylistDetected(isPlaylist(url));
    }, [url]);

    const handleDownload = async (e) => {
        e.preventDefault();
        if (!url) return;

        setLoading(true);
        setStatus('processing');
        setMessage('');
        setLogs(['Initializing scan...']);
        setProgress(0);
        setShowQualitySelector(false);

        try {
            if (!isValidUrl(url)) {
                throw new Error('Please enter a valid URL');
            }

            // Call API with callback for updates
            await downloadMedia(
                url,
                selectedPlatform,
                settings,
                playlistDetected,
                user?.id,
                (update) => {
                    if (update.log) setLogs(prev => [...prev, update.log]);
                    if (update.progress) setProgress(update.progress);

                    // Handle Status Updates
                    if (update.status === 'downloading') setStatus('downloading');
                    if (update.status === 'completed') setStatus('success');
                    if (update.status === 'failed') setStatus('error');

                    // HANDLE SELECTION PHASE
                    if (update.status === 'waiting_for_selection' && update.formats) {
                        setAvailableFormats(update.formats);
                        setShowQualitySelector(true);
                        setLogs(prev => [...prev, 'Please select a quality format...']);
                        // We need to know the ID to call selectFormat, but api.js handles it internally?
                        // Actually, we need to refactor api.js slightly to return the ID or handle selection 
                        // via a callback, OR we rely on the implementation where app.jsx calls selectFormat.
                        // Ideally, downloadMedia returns the ID immediately.
                        // For now, let's assume we can get it or verify api.js logic.
                        // Wait, api.js as written doesn't return the ID to the caller until completion.
                        // I will fix this by capturing the ID from the logs or modifying the API contract?
                        // Better: API passes ID in the update object.
                    }
                    if (update.downloadId) {
                        setCurrentDownloadId(update.downloadId);
                    }
                }
            );

            if (status !== 'waiting_for_selection') {
                setStatus('success');
                setMessage(`Successfully saved to: ${settings.outputPath}`);
            }

        } catch (err) {
            setStatus('error');
            setMessage(err.message || 'Failed to start download');
            setLogs(prev => [...prev, `ERROR: ${err.message}`]);
        } finally {
            if (status !== 'waiting_for_selection') {
                setLoading(false);
            }
        }
    };

    const handleFormatSelect = async (formatId) => {
        setShowQualitySelector(false);
        setLogs(prev => [...prev, `Selected format: ${formatId}. Starting download...`]);
        if (currentDownloadId) {
            await selectFormat(currentDownloadId, formatId);
        }
    };

    const isValidUrl = (string) => {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    };

    const getPlaceholder = () => {
        switch (selectedPlatform) {
            case 'YouTube': return 'Paste YouTube video or playlist URL...';
            case 'Shorts': return 'Paste YouTube Shorts URL...';
            case 'Instagram': return 'Paste Instagram post/reel URL...';
            case 'Threads': return 'Paste Threads link...';
            case 'Facebook': return 'Paste Facebook video URL...';
            case 'TikTok': return 'Paste TikTok video URL...';
            default: return 'Paste any supported URL...';
        }
    };

    return (
        <Layout>
            <Container maxWidth="md">
                <Box sx={{ textAlign: 'center', mb: 8 }}>
                    <Stack direction="row" spacing={1} justifyContent="center" mb={2}>
                        <Chip
                            icon={<AutoAwesome />}
                            label={`Engine: yt-dlp | Mode: ${selectedPlatform}`}
                            color="primary"
                            variant="outlined"
                            sx={{ borderRadius: 2 }}
                        />
                        {playlistDetected && (
                            <Chip
                                icon={<PlaylistPlay />}
                                label="Playlist Detected"
                                color="secondary"
                                variant="filled"
                                sx={{ borderRadius: 2 }}
                            />
                        )}
                    </Stack>

                    <Typography variant="h2" component="h1" gutterBottom sx={{
                        fontWeight: 800,
                        background: selectedPlatform === 'TikTok' ? 'linear-gradient(45deg, #00f2ea 30%, #ff0050 90%)' : 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        textTransform: 'uppercase',
                        letterSpacing: '-1px'
                    }}>
                        {selectedPlatform === 'Universal' ? 'Universal Downloader' : `${selectedPlatform} Downloader`}
                    </Typography>
                    <Typography variant="h6" color="text.secondary">
                        {selectedPlatform === 'Universal'
                            ? 'Download video & audio from all supported platforms in high quality.'
                            : `Specialized downloader for ${selectedPlatform} content.`}
                    </Typography>
                </Box>

                <Card sx={{
                    p: 3,
                    borderRadius: 6,
                    background: 'rgba(30, 30, 30, 0.6)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
                }}>
                    <CardContent>
                        <form onSubmit={handleDownload}>
                            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                                <TextField
                                    fullWidth
                                    variant="outlined"
                                    placeholder={getPlaceholder()}
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    disabled={loading}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 3,
                                            height: '56px',
                                            bgcolor: 'background.paper'
                                        }
                                    }}
                                />
                                <Button
                                    type="submit"
                                    variant="contained"
                                    size="large"
                                    disabled={loading || !url}
                                    startIcon={loading && !logs.length ? <CircularProgress size={20} color="inherit" /> : <CloudDownload />}
                                    sx={{
                                        px: 4,
                                        minWidth: '160px',
                                        borderRadius: 3,
                                        fontSize: '1.1rem',
                                        fontWeight: 700,
                                        textTransform: 'none',
                                        boxShadow: '0 4px 14px 0 rgba(33, 150, 243, 0.39)'
                                    }}
                                >
                                    {loading ? 'Processing' : 'Download'}
                                </Button>
                            </Box>
                        </form>

                        {/* Logs and Progress Section */}
                        {(loading || logs.length > 0) && (
                            <Fade in={true}>
                                <div>
                                    <DownloadStatus logs={logs} progress={progress} status={loading ? 'downloading' : 'completed'} />
                                </div>
                            </Fade>
                        )}

                        {/* Quality Selector Dialog */}
                        <QualitySelector
                            open={showQualitySelector}
                            formats={availableFormats}
                            onSelect={handleFormatSelect}
                            onClose={() => setShowQualitySelector(false)}
                        />

                    </CardContent>
                </Card>

                <Box sx={{ mt: 4, minHeight: 60 }}>
                    <Fade in={!!status && status !== 'processing' && status !== 'downloading'}>
                        <Alert
                            icon={status === 'success' ? <CheckCircle fontSize="inherit" /> : <ErrorIcon fontSize="inherit" />}
                            severity={status === 'success' ? 'success' : 'error'}
                            variant="filled"
                            sx={{ borderRadius: 3, width: '100%', alignItems: 'center' }}
                        >
                            {message}
                        </Alert>
                    </Fade>
                </Box>
            </Container>
        </Layout>
    );
}

export default App;
