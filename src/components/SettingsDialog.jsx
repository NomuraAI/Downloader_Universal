import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    Box,
    InputAdornment,
    IconButton
} from '@mui/material';
import { FolderOpen } from '@mui/icons-material';
import { useApp } from '../context/AppContext';

const SettingsDialog = ({ open, onClose }) => {
    const { settings, updateSettings } = useApp();
    const [localResolution, setLocalResolution] = useState(settings.resolution);
    const [localOutputPath, setLocalOutputPath] = useState(settings.outputPath);

    useEffect(() => {
        if (open) {
            setLocalResolution(settings.resolution);
            setLocalOutputPath(settings.outputPath);
        }
    }, [open, settings]);

    const handleSave = () => {
        updateSettings({
            resolution: localResolution,
            outputPath: localOutputPath
        });
        onClose();
    };

    const handleBrowse = async () => {
        if ('showDirectoryPicker' in window) {
            try {
                const dirHandle = await window.showDirectoryPicker();
                if (dirHandle) {
                    setLocalOutputPath(dirHandle.name);
                }
            } catch (error) {
                console.error('Error selecting folder:', error);
            }
        } else {
            alert('Directory Picker API is not supported in this browser.');
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Settings</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
                    <FormControl fullWidth>
                        <InputLabel>Preferred Resolution</InputLabel>
                        <Select
                            value={localResolution}
                            label="Preferred Resolution"
                            onChange={(e) => setLocalResolution(e.target.value)}
                        >
                            <MenuItem value="4320p">8K (4320p)</MenuItem>
                            <MenuItem value="2160p">4K (2160p)</MenuItem>
                            <MenuItem value="1440p">2K (1440p)</MenuItem>
                            <MenuItem value="1080p">1080p</MenuItem>
                            <MenuItem value="720p">720p</MenuItem>
                            <MenuItem value="480p">480p</MenuItem>
                            <MenuItem value="best">Best Available</MenuItem>
                        </Select>
                    </FormControl>

                    <TextField
                        label="Output Folder Name"
                        fullWidth
                        value={localOutputPath}
                        onChange={(e) => setLocalOutputPath(e.target.value)}
                        helperText="Files will be saved to this folder"
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton onClick={handleBrowse} edge="end" title="Browse Folder">
                                        <FolderOpen />
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="inherit">Cancel</Button>
                <Button onClick={handleSave} variant="contained" color="primary">
                    Save Changes
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default SettingsDialog;
