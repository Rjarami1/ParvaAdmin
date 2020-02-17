//Imports postgres module and stablishes connection

const pg = require('pg');
const {Pool} = pg;

const pool = new Pool({
    user: 'myadmin@parvaadmin',
    host: 'parvaadmin.postgres.database.azure.com',
    database: 'postgres',
    password: 'abcABC123',
    port: 5432
});

exports.pool = pool;