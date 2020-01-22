//Imports postgres module and stablishes connection

const pg = require('pg');
const {Pool} = pg;

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'parva',
    password: 'riky895-',
    port: 5432
});

exports.pool = pool;