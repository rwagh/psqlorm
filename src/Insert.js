export default class Insert {
    valueType(value) {
        return (typeof value);
    }
    build(args) {
        var table = args.table;
        var columns = args.columns;
        var params = [];
        for (var p = 0; p < columns.length; p++) {
            params.push(`$${p + 1}`);
        }
        var query = `INSERT INTO ${table}(${columns.join(",")}) VALUES(${params.join(",")}) RETURNING id;`;
        return query;
    }
}