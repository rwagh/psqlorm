const { Pool } = require('pg');
require('dotenv').config();
var JefNode = require('json-easy-filter').JefNode;
const Insert = require('./src/Insert');
const Update = require('./src/Update');
const Delete = require('./src/Delete');

const letters = new RegExp(/^[_a-zA-Z0-9]+$/);
const pool = new Pool({
    host: process.env.WRITER_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    max: 20,
    poolSize:  20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});
class Writer {
    constructor() {
        this.Insert = Insert;
        this.Update = Update;
        this.Delete = Delete;
    }

    async execute(sql, values) {
        let result;
        let client = await pool.connect();
        try {
            if (values && values.length > 0) {
                console.log('executed: ', sql, values);
                result = await client.query(sql, values);
            } else {
                console.log('execute: ', sql);
                result = await client.query(sql);
            }
            return result.rows;
        } catch (err) {
            throw (err);
        } finally{
            client.release();
        }
    }

    async insert(args, values) {
        let valid = this.isValid(args);
        if (!valid) {
            return Error("Syntax error in schema!");
        }
        var query = Insert.build(args);
        try {
            return await this.execute(query, values);
        } catch (err) {
            throw (err);
        }
    }

    async update(args, values) {
        let valid = this.isValid(args);
        if (!valid) {
            return Error("Syntax error in schema!");
        }
        var query = Update.build(args);
        var extract_values = args;
        delete extract_values["columns"];
        var values = this.extactValues(extract_values);
        try {
            return await this.execute(query, values);
        } catch (err) {
            throw (err);
        }
    }

    async delete(args) {
        let valid = this.isValid(args);
        if (!valid) {
            return Error("Syntax error in schema!");
        }
        var query = Delete.build(args);
        var values = this.extactValues(args);
        try {
            return await this.execute(query, values);
        } catch (err) {
            throw (err);
        }
    }

    async simple(args) {
        let valid = this.isValid(args);
        if (!valid) {
            return Error("Syntax error in schema!");
        }
        var inserts = args.insert;
        var updates = args.update;
        var deletes = args.delete;

        var queries = []
        if (inserts) {
            inserts.forEach(item => {
                var args = {
                    input: item
                };

                var query = { table: item.table, query: Insert.build(args) };
                delete args["columns"];
                var values = this.extactValues(args);
                query.values = values;
                queries.push(query);
            });
        }
        if (updates) {
            updates.forEach(item => {
                var args = {
                    input: item
                };

                var query = { table: item.table, query: Update.build(args) };
                delete args["columns"];
                var values = this.extactValues(args);
                query.values = values;
                queries.push(query);
            });
        }
        if (deletes) {
            deletes.forEach(item => {
                var args = {
                    input: item
                };

                var query = { table: item.table, query: Delete.build(args) };
                delete args["columns"];
                var values = this.extactValues(args);
                query.values = values;
                queries.push(query);
            });
        }

        const client = await pool.connect();
        var result = [];
        try {
            await client.query('BEGIN');
            result = await Promise.all(queries.map(async item => {
                if (item.values) {
                    let res = await client.query(item.query, item.values);
                    return { type: res.command, table: item.table, content: res.rows[0] };
                } else {
                    let res = await client.query(item.query);
                    return { type: res.command, table: item.table, content: res.rows[0] };
                }
            }));
            await client.query('COMMIT');
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
        return result;
    }

    async complex(args) {
        let valid = this.isValid(args);
        if (!valid) {
            return Error("Syntax error in schema!");
        }
        
        const client = await pool.connect();
        var result = [];
        try {
            await client.query('BEGIN');
            this.executeRecursively(client, args, undefined);
            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e
        } finally {
            client.release();
        }
        console.log(result);
        return result;
    }

    async executeRecursively(client, input, val) {
        var query, values = [], res, fks;
        if (input.complex) {
            if (input.insert) {
                if (val) {
                    fks = this.fkeys(val.table);
                    fks.forEach(key => {
                        input.insert.columns.push(key.column_name);
                        input.insert.values.push(val.content.id);
                    });
                }
                var args = {
                    input: input.insert
                }
                query = Insert.build(args);
                values = input.insert.values;
                res = await client.query(query, values);
            } else if (input.update) {
                if (val) {
                    fks = this.fkeys(val.table);
                    fks.forEach(key => {
                        input.insert.columns.push(key.column_name);
                        input.insert.values.push(val.content.id);
                    });
                }
                var args = {
                    input: input.insert
                }
                query = Insert.build(args);
                values = input.insert.values;
                res = await client.query(query, values);
            } else if (input.delete) {
                query = Delete.build(args);
                res = await client.query(query);
            }
            return executeRecursively(input.complex, { type: res.command, table: item.table, content: res.rows[0] });
        } else {
            if (input.insert) {
                query = Insert.build(args);
                values = input.insert.values;
                res = await client.query(query, values);
            } else if (input.update) {
                query = Update.build(args);
                values = input.insert.values;
                res = await client.query(query, values);
            } else if (input.delete) {
                query = Delete.build(args);
                res = await client.query(query);
            }
            return { type: res.command, table: item.table, content: res.rows[0] };
        }
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
module.exports = new Writer();