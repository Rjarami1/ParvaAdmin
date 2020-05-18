//Imports postgres module and stablishes connection

const pg = require('pg');
const { Pool } = pg;

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'ParvaAdmin',
    password: 'swatsilver159',
    port: 5432,
    //ssl: 'require'
});

exports.pool = pool;