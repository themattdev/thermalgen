const { app, BrowserWindow, screen } = require('electron')
const path = require('path')

const createWindow = () => {

    const screenElectron = screen;
    const display = screenElectron.getPrimaryDisplay();
    const dimensions = display.workAreaSize;

    const mainWindow = new BrowserWindow({
        width: parseInt(dimensions.width * 0.8),
        height: parseInt(dimensions.height * 0.8),
        minWidth: parseInt(dimensions.width * 0.8),
        minHeight: parseInt(dimensions.height * 0.8),
        maxWidth: dimensions.width,
        maxHeight: dimensions.height
        /*
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }w
        */
    })

    mainWindow.maximize()

    mainWindow.loadFile('index.html')

}

app.whenReady().then(() => {
    createWindow()

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})
