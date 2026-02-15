# Universal Downloader

A modern, responsive web application for downloading videos and audio from various platforms (YouTube, Instagram, TikTok, Facebook, etc.). Built with React, Vite, and Material UI.

## Features

- **Material Design UI**: Professional dark mode interface using `@mui/material`.
- **Responsive Layout**: Optimized for Mobile, Tablet, and Desktop.
- **Platform Support**:
    - YouTube & YouTube Shorts (with Playlist support)
    - Instagram (Posts/Reels)
    - Facebook
    - TikTok
    - Threads
- **Smart Detection**: Automatically detects the platform and adjusts the UI.
- **Settings**:
    - Resolution Selection (8K to 360p)
    - Output Folder Management (with Directory Picker)
- **Architecture**: Frontend-ready for `yt-dlp` backend integration.

## Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/NomuraAI/Downloader_Universal.git
    cd Downloader_Universal
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Start the development server:
    ```bash
    npm run dev
    ```

## Building for Production

To create a production build:

```bash
npm run build
```

The output will be in the `dist/` directory.

## Project Structure

- `src/components/`: UI components (Layout, SettingsDialog, etc.)
- `src/context/`: Global state management (AppContext)
- `src/utils/`: Utility functions (Platform detection)
- `src/services/`: API mock services
- `src/theme.js`: Material UI theme configuration

## License

ISC
