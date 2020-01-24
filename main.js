const electron = require('electron');
const path = require('path');
const url = require('url')

const db = require('./connection');
const userMenu = require('./menuModules');

//Initializing electron objects
const {app, BrowserWindow, Menu, ipcMain} = electron;

//Declaring Browser Windows
let mainWindow;
let createUserWindow;

let userInfo;
let mainwc;
let createwc;

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

ipcMain.on('admin:ready', (e) => {
    const text = 'SELECT * FROM security.users';
    let users;

    db.pool.query(text, (err, res) => {
        if(err){
            console.log(err.stack);
        }else{
            users = res.rows;
            mainwc.send('users:info', users);
        }
    })
})

ipcMain.on('admin:create', (e) => {
    createUserWindow = new BrowserWindow({
        width: 400,
        height: 300,
        webPreferences: {
            nodeIntegration: true
        }
    })

    createwc = createUserWindow.webContents;

    createUserWindow.loadFile('createUser.html');

    createUserWindow.on('close', () => {
        createUserWindow = null;
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
                    if(mainMenuTemplate.length > 2){
                        let i = 0;
                        mainMenuTemplate.forEach(element => {
                            if(element.label == 'Modulos'){
                                mainMenuTemplate.splice(i,1);
                                //break;
                            }
                            i++;
                        });
                        mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
                        Menu.setApplicationMenu(mainMenu);
                    }
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