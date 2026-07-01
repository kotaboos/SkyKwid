const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');

let mainWindow;

function getSongs() {
    const musicFolder = path.join(__dirname, 'music');
    const songs = [];
    try {
        const files = fs.readdirSync(musicFolder);
        files.forEach(file => {
            if (file.toLowerCase().endsWith('.mp3')) {
                const name = file.replace(/\.mp3$/i, '');
                let artist = 'Неизвестен', title = name;
                if (name.includes(' - ')) {
                    const parts = name.split(' - ');
                    artist = parts[0];
                    title = parts.slice(1).join(' - ');
                }
                songs.push({ title, artist, file: path.join(musicFolder, file) });
            }
        });
    } catch (e) {
        console.log('Папка music не найдена');
    }
    return songs;
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 450,
        height: 700,
        minWidth: 400,
        minHeight: 550,
        maxWidth: 600,
        maxHeight: 800,
        frame: false,
        titleBarStyle: 'hidden',
        title: 'SkyKwid',
        icon: path.join(__dirname, 'images', 'icon.png'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });
    mainWindow.setMenuBarVisibility(false);
    // mainWindow.webContents.openDevTools();
    mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
    createWindow();
});

ipcMain.handle('get-songs', () => getSongs());

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// обработчики команд из интерфейса (управление окном)
ipcMain.on('window-minimize', () => mainWindow.minimize());
ipcMain.on('window-maximize', () => {
    if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
    } else {
        mainWindow.maximize();
    }
});
ipcMain.on('window-close', () => mainWindow.close());

// плейлисты
const playlistsPath = path.join(__dirname, 'playlists.json');

function loadPlaylistsFile() {
    try {
        if (fs.existsSync(playlistsPath)) {
            const data = fs.readFileSync(playlistsPath, 'utf8');
            return JSON.parse(data);
        }
    } catch (e) {}
    return [];
}

function savePlaylistsFile(playlists) {
    try {
        fs.writeFileSync(playlistsPath, JSON.stringify(playlists, null, 2));
    } catch (e) {
        console.error('Ошибка сохранения плейлистов:', e);
    }
}

function scanFolderForSongs(folderPath) {
    const songs = [];
    try {
        const files = fs.readdirSync(folderPath);
        files.forEach(file => {
            if (file.toLowerCase().endsWith('.mp3')) {
                const name = file.replace(/\.mp3$/i, '');
                let artist = 'Неизвестен', title = name;
                if (name.includes(' - ')) {
                    const parts = name.split(' - ');
                    artist = parts[0];
                    title = parts.slice(1).join(' - ');
                }
                songs.push({ title: title, artist: artist, file: path.join(folderPath, file) });
            }
        });
    } catch (e) {
        console.error('Ошибка сканирования папки:', e);
    }
    return songs;
}

ipcMain.handle('load-playlists', () => loadPlaylistsFile());
ipcMain.handle('save-playlists', (event, playlists) => savePlaylistsFile(playlists));
ipcMain.handle('scan-folder', (event, folderPath) => scanFolderForSongs(folderPath));
ipcMain.handle('select-folder-dialog', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    });
    if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0];
    }
    return null;
});

// выбор файлов - плейлист
ipcMain.handle('select-files-dialog', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile', 'multiSelections'],
        filters: [{ name: 'MP3', extensions: ['mp3'] }]
    });
    if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths;
    }
    return null;
});