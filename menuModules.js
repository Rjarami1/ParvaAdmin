const bd = require('./connection');

const {Menu, app} = require('electron');

function createMenu(id, window){
    const text = 'SELECT m.module_name, m.page_name FROM security."UsersModules" AS um INNER JOIN security.modules AS m ON m.module_id = um.module_id WHERE um.user_id = $1'
    const values = [id];
    let submenu = [];
    let userMenu;

    bd.pool.query(text, values)
        .then(res => {
            res.rows.forEach(item => {
                submenu.push({
                    label: item.module_name,
                    click() {
                        window.loadFile(item.page_name)
                    }
                })
            });
            userMenu = [{
                label: 'Modulos',
                submenu: submenu
            }]
            console.log(userMenu);
            return userMenu;
        }).catch(
            e => {console.log(e);}
        )
}

console.log(createMenu(1));