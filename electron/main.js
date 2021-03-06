const { app, BrowserWindow, screen, Menu } = require('electron')
const path = require('path')

const createWindow = () => {

    const screenElectron = screen;
    const display = screenElectron.getPrimaryDisplay();
    const dimensions = display.workAreaSize;

    const mainMenuTemplate = [
        {
            role: 'help',
            submenu: [
              {
                label: 'Online Help',
                click: async () => {
                  const { shell } = require('electron')
                  await shell.openExternal('https://www.flyyourselfvrsim.uk/content/thermals/anleitung/')
                }
              },
              {
                label: 'Linkpage',
                click: async () => {
                  const { shell } = require('electron')
                  await shell.openExternal('https://www.flyyourselfvrsim.uk/content/links/')
                }
              }
            ]
        }
    ]


    
    const mainMenu = Menu.buildFromTemplate(mainMenuTemplate)

    Menu.setApplicationMenu(mainMenu)

    const mainWindow = new BrowserWindow({
        width: parseInt(dimensions.width * 0.8),
        height: parseInt(dimensions.height * 0.8),
        minWidth: parseInt(dimensions.width * 0.8),
        minHeight: parseInt(dimensions.height * 0.8),
        maxWidth: dimensions.width,
        maxHeight: dimensions.height,
        icon: __dirname + '/icon.ico'
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
