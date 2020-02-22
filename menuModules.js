const bd = require('./connection');

//const {Menu, app} = require('electron');

async function  createMenu(id, window){
    const text = 'SELECT m.module_name, m.page_name FROM security."UsersModules" AS um INNER JOIN security.modules AS m ON m.module_id = um.module_id WHERE um.user_id = $1'
    const values = [id];
    let submenu = [];
    let userMenu;

try{

    let res = await bd.pool.query(text, values);
    res.rows.forEach(item => {
        submenu.push({
            label: item.module_name,
            click() {
                window.loadFile(`src/${item.page_name}`);
            }
        })
    });

    userMenu = {
        label: 'Modulos',
        submenu: submenu
    }

    return userMenu;

} catch(e) {
        console.log(e.stack);
    }
}

exports.createMenu = createMenu;