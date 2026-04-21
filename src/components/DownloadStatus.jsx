import React, { useEffect, useRef } from 'react';
import { Box, LinearProgress, Typography, Paper } from '@mui/material';
import { Terminal } from '@mui/icons-material';

const DownloadStatus = ({ logs, progress, status }) => {
    const logEndRef = useRef(null);

    // Auto-scroll to bottom of logs
    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    return (
        <Box sx={{ width: '100%', mt: 4 }}>
            {/* Progress Bar */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Box sx={{ width: '100%', mr: 1 }}>
                    <LinearProgress
                        variant={status === 'downloading' ? "determinate" : "indeterminate"}
                        value={progress}
                        sx={{
                            height: 10,
                            borderRadius: 5,
                            backgroundColor: 'rgba(255,255,255,0.1)',
                            '& .MuiLinearProgress-bar': {
                                borderRadius: 5,
                                background: 'linear-gradient(90deg, #2196F3 0%, #21CBF3 100%)'
                            }
                        }}
                    />
                </Box>
                <Box sx={{ minWidth: 35 }}>
                    <Typography variant="body2" color="text.secondary">{`${Math.round(progress)}%`}</Typography>
                </Box>
            </Box>

            {/* Terminal / Logs */}
            <Paper
                elevation={3}
                sx={{
                    bgcolor: '#000',
                    color: '#00ff00',
                    p: 2,
                    borderRadius: 2,
                    fontFamily: 'monospace',
                    maxHeight: 200,
                    overflowY: 'auto',
                    border: '1px solid #333'
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, borderBottom: '1px solid #333', pb: 1 }}>
                    <Terminal sx={{ fontSize: 16, mr: 1, color: '#666' }} />
                    <Typography variant="caption" color="text.secondary">System Log</Typography>
                </Box>

                {logs.map((log, index) => (
                    <Typography key={index} variant="body2" sx={{ fontSize: '0.85rem', lineHeight: 1.5 }}>
                        <span style={{ color: '#666', marginRight: 8 }}>[{new Date().toLocaleTimeString()}]</span>
                        {log}
                    </Typography>
                ))}
                {status === 'processing' && (
                    <Typography variant="body2" sx={{ fontSize: '0.85rem', animation: 'blink 1s step-end infinite' }}>
                        _
                    </Typography>
                )}
                <div ref={logEndRef} />
            </Paper>
            <style>
                {`@keyframes blink { 50% { opacity: 0; } }`}
            </style>
        </Box>
    );
};

export default DownloadStatus;
