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
    const text1 = 'SELECT * FROM security.users WHERE cedula = $1 AND password = $2'
    const values1 = arr;

    const text2 = 'UPDATE security.users SET date_last_login = LOCALTIMESTAMP WHERE user_id = $1';


    //Realiza consulta
    db.pool.query(text1, values1, (err, res) => {
        if(err){
            console.log(err.stack);
        }else{
            userInfo = res.rows[0];
            if(userInfo == undefined){ //Revisar por qué no se puede hacer esta validación
                                     //Fuera de la función 'pool.query'
                mainwc.send('login:info', 1);
            }
            else{
                const values2 = [userInfo.user_id];
                db.pool.query(text2, values2, (err, res) => {
                    if(err){
                        console.log(err.stack);
                    }
                })
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
    sendUsersList();
})

ipcMain.on('admin:create', (e) => {
    createUserWindow = new BrowserWindow({
        width: 400,
        height: 300,
        webPreferences: {
            nodeIntegration: true
        },
        parent: mainWindow,
        modal: true,
        frame: false,
        resizable: false,
    })

    createwc = createUserWindow.webContents;

    createUserWindow.loadFile('createUser.html');

    createUserWindow.on('close', () => {
        createUserWindow = null;
    })
})

ipcMain.on('usrCreate:cancel', (e) => {
    createUserWindow.close();
})

ipcMain.on('usrCreate:create', (e, obj) => {
    let values = [
        obj.cedula,
        obj.name,
        obj.password,
        obj.position
    ];

    const text = 'INSERT INTO security.users(cedula, name, date_create, password, "position") VALUES ($1, $2, LOCALTIMESTAMP, $3, $4);';

    db.pool.query(text, values, (err, res) => {
        if(err){
            console.log(err.stack);
        }else{
            sendUsersList();
            createUserWindow.close();
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

function sendUsersList(){
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
}