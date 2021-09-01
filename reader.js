const { Pool } = require('pg');
require('dotenv').config();
var JefNode = require('json-easy-filter').JefNode;
const tables = require('./queries/tables.json');
const columns = require('./queries/columns.json');
const foreignkeys = require('./queries/foreignkeys.json');
const Select = require('./src/Select');
const Insert = require('./src/Insert');
const Update = require('./src/Update');
const Delete = require('./src/Delete');
const Distinct = require('./src/Distinct');

const letters = new RegExp(/^[_a-zA-Z0-9]+$/);
const pool = new Pool({
    host: process.env.READER_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});
class Reader {
    constructor() {
        this.Distinct = Distinct;
        this.Select = Select;
        this.table_query = tables.query;
        this.column_query = columns.query;
        this.foreign_keys = foreignkeys.query;
    }

    async execute(sql, values) {
        let result;
        //let client = await pool.connect();
        try {
            if (values && values.length > 0) {
                console.log('executed: ', sql, values);
                result = await pool.query(sql, values);
                
            } else {
                console.log('execute: ', sql);
                result = await pool.query(sql);
            }
            return result.rows;
        } catch (err) {
            throw (err);
        } /* finally {
            client.release();
        } */
    }

    async tables() {
        var query = this.table_query;
        try {
            let results = await this.execute(query, null);
            return results.map(item => {
                return item.name
            });
        } catch (err) {
            throw (err);
        }
    }

    async columns(tables) {
        var query = this.column_query;
        var tbls = "";
        tables.forEach((table) => {
            tbls += `'${table.name}',`
        });
        tbls = tbls.substr(0, tbls.length - 1);
        query = query.replace("@@table", tbls);
        try {
            let results = await this.execute(query, null);
            return results.map(item => {
                return item;
            });
        } catch (err) {
            throw (err);
        }
    }

    async foreignkeys(table) {
        var query = foreignkeys.query;
        query = query.replace("@@table", table);
        try {
            console.log(query);
            let results = await this.execute(query, null);
            return results.map(item => {
                return item;
            });
        } catch (err) {
            throw (err);
        }
    }
    async select(args) {
        let valid = this.isValid(args);
        if (!valid) {
            return Error("Syntax error in schema!");
        }

        var query = Select.build(args);
        delete args["groupBy"];
        var values = this.extactValues(args);
        let tables = args.tables;
        let columns = await this.columns(tables);
        let queryColumns = [];
        tables.forEach(table => {
            table.columns.forEach((column) => {
                queryColumns.push({ table: table.name, name: column.name, alias: column.alias })
            });
        });
        var rows = [];
        try {
            let list = await this.execute(query, values);
            list.forEach((item) => {
                var keys = Object.keys(item);
                keys.forEach((x) => {
                    var column = queryColumns.find((c) => {
                        return c.name === x || (c.alias !== undefined && c.alias === x);
                    });
                    var tbl_col = columns.find((c) => {
                        return c.name === column.name && c.table === column.table;
                    });
                    if (tbl_col.type === "bigint" || tbl_col.type === "integer" || tbl_col.type === "real" || tbl_col.type === "numeric") {
                        item[x] = Number(item[x]);
                    }
                    else if (tbl_col.type === "boolean") {
                        item[x] = Boolean(item[x]);
                    }
                });
                rows.push(item);
            });
            return rows;
        } catch (err) {
            throw (err);
        }
    }

