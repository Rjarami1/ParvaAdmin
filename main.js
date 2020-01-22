const electron = require('electron');
const path = require('path');
const url = require('url')

const db = require('./connection');
const userMenu = require('./menuModules');

//Initializing electron objects
const {app, BrowserWindow, Menu, ipcMain} = electron;

//Declaring Browser Windows
let mainWindow;

let userInfo;
let mainwc;

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true
        }
    })

    mainwc = mainWindow.webContents;

    mainWindow.loadFile('mainWindow.html');

    mainWindow.on('close', () => {
        mainWindow = null;
    })
}

app.on('ready', () => {
    createMainWindow();

    let mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
    Menu.setApplicationMenu(mainMenu);
});

ipcMain.on('login:in', (e, arr) => {

    //Construye consulta
    const text = 'SELECT * FROM security.users WHERE login = $1 AND password = $2'
    const values = arr;


    //Realiza consulta
    db.pool.query(text, values, (err, res) => {
        if(err){
            console.log(err.stack)
        }else{
            userInfo = res.rows[0];
            if(userInfo == undefined){ //Revisar por qué no se puede hacer esta validación
                                     //Fuera de la función 'pool.query'
                mainwc.send('login:info', 1);
            }
            else{
                mainWindow.loadFile('welcome.html');
                mainwc.on('dom-ready', () => {
                    mainwc.send('user:name', userInfo.name);
                })
                userMenu.createMenu(userInfo.user_id, mainWindow)
                .then(res => {
                    mainMenuTemplate.push(res);
                    mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
                    Menu.setApplicationMenu(mainMenu);
                })
            }
        }
    })
})

const mainMenuTemplate = [
    {
        label: 'Archivo',
        submenu: [
            {
                label: 'Salir',
                accelerator: process.platform == 'darwin' ? 'Command+Q' : 'Ctrl+Q',
                click(){
                    app.quit();
                }
            },
            {
                label: 'Cerrar Sesión',
                click(){
                    mainWindow.loadFile('mainWindow.html')
                }
            }
        ]
    }
];

if(process.env.NODE_ENV !== 'production'){
    mainMenuTemplate.push({
        label: 'Dev tools',
        submenu:[
            {
                label: 'Activar',
                accelerator: process.platform == 'darwin' ? 'Command+I' : 'Ctrl+I',
                click(item, focusedWindow){
                    focusedWindow.webContents.openDevTools();
                }
        },
        {
            role: 'reload'
        }
    ]
    })
}