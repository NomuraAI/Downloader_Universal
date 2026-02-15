import React, { useState } from 'react';
import {
    AppBar,
    Box,
    CssBaseline,
    Divider,
    Drawer,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Toolbar,
    Typography,
    useTheme,
    useMediaQuery,
    Tooltip
} from '@mui/material';
import {
    Menu as MenuIcon,
    Settings as SettingsIcon,
    YouTube,
    Instagram,
    Facebook,
    MusicNote,
    Public
} from '@mui/icons-material';
import SettingsDialog from './SettingsDialog';
import { useApp } from '../context/AppContext';

const drawerWidth = 240;

const Layout = ({ children }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [mobileOpen, setMobileOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);

    const { selectedPlatform, setSelectedPlatform } = useApp();

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    const platforms = [
        { name: 'Universal', icon: <Public color="action" /> },
        { name: 'YouTube', icon: <YouTube color="error" /> },
        { name: 'Shorts', icon: <YouTube color="error" sx={{ opacity: 0.8 }} /> }, // Differentiating Shorts
        { name: 'Instagram', icon: <Instagram color="secondary" /> },
        { name: 'Threads', icon: <Box component="span" sx={{ fontSize: 24, fontWeight: 'bold' }}>@</Box> }, // Threads-like icon
        { name: 'Facebook', icon: <Facebook color="primary" /> },
        { name: 'TikTok', icon: <MusicNote sx={{ color: '#00f2ea' }} /> },
    ];

    const drawer = (
        <div>
            <Toolbar>
                <Typography variant="h6" noWrap component="div" sx={{
                    fontWeight: 'bold',
                    background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                }}>
                    Universal DL
                </Typography>
            </Toolbar>
            <Divider />
            <List>
                {platforms.map((platform) => (
                    <ListItem key={platform.name} disablePadding>
                        <ListItemButton
                            selected={selectedPlatform === platform.name}
                            onClick={() => {
                                setSelectedPlatform(platform.name);
                                if (isMobile) setMobileOpen(false);
                            }}
                            sx={{
                                '&.Mui-selected': {
                                    bgcolor: 'rgba(144, 202, 249, 0.16)',
                                    borderRight: '4px solid #90caf9'
                                }
                            }}
                        >
                            <ListItemIcon>
                                {platform.icon}
                            </ListItemIcon>
                            <ListItemText primary={platform.name} />
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>
            <Divider />
            <List>
                <ListItem disablePadding>
                    <ListItemButton onClick={() => setSettingsOpen(true)}>
                        <ListItemIcon>
                            <SettingsIcon />
                        </ListItemIcon>
                        <ListItemText primary="Settings" />
                    </ListItemButton>
                </ListItem>
            </List>
        </div>
    );

    return (
        <Box sx={{ display: 'flex' }}>
            <CssBaseline />
            <AppBar
                position="fixed"
                sx={{
                    width: { md: `calc(100% - ${drawerWidth}px)` },
                    ml: { md: `${drawerWidth}px` },
                    bgcolor: 'background.default',
                    backdropFilter: 'blur(20px)',
                    background: 'rgba(18, 18, 18, 0.8)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    boxShadow: 'none'
                }}
            >
                <Toolbar>
                    <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        edge="start"
                        onClick={handleDrawerToggle}
                        sx={{ mr: 2, display: { md: 'none' } }}
                    >
                        <MenuIcon />
                    </IconButton>
                    <Typography variant="h6" noWrap component="div">
                        {selectedPlatform}
                    </Typography>
                    <Box sx={{ flexGrow: 1 }} />
                    <Tooltip title="Settings">
                        <IconButton onClick={() => setSettingsOpen(true)} color="inherit">
                            <SettingsIcon />
                        </IconButton>
                    </Tooltip>
                </Toolbar>
            </AppBar>
            <Box
                component="nav"
                sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
                aria-label="mailbox folders"
            >
                <Drawer
                    variant="temporary"
                    open={mobileOpen}
                    onClose={handleDrawerToggle}
                    ModalProps={{
                        keepMounted: true,
                    }}
                    sx={{
                        display: { xs: 'block', md: 'none' },
                        '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
                    }}
                >
                    {drawer}
                </Drawer>
                <Drawer
                    variant="permanent"
                    sx={{
                        display: { xs: 'none', md: 'block' },
                        '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: '1px solid rgba(255,255,255,0.08)' },
                    }}
                    open
                >
                    {drawer}
                </Drawer>
            </Box>
            <Box
                component="main"
                sx={{ flexGrow: 1, p: 3, width: { md: `calc(100% - ${drawerWidth}px)` }, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
            >
                <Toolbar />
                {children}
            </Box>
            <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        </Box>
    );
};

export default Layout;