    async distinct(args) {
        let valid = this.isValid(args);
        if (!valid) {
            return Error("Syntax error in schema!");
        }

        var query = Distinct.build(args);
        delete args["groupBy"];
        var values = this.extactValues(args);
        let tables = args.tables;
        let columns = await this.columns(tables);
        let queryColumns = [];
        tables.forEach(table => {
            table.columns.forEach((column) => {
                queryColumns.push({ table: table.name, name: column.name, alias: column.alias })
            });
        });

        var rows = [];
        try {
            let list = await this.execute(query, values);
            list.forEach((item) => {
                var keys = Object.keys(item);
                keys.forEach((x) => {
                    var column = queryColumns.find((c) => {
                        return c.name === x || (c.alias !== undefined && c.alias === x);
                    });
                    var tbl_col = columns.find((c) => {
                        return c.name === column.name && c.table === column.table;
                    });
                    if (tbl_col.type === "bigint" || tbl_col.type === "integer" || tbl_col.type === "real" || tbl_col.type === "numeric") {
                        item[x] = Number(item[x]);
                    }
                    else if (tbl_col.type === "boolean") {
                        item[x] = Boolean(item[x]);
                    }
                });
                rows.push(item);
            });
            return rows;
        } catch (err) {
            throw (err);
        }
    }

    async count(args) {
        let valid = this.isValid(args);
        if (!valid) {
            return Error("Syntax error in schema!");
        }
        var sql = `SELECT COUNT(1) FROM ${args.table}`;
        sql += this.Select.where(args.criteria);
        var values = this.extactValues(args);
        let result = await this.execute(sql, values);
        return result[0].count;
    }

    async min(args) {
        let valid = this.isValid(args);
        if (!valid) {
            return Error("Syntax error in schema!");
        }
        var input = args;
        var sql = `SELECT MIN(${input.column}) FROM ${input.table}`
        sql += this.Select.where(input.criteria);
        var values = this.extactValues(args);
        let result = await this.execute(sql, values);
        return result[0].min;
    }

    async max(args) {
        let valid = this.isValid(args);
        if (!valid) {
            return Error("Syntax error in schema!");
        }
        var input = args;
        var sql = `SELECT MAX(${input.column}) FROM ${input.table}`
        sql += this.Select.where(input.criteria);
        var values = this.extactValues(args);
        let result = await this.execute(sql, values);
        return result[0].max;
    }

    async sum(args) {
        let valid = this.isValid(args);
        if (!valid) {
            return Error("Syntax error in schema!");
        }
        var input = args;
        var sql = `SELECT SUM(${input.column}) FROM ${input.table}`
        sql += this.Select.where(input.criteria);
        var values = this.extactValues(args);
        let result = await this.execute(sql, values);
        return result[0].sum;
    }

    async avg(args) {
        let valid = this.isValid(args);
        if (!valid) {
            return Error("Syntax error in schema!");
        }
        var input = args;
        var sql = `SELECT AVG(${input.column}) FROM ${input.table}`
        sql += this.Select.where(input.criteria);
        var values = this.extactValues(args);
        let result = await this.execute(sql, values);
        return result[0].avg;
    }

    schema(args) {
        var keys = Object.keys(args);
        return keys.map(key => {
            if (key !== "value" && key !== "values") {
                if (typeof args[key] == "object") {
                    return this.schema(args[key])
                } else {
                    if (typeof args[key] === "string") {
                        return { valid: letters.test(args[key]) }
                    }
                }
            }
        });
    }
    extact(input) {
        var keys = Object.keys(input);
        return keys.map(key => {
            if (typeof input[key] == "object") {
                return this.extact(input[key])
            } else {
                if (key === "value" || key === "values") {
                    return input[key];
                } else {
                    if (Number(key) >= 0) {
                        return input[key];
                    }
                }
            }
        });
    }

    extactValues(args) {
        var values_from_schema = this.extact(args);
        var values = new JefNode(values_from_schema).filter(function (node) {
            var value;
            switch (node.type()) {
                case "number":
                    value = node.value;
                    break;
                case "boolean":
                    value = node.value;
                    break;
                case "string":
                    value = node.value;
                    break;
            }

            return value;
        });
        return values;
    }

    isValid(args) {
        var counts = 0;
        var validated_schema = this.schema(args);
        var valid = new JefNode(validated_schema).filter(function (node) {
            if (node.type() === 'boolean') {
                return { valid: node.value };
            }
        });

        valid.forEach(x => {
            if (x.valid === false) {
                counts++;
            }
        });
        return (counts > 0) ? false : true;
    }
}
module.exports = new Reader();