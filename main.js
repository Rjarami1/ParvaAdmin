const electron = require('electron');
const path = require('path');
const url = require('url')

const pg = require('pg');
const {Pool} = pg;

//Initializing electron objects
const {app, BrowserWindow, Menu, ipcMain} = electron;

//Declaring Browser Windows
let mainWindow;

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true
        }
    })

    mainWindow.loadFile('mainWindow.html');

    mainWindow.on('close', () => {
        mainWindow = null;
    })
}

app.on('ready', () => {
    createMainWindow();

    const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
    Menu.setApplicationMenu(mainMenu);
});

ipcMain.on('login:in', (e, arr) => {

    //Construye consulta
    const text = 'SELECT * FROM public.users WHERE username = $1 AND password = $2'
    const values = arr;

    var result;

    //Realiza consulta
    pool.query(text, values, (err, res) => {
        if(err){
            console.log(err.stack)
        }else{
            result = res.rows[0];
            if(result == undefined){ //Revisar por qué no se puede hacer esta validación
                                     //Fuera de la función 'pool.query'
                mainWindow.webContents.send('login:info', 1);
            }
            else{
                mainWindow.loadFile('welcome.html');
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
                label: 'Cerrar Sesión'
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

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: 'admin',
    port: 5432
});