const { app, BrowserWindow, ipcMain } = require('electron');
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
        minWidth:380,
        minHeight:550,
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