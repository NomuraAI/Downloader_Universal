import React, { createContext, useState, useContext, useEffect } from 'react';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
    const [selectedPlatform, setSelectedPlatform] = useState('Universal');
    const [settings, setSettings] = useState({
        resolution: localStorage.getItem('resolution') || '1080p',
        outputPath: localStorage.getItem('outputPath') || 'Downloads',
    });

    const updateSettings = (newSettings) => {
        setSettings(newSettings);
        localStorage.setItem('resolution', newSettings.resolution);
        localStorage.setItem('outputPath', newSettings.outputPath);
    };

    return (
        <AppContext.Provider value={{ selectedPlatform, setSelectedPlatform, settings, updateSettings }}>
            {children}
        </AppContext.Provider>
    );
};

export const useApp = () => useContext(AppContext);
