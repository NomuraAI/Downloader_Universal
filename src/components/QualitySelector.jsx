import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Chip,
    DialogActions,
    Button,
    Typography,
    Box
} from '@mui/material';
import { HighQuality, Sd } from '@mui/icons-material';

const QualitySelector = ({ open, formats, onClose, onSelect }) => {
    if (!formats || formats.length === 0) return null;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Select Quality</DialogTitle>
            <DialogContent dividers>
                <List>
                    {formats.map((format) => (
                        <ListItem key={format.format_id} disablePadding>
                            <ListItemButton onClick={() => onSelect(format.format_id)}>
                                <ListItemText
                                    primary={
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Typography variant="body1" fontWeight="bold">
                                                {format.resolution}
                                            </Typography>
                                            <Chip
                                                label={format.ext}
                                                size="small"
                                                color="primary"
                                                variant="outlined"
                                                sx={{ height: 20 }}
                                            />
                                        </Box>
                                    }
                                    secondary={format.filesize ? `Size: ${format.filesize}` : 'Size unknown'}
                                />
                                {(format.resolution.includes('1080') || format.resolution.includes('4K')) ? (
                                    <HighQuality color="primary" />
                                ) : (
                                    <Sd color="action" />
                                )}
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="inherit">Cancel</Button>
            </DialogActions>
        </Dialog>
    );
};

export default QualitySelector;
