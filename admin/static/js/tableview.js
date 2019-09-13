"use strict";
// Use ./scripts/buildtableview to generate the js file (it uses tsc --strict)
;
var KeyBound;
(function (KeyBound) {
    KeyBound["open"] = "open";
    KeyBound["closed"] = "closed";
})(KeyBound || (KeyBound = {}));
;
// A general mutable-pos-having parse state, used in parsing secondary index
// descriptions.
class ParseState {
    constructor(text, pos) {
        this.text = text;
        this.pos = pos;
    }
    // On failure, does _not_ modify pos.
    skipString(str) {
        if (this.text.substr(this.pos, str.length) === str) {
            this.pos += str.length;
            return true;
        }
        else {
            return false;
        }
    }
    // This doesn't handle every possible JavaScript string.  If somebody has a
    // weird index name, you could update this.
    parseQuotedString() {
        const quoteCh = this.text[this.pos];
        if (quoteCh !== "\'" && quoteCh !== "\"") {
            return null;
        }
        let builder = "";
        let i = this.pos + 1;
        for (;;) {
            let ch = this.text[i];
            if (ch === undefined) {
                this.pos = i;
                return null;
            }
            if (ch === quoteCh) {
                this.pos = i + 1;
                return builder;
            }
            i += 1;
            if (ch === '\\') {
                let ch2 = this.text[i];
                if (ch2 === undefined) {
                    this.pos = i;
                    return null;
                }
                switch (ch2) {
                    case '\\':
                    case '"':
                    case '\'':
                        builder += ch2;
                        break;
                    default:
                        this.pos = i;
                        return null;
                }
                i += 1;
            }
            else {
                builder += ch;
            }
        }
    }
    parseVarName() {
        let builder = "";
        for (;;) {
            let ch = this.text[this.pos];
            if (ch === undefined) {
                break;
            }
            if (!((ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z') || (ch === '_') || (ch >= '0' && ch <= '9' && builder.length > 0))) {
                break;
            }
            builder += ch;
            this.pos++;
        }
        return builder.length === 0 ? null : builder;
    }
}
// The RowSource interface exposes the rows with stable element numbering, which
// means it may use negative indices.  Usually we only load documents in the
// forward direction, but after seeking, we might load in both directions.
class Rows {
    // before is in reverse order.
    constructor(before, after) {
        this.before = before;
        this.after = after;
    }
    frontOffset() {
        return -this.before.length;
    }
    backOffset() {
        return this.after.length;
    }
    get(ix) {
        if (ix < 0) {
            // -1 => 0, -2 => 1, etc.
            return this.before[-1 - ix];
        }
        else {
            return this.after[ix];
        }
    }
    slice(start, end) {
        if (start < 0) {
            if (end <= 0) {
                // E.g. [start, end) == [-5, -3).  We want elements with indices
                // -5, -4.  These map to indices in before of 4, and 3,
                // respectively.  So we slice on [3, 5), and reverse.
                let ret = this.before.slice(-end, -start);
                ret.reverse();
                return ret;
            }
            else {
                // E.g. start == -5, thus we slice on [0, 5), and reverse.
                let bef = this.before.slice(0, -start);
                bef.reverse();
                return bef.concat(this.after.slice(0, end));
            }
        }
        else {
            if (end < 0) {
                return [];
            }
            else {
                return this.after.slice(start, end);
            }
        }
    }
}
class Preloader {
    constructor(r, tableId, availMemUsage, key, asc, keyBound, undefineds) {
        this.r = r;
        this.tableId = tableId;
        this.availMemUsage = availMemUsage;
        this.key = key;
        this.asc = asc;
        this.keyBound = keyBound;
        this.undefineds = undefineds;
    }
    // Takes a ((reql_table, table_config) -> reql_query) function and returns a reql query.
    query(queryFunc) {
        return WindowRowSource.query(this.r, this.tableId, queryFunc);
    }
    unlimitMemUsage() {
        this.availMemUsage = Infinity;
    }
    // Makes the set of queries that describes the content we're loading.  The
    // concatenation of the queries' output is what describes the content.  We
    // have multiple queries for the case where we use indexes, because an index
    // does not contain all elements of the table.
    makeQueries(config, orderSpec) {
        const r = this.r;
        const orderingColumn = WindowRowSource.orderingColumn(config, orderSpec);
        let primaryKey = config.primaryKey;
        let qs;
        if (WindowRowSource.isPrimary(config, orderingColumn)) {
            if (this.asc) {
                const q = this.query((table, _tableConfig) => table.between(this.key === null ? r.minval : this.key.doc, r.maxval, { leftBound: this.keyBound })
                    .orderBy({ index: r.asc(primaryKey) }));
                qs = [q];
            }
            else {
                const q = this.query((table, _tableConfig) => table.between(r.minval, this.key === null ? r.maxval : this.key.doc, { rightBound: this.keyBound })
                    .orderBy({ index: r.desc(primaryKey) }));
                qs = [q];
            }
        }
        else {
            const foundIndex = WindowRowSource.findIndex(config, orderingColumn);
            if (foundIndex !== null) {
                const q2 = this.query((table, _tableConfig) => table.filter(x => Preloader.unfurlAbsent(r, x, orderingColumn)));
                if (this.asc) {
                    const q1 = this.query((table, _tableConfig) => table.between(this.key === null ? r.minval : this.key.doc, r.maxval, { leftBound: this.keyBound, index: foundIndex })
                        .orderBy({ index: r.asc(foundIndex) }));
                    qs = [q1, q2];
                }
                else {
                    const q1 = this.query((table, _tableConfig) => table.between(r.minval, this.key === null ? r.maxval : this.key.doc, { rightBound: this.keyBound, index: foundIndex })
                        .orderBy({ index: r.desc(foundIndex) }));
                    qs = [q1, q2];
                }
            }
            else {
                const comparison = this.asc ? (this.keyBound === KeyBound.open ? 'gt' : 'ge') :
                    (this.keyBound === KeyBound.open ? 'lt' : 'le');
                if (this.key === null) {
                    const q = this.query((table, _tableConfig) => table.orderBy((this.asc ? r.asc : r.desc)((x) => Preloader.unfurl(r, x, orderingColumn, this.asc ? r.maxval : r.minval))));
                    qs = [q];
                }
                else {
                    console.error("Ordering by non-index with a key bound.  This is fine, but it's not supposed to happen.");
                    const keyDoc = this.key.doc;
                    const q = this.query((table, _tableConfig) => table.filter(x => Preloader.unfurl(r, x, orderingColumn, this.asc ? r.maxval : r.minval)[comparison](keyDoc))
                        .orderBy((this.asc ? r.asc : r.desc)((x) => Preloader.unfurl(r, x, orderingColumn, this.asc ? r.maxval : r.minval))));
                    qs = [q];
                }
            }
        }
        return qs;
    }
    // Constructs a query that accesses a field, or returns defaultValue if we
    // encounter a non-object or missing field.
    static unfurl(r, row, path, defaultValue) {
        // We use r.maxval because (for our usage) we want the non-existant rows to sort last.
        // This would be consistent with desirable behavior when sorting by index.
        let q = row;
        for (let key of path) {
            q = q.do(x => r.branch(x.typeOf().eq('OBJECT'), x(key), defaultValue));
        }
        return q.default(defaultValue);
    }
    // Constructs a query that returns true if and only if the field is absent.
    static unfurlAbsent(r, row, path) {
        let q = row;
        // You might think (incorrectly) that we are using "null" as some
        // sentinel value, unsafely.  However, in the case that
        // q(path[0])...(path[n-1]) is null, we also want to return true,
        // because null values do not get indexed.
        for (let key of path) {
            q = q.do(x => r.branch(x.typeOf().eq('OBJECT'), x(key), null));
        }
        return q.eq(null).default(true);
    }
    static access(obj, path) {
        let value = obj;
        for (let key of path) {
            value = typeof value === 'object' && !Array.isArray(value) && value !== null ? value[key] : undefined;
        }
        return value;
    }
}
// Responsible for half the job of a WindowRowSource: loading rows in either the
// positive or negative direction.  This object just runs a sequence of queries
// and concatenates their results together.
class Loader {
    constructor(state, availMemUsage, rows, updateCb) {
        this.rows = rows;
        this.availMemUsage = availMemUsage;
        this.state = state;
        this.pending = null;
        this.error = null;
        this.updateCb = updateCb;
    }
    hitEnd() {
        if (this.state !== null) {
            return false;
        }
        return this.error === null ? true : { error: this.error };
    }
    static fromQueries(driver, availMemUsage, queries, updateCb) {
        const empty = [];
        return new Loader({ queries: empty.concat(queries), driver, cursor: null }, availMemUsage, [], updateCb);
    }
    static fromStaticRowset(rows, updateCb) {
        return new Loader(null, Infinity, rows, updateCb);
    }
    hitMemUsageLimit() {
        return this.availMemUsage <= 0;
    }
    unlimitMemUsage() {
        this.availMemUsage = Infinity;
    }
    cancelPendingRequests() {
        if (this.pending !== null) {
            this.pending.isCancelled = true;
            // Note: The object is now in an unrecoverable state.
            this.state = null;
            this.error = "Loading cancelled";
        }
    }
    anyError(message) {
        this.error = message;
        this.state = null;
        console.error(this.error);
        setTimeout(this.updateCb, 0);
    }
    logicError(message) {
        this.anyError("Table Viewer logic error: " + message);
    }
    // Causes us to try loading some more data, if we aren't already.
    triggerLoad() {
        if (this.pending !== null || this.state === null) {
            return;
        }
        if (this.state.cursor === null) {
            const query = this.state.queries.shift();
            // TODO: Use batch size param.
            const cancelObj = { isCancelled: false };
            this.pending = cancelObj;
            this.state.driver.run_raw(query, (err, results) => {
                if (cancelObj.isCancelled) {
                    return;
                }
                this.pending = null;
                if (err) {
                    this.anyError("Query evaluation error:  " + err.name + ": " + err.message);
                    return;
                }
                if (!(this.state !== null && this.state.cursor === null)) {
                    this.logicError("this acquired cursor while pending creation of cursor");
                    return;
                }
                // Right now loaders are only used with queries that produce cursors.
                this.state.cursor = results;
                // Just re-invoke on cursor-having state.
                this.triggerLoad();
            });
            return;
        }
        const rowsLength = this.rows.length;
        const cursor = this.state.cursor;
        const cancelObj = { isCancelled: false };
        this.pending = cancelObj;
        const requestSize = 60;
        Loader.readCursor(cursor, requestSize, this.availMemUsage, (err, rows, totalSize, eof) => {
            this.availMemUsage -= totalSize;
            if (cancelObj.isCancelled) {
                cursor.close();
                return;
            }
            this.pending = null;
            if (this.rows.length !== rowsLength) {
                this.logicError("changed number of rows while load pending, in cursor next");
                return;
            }
            // rows is always an array, with rows we got before the error.
            for (let row of rows) {
                this.rows.push(row);
            }
            if (err) {
                this.anyError("Cursor next failure:  " + err.name + ": " + err.message);
                return;
            }
            if (!(this.state !== null && this.state.cursor !== null)) {
                this.logicError("cursor disappeared underneath its own usage");
                return;
            }
            if (eof) {
                if (this.state.queries.length === 0) {
                    this.state = null;
                }
                else {
                    this.state.cursor = null;
                }
            }
            if (eof || rows.length > 0) {
                setTimeout(this.updateCb, 0);
            }
        });
        return;
    }
    // Reads a specified number of rows off the cursor, or until the data size
    // gets too big.  Passes the callback the sum of TableViewer.totalSize of
    // rows.  TODO: It would be nice if the JS driver exposed internals
    // regarding what rows it has cached.  And a better EOF indicator.
    static readCursor(cursor, count, availMemUsage, cb) {
        let rows = [];
        let totalSize = 0;
        let reader;
        reader = () => {
            if (rows.length === count || totalSize >= availMemUsage) {
                setTimeout(cb, 0, null, rows, totalSize, false);
                return;
            }
            cursor.next((err, row) => {
                if (err) {
                    // TODO: Seriously, we denote EOF with a string check?
                    if (err.name === "ReqlDriverError" && err.message === "No more rows in the cursor.") {
                        setTimeout(cb, 0, null, rows, totalSize, true);
                        return;
                    }
                    setTimeout(cb, 0, err, rows, totalSize, false);
                    return;
                }
                rows.push(row);
                totalSize += TableViewer.totalSize(row);
                reader();
            });
        };
        reader();
    }
}
// An ExternalRowSource supplies and requests rows from the data explorer.
class ExternalRowSource {
    constructor(isFeed, rows, hitEnd, moreRowsRequestCb) {
        this.hitEnd = false;
        const empty = [];
        this.rows = empty.concat(rows);
        this.isFeed = isFeed ? true : false;
        this.hitEnd = hitEnd;
        this.moreRowsRequestCb = moreRowsRequestCb;
        this.updateCb = () => undefined;
    }
    isTableRowSource() {
        return false;
    }
    isFeedSource() {
        return this.isFeed;
    }
    unlimitMemUsage() {
        // This type does not support mem usage limits.
    }
    rowsAndOffset() {
        // Change feeds load in the negative direction (rendering new rows at
        // the top of the view).
        if (this.isFeed) {
            return {
                rows: new Rows(this.rows, []),
                hitEndLow: this.hitEnd,
                hitEndHigh: true,
                clickToLoadHigh: false,
            };
        }
        else {
            return {
                rows: new Rows([], this.rows),
                hitEndLow: true,
                hitEndHigh: this.hitEnd,
                clickToLoadHigh: false,
            };
        }
    }
    reframe(low, scrollLow, high, scrollHigh) {
        if (this.isFeed) {
            if (high > 0 || scrollHigh) {
                // Analogous reasoning as below.
                console.error("ExternalRowSource (feed) reframed with unexpected high", high, "or scrollLow", scrollHigh);
            }
            if (-low > this.rows.length || scrollLow) {
                this.moreRowsRequestCb();
            }
        }
        else {
            if (low < 0 || scrollLow) {
                // Since hitEndLow is true, we should not receive attempts to
                // reframe on the low side.  Not the end of the world if we do, most
                // likely a performance bug.
                console.error("ExternalRowSource reframed with unexpected low", low, "or scrollLow", scrollLow);
            }
            if (high > this.rows.length || scrollHigh) {
                this.moreRowsRequestCb();
            }
        }
    }
    cancelPendingRequests() {
        // I suppose the data explorer cancels its own requests.
    }
    // Used by the data explorer to figure out what cursor rows it needs to add.
    rowsCount() {
        return this.rows.length;
    }
    // Used by the data explorer.
    addRows(rows, hitEnd) {
        let changed = rows.length > 0;
        for (let row of rows) {
            this.rows.push(row);
        }
        if (!this.hitEnd && hitEnd) {
            changed = true;
            this.hitEnd = true;
        }
        if (changed) {
            this.updateCb();
        }
    }
}
class WindowRowSource {
    constructor(tableSpec, orderSpec, updateCb, seekTarget) {
        const r = tableSpec.r;
        this.tableSpec = tableSpec;
        this.orderSpec = orderSpec;
        this.updateCb = updateCb;
        /* A row set is, abstractly, some slice of rows, keyed by integer
        row-number (which could be negative).  The negative rows are in
        lowLoader (in reverse order), and the non-negative rows are in
        highLoader. */
        if (seekTarget === undefined) {
            // This is more about limiting DOM usage than mem usage.
            const highMemLimit = 10;
            this.lowLoader = Loader.fromStaticRowset([], updateCb);
            this.highLoader = new Preloader(r, tableSpec.tableId, highMemLimit, null, orderSpec.asc, KeyBound.open, true);
        }
        else {
            // We don't care about mem/DOM usage limitation after user interacts
            // with table viewer.  It's just to avoid breaking basic table page.
            const memLimit = Infinity;
            this.lowLoader = new Preloader(r, tableSpec.tableId, memLimit, { doc: seekTarget.value }, !orderSpec.asc, KeyBound.open, false);
            this.highLoader = new Preloader(r, tableSpec.tableId, memLimit, { doc: seekTarget.value }, orderSpec.asc, KeyBound.closed, true);
        }
        this.configLoader = {
            tableId: tableSpec.tableId,
            primaryKey: null,
            indexStatuses: {},
            loaded: false,
            pending: null
        };
    }
    isTableRowSource() {
        return true;
    }
    isFeedSource() {
        return false;
    }
    static isLoader(ld) {
        return 'rows' in ld;
    }
    rowsAndOffset() {
        const hitEndHigh = WindowRowSource.isLoader(this.highLoader) && this.highLoader.hitEnd();
        return {
            rows: new Rows(WindowRowSource.isLoader(this.lowLoader) ? this.lowLoader.rows : [], WindowRowSource.isLoader(this.highLoader) ? this.highLoader.rows : []),
            hitEndLow: WindowRowSource.isLoader(this.lowLoader) && this.lowLoader.hitEnd(),
            hitEndHigh: hitEndHigh,
            clickToLoadHigh: !hitEndHigh && WindowRowSource.isLoader(this.highLoader) && this.highLoader.hitMemUsageLimit(),
        };
    }
    unlimitMemUsage() {
        this.highLoader.unlimitMemUsage();
    }
    static isPrimary(config, colPath) {
        return colPath.length === 1 && colPath[0] === config.primaryKey;
    }
    // Says we require the data from rownums [low, high) to be available.
    // scrollLow and scrollHigh are bools saying whether we want more data (preload)
    // past that point.
    reframe(low, scrollLow, high, scrollHigh) {
        if (!this.configLoader.loaded) {
            if (this.configLoader.pending === null) {
                this.loadConfig();
            }
            // Don't continue until we've loaded the primary key.
            return;
        }
        const config = this.configLoaded();
        if (config === null) {
            console.error("Attempted reframing after error getting primary key out of config");
            return;
        }
        if (!WindowRowSource.isLoader(this.lowLoader)) {
            const queries = this.lowLoader.makeQueries(config, this.orderSpec);
            // The mem usage behavior is only concerned with initial load of the
            // table page (to ensure that the page works at all), not upon the
            // use of the seek feature (because we aren't concerned with that
            // quality level yet).
            this.lowLoader = Loader.fromQueries(this.tableSpec.driver, this.lowLoader.availMemUsage, queries, this.updateCb);
        }
        if (!WindowRowSource.isLoader(this.highLoader)) {
            const queries = this.highLoader.makeQueries(config, this.orderSpec);
            this.highLoader = Loader.fromQueries(this.tableSpec.driver, this.highLoader.availMemUsage, queries, this.updateCb);
        }
        // E.g. if length is 8, then the element indices are -8, -7, ..., -2,
        // -1.  So we need low, a closed bound, to be -9 or less, to start a load.
        if (low < -this.lowLoader.rows.length || scrollLow) {
            this.lowLoader.triggerLoad();
        }
        // E.g. if length is 8, then the element indices are 0, 1, ..., 6, 7.
        // So we need high, an open bound, to be 9 or more, to start a load.
        if (high > this.highLoader.rows.length || scrollHigh) {
            this.highLoader.triggerLoad();
        }
    }
    configLoaded() {
        return this.configLoader.primaryKey === null ? null : {
            primaryKey: this.configLoader.primaryKey,
            indexStatuses: this.configLoader.indexStatuses,
        };
    }
    static orderingColumn(config, orderSpec) {
        return orderSpec.colPath || [config.primaryKey];
    }
    static canUseIndex(config, orderSpec) {
        const orderingColumn = this.orderingColumn(config, orderSpec);
        return this.isPrimary(config, orderingColumn) || this.findIndex(config, orderingColumn) !== null;
    }
    static indexQueryParseColumn(ps, onto) {
        if (!(ps.skipString(".getField(") || ps.skipString("("))) {
            return false;
        }
        const columnName = ps.parseQuotedString();
        if (!(columnName !== null && ps.skipString(")"))) {
            return false;
        }
        onto.push(columnName);
        return true;
    }
    // Parses an ordering column out of an index definition, or returns a parse
    // error at a given position.
    static indexQueryOrderingColumn(expectedIndexName, query) {
        const ps = new ParseState(query, 0);
        /* Kinds of strings we want to accept:
         "indexCreate('a', function(_var19) { return _var19.getField("a"); })"
          "indexCreate('b', function(_var19) { return _var19.getField("b"); })"
          "indexCreate('f', function(var1) { return var1.getField('a').getField('b'); }"
          "indexCreate('g', function(var1) { return var1('a')('b'); }"
          "indexCreate('h', function(var1) { return r.row('a')('b'); }"

          Basically, with or without r.expr, is or is not a compound index, and then
          using either the captured variable or r.row, followed by a chain of ("column") names.

        */
        if (!ps.skipString('indexCreate(')) {
            return ps;
        }
        const parsedIndexName = ps.parseQuotedString();
        if (parsedIndexName === null) {
            return ps;
        }
        if (parsedIndexName !== expectedIndexName) {
            console.error("Parsed index name", parsedIndexName, "does not match expected", expectedIndexName, "in query", query);
            return ps;
        }
        if (!ps.skipString(', function(')) {
            return ps;
        }
        const rowVar = ps.parseVarName();
        if (rowVar === null) {
            return ps;
        }
        if (!ps.skipString(') { return ')) {
            return ps;
        }
        if (!(ps.skipString(rowVar) || ps.skipString('r.row'))) {
            return ps;
        }
        let columns = [];
        while (this.indexQueryParseColumn(ps, columns)) {
            // do nothing, continue
        }
        if (!ps.skipString("; })")) {
            return ps;
        }
        if (ps.pos !== ps.text.length) {
            return ps;
        }
        return columns;
    }
    static findIndex(config, orderingColumn) {
        for (let index in config.indexStatuses) {
            const stat = config.indexStatuses[index];
            if (!(!stat.geo && !stat.multi && !stat.outdated && stat.ready)) {
                continue;
            }
            const column = WindowRowSource.indexQueryOrderingColumn(stat.index, stat.query);
            if (Array.isArray(column)) {
                if (TableViewer.equalPrefix(column, orderingColumn)) {
                    return index;
                }
            }
            else {
                // A parse error happened.  This is to be expected for indexes
                // that are defined on an arbitrary function.
            }
        }
        return null;
    }
    // Loads the ConfigLoaded information.
    loadConfig() {
        const r = this.tableSpec.r;
        let q = WindowRowSource.query(this.tableSpec.r, this.configLoader.tableId, (table, tableConfig) => ({
            primaryKey: tableConfig('primary_key'),
            indexStatuses: table.indexStatus(r.args(tableConfig('indexes')))
        }));
        const cancelObj = { isCancelled: false };
        this.configLoader.pending = cancelObj;
        this.tableSpec.driver.run_raw(q, (err, result) => {
            if (cancelObj.isCancelled) {
                return;
            }
            this.configLoader.pending = null;
            this.configLoader.loaded = true;
            if (err) {
                console.error("Error loading primary key");
                // TODO: Report errors back to UI somehow.
                return;
            }
            if (typeof result !== 'object' || result === null) {
                console.error("Error, result has bad value", result);
                throw "Result has bad value";
            }
            if ('primaryKey' in result && typeof result['primaryKey'] === 'string') {
                this.configLoader.primaryKey = result['primaryKey'];
            }
            else {
                console.error("primary_key result has wrong type, result =", result);
                throw "primary_key result has wrong type";
            }
            if ('indexStatuses' in result) {
                const indexStatuses = {};
                const resultIndexStatuses = result['indexStatuses'];
                if (Array.isArray(resultIndexStatuses)) {
                    for (let indexStatus of resultIndexStatuses) {
                        if (typeof indexStatus === 'object' && indexStatus !== null &&
                            'geo' in indexStatus && typeof indexStatus.geo === 'boolean' &&
                            'index' in indexStatus && typeof indexStatus.index === 'string' &&
                            'multi' in indexStatus && typeof indexStatus.multi === 'boolean' &&
                            'outdated' in indexStatus && typeof indexStatus.outdated === 'boolean' &&
                            'query' in indexStatus && typeof indexStatus.query === 'string' &&
                            'ready' in indexStatus && typeof indexStatus.ready === 'boolean') {
                            // Darn typescript.
                            indexStatuses[indexStatus.index] = {
                                geo: indexStatus.geo,
                                index: indexStatus.index,
                                multi: indexStatus.multi,
                                outdated: indexStatus.outdated,
                                query: indexStatus.query,
                                ready: indexStatus.ready,
                            };
                        }
                        else {
                            console.error("indexStatus value has incorrect shape:", indexStatus);
                            throw "indexStatus value has incorrect shape";
                        }
                    }
                    this.configLoader.indexStatuses = indexStatuses;
                }
                else {
                    console.error("result has non-array indexStatuses, result =", result);
                    throw "result has non-array indexStatuses";
                }
            }
            else {
                console.error("result has no indexStatuses, result =", result);
                throw "result has no indexStatuses";
            }
            setTimeout(this.updateCb, 0);
        });
    }
    // Takes a ((reql_table, table_config) -> reql_query) function and returns a reql query.
    static query(r, tableId, queryFunc) {
        return r.db('rethinkdb').table('table_config').get(tableId).do(tableConfig => queryFunc(r.db(tableConfig('db')).table(tableConfig('name')), tableConfig));
    }
    cancelPendingRequests() {
        if (this.configLoader.pending !== null) {
            this.configLoader.pending.isCancelled = true;
            // this.lowLoader.pending and this.highLoader.pending will be null,
            // so we could return here, fwiw.
        }
        if (WindowRowSource.isLoader(this.lowLoader)) {
            this.lowLoader.cancelPendingRequests();
        }
        if (WindowRowSource.isLoader(this.highLoader)) {
            this.highLoader.cancelPendingRequests();
        }
    }
}
// Basically a glorified struct.
class RealTableSpec {
    constructor(r, driver, tableId) {
        this.r = r;
        this.driver = driver;
        this.tableId = tableId;
    }
    primaryOrderSpec() {
        return { colPath: null, asc: true };
    }
    columnRowSource(orderSpec, updateCb) {
        return new WindowRowSource(this, orderSpec, updateCb);
    }
    seekingRowSource(orderSpec, target, updateCb) {
        return new WindowRowSource(this, orderSpec, updateCb, { value: target });
    }
}
// Specifies rendering of column sorting arrows.
var ColumnSortingStatus;
(function (ColumnSortingStatus) {
    ColumnSortingStatus["none"] = "none";
    ColumnSortingStatus["asc"] = "asc";
    ColumnSortingStatus["desc"] = "desc";
})(ColumnSortingStatus || (ColumnSortingStatus = {}));
// For some column "a.b.c", specifies whether we render descendent columns "a.b.c.a",
// "a.b.c.b", ...
var ColumnInfoDisplay;
(function (ColumnInfoDisplay) {
    ColumnInfoDisplay["Expanded"] = "expanded";
    ColumnInfoDisplay["Collapsed"] = "collapsed";
})(ColumnInfoDisplay || (ColumnInfoDisplay = {}));
// Our seeking state needs to be changed.  We want to specify a seek target.
// Even when we're done seeking, the seek target sticks around (because of highlighting)
var SeekingState;
(function (SeekingState) {
    SeekingState[SeekingState["SeekingInProgress"] = 0] = "SeekingInProgress";
    SeekingState[SeekingState["SeekingComplete"] = 1] = "SeekingComplete";
})(SeekingState || (SeekingState = {}));
var EndRowContent;
(function (EndRowContent) {
    EndRowContent["end"] = "end";
    EndRowContent["none"] = "none";
    EndRowContent["loading"] = "loading";
    EndRowContent["clickToLoad"] = "clicktoload";
})(EndRowContent || (EndRowContent = {}));
var SeekMessageContent;
(function (SeekMessageContent) {
    SeekMessageContent["none"] = "";
    SeekMessageContent["inProgress"] = "Seeking in Progress...";
    SeekMessageContent["completeNoMatches"] = "No matching rows found";
    SeekMessageContent["complete"] = "Seeking complete";
})(SeekMessageContent || (SeekMessageContent = {}));
// Thing that shows content of table.  Certain sources of data may have sortable
// columns.  See static constructors.
class TableViewer {
    constructor(el, showRowNumbers, rowSourceCreator) {
        // We have redrawPending so that calls to redrawAndFetch made with
        // setTimeout cannot possibly result in exponential explosion.  This is
        // acceptable because if some other redrawAndFetch invocation happens, it
        // will perform the desired side effects.
        this.redrawPending = false;
        this.el = el;
        this.showRowNumbers = showRowNumbers;
        this.rowSource = rowSourceCreator(() => this.onUpdate());
        this.displayedInfo = TableViewer.initialDisplayedInfo();
        this.seeking = null;
        this.columnInfo = TableViewer.helpMakeColumnInfo(ColumnInfoDisplay.Expanded);
        this.docsProcessedForColumnInfo = null;
        // Fun fact:  On Chromium, onmouseleave and onmouseup behave honestly
        // (to my expectations), and we need onmouseleave because we cannot
        // detect onmouseup events if somebody holds the cursor down and moves
        // it outside of this.el.  (Or, we could, if we made a global event
        // handler?  We could do that?)  On Firefox, onmouseleave doesn't get
        // triggered until _after_ you lift up the mouse and the onmouseup event
        // gets fired.  So we never miss the end of a drag event (unless we go
        // off the window or something; I haven't fully tested).
        el.onmousemove = (event) => { this.elMouseMove(event); };
        el.onmouseleave = (event) => {
            this.elEndDrag(event);
        };
        el.onmouseup = (event) => {
            this.elEndDrag(event);
        };
        this.nodes = this.wipeAndRecreateNodes();
        this.scheduleRedrawAndFetch();
    }
    static makeWithTable(el, r, driver, tableId) {
        const tableSpec = new RealTableSpec(r, driver, tableId);
        return new TableViewer(el, null, (updateCb) => tableSpec.columnRowSource(tableSpec.primaryOrderSpec(), updateCb));
    }
    static makeWithExternalSource(el, rowSource, showRowNumbers) {
        const isFeed = rowSource.isFeedSource();
        let showVal = showRowNumbers === null ? null : { start: showRowNumbers + (isFeed ? 1 : 0), direction: isFeed ? -1 : 1 };
        return new TableViewer(el, showVal, (updateCb) => {
            rowSource.updateCb = updateCb;
            return rowSource;
        });
    }
    static initialDisplayedInfo() {
        return {
            frontOffset: 0,
            attrs: [],
            dragging: null,
            renderedHighlightInfo: null,
            renderedEndRow: null,
            rowHolderTop: 0,
            seekMessageContent: SeekMessageContent.none,
        };
    }
    // There is some gross stuff involving the coffeescript files rerendering
    // everything, creating fresh HTML nodes.  Maybe this TableViewer type is
    // the problem, but it expects this.el to remain part of the DOM.  We get
    // style sheet weirdness, otherwise.  So we have functions like this one, to
    // be called when you rebuild the outer container from some handlebars
    // template.
    wipeAndRecreateNodes() {
        const el = this.el;
        TableViewer.removeChildren(el);
        let styleNode = document.createElement('style');
        styleNode.type = "text/css";
        el.appendChild(styleNode);
        let seekNodeObj;
        if (this.rowSource.isTableRowSource()) {
            seekNodeObj = TableViewer.createSeekNode();
            el.appendChild(seekNodeObj.div);
            const input = seekNodeObj.input;
            seekNodeObj.form.onsubmit = (event) => {
                this.seek(input.value);
            };
        }
        else {
            seekNodeObj = null;
        }
        let rowScroller = document.createElement('div');
        rowScroller.className = TableViewer.className + ' table_viewer_scroller';
        el.appendChild(rowScroller);
        let columnHeaders = document.createElement('table');
        columnHeaders.className = TableViewer.className + ' table_viewer_headers';
        rowScroller.appendChild(columnHeaders);
        let rowHolder = document.createElement('table');
        rowHolder.className = 'table_viewer_holder';
        rowScroller.appendChild(rowHolder);
        rowScroller.onscroll = event => { this.scrolled(event); };
        return { styleNode, seekNodeObj, rowScroller, columnHeaders, rowHolder };
    }
    // Called externally from router.coffee, used for document lookup.
    initiateSeek(id) {
        this.nodes.seekNodeObj.input.value = id;
        this.seek(id);
    }
    scrolled(event) {
        this.redrawAndFetchNow();
    }
    redrawAndFetchNow(needsRerender = false, forceCompleteRedraw = false) {
        this.redrawPending = true;
        this.redrawAndFetch(needsRerender, forceCompleteRedraw);
    }
    scheduleRedrawAndFetch() {
        if (!this.redrawPending) {
            this.redrawPending = true;
            setTimeout(() => { this.redrawAndFetch(); }, 0);
        }
    }
    // This function looks at what we have rendered, looks at what we have
    // available, and if necessary, informs rowSource that we want to load more
    // rows.
    redrawAndFetch(needsRerender = false, forceCompleteRedraw = false) {
        if (!this.redrawPending) {
            return;
        }
        this.redrawPending = false;
        // Zero would mean no preloading.  1 means we preload one screen-width
        // worth of rows. Idea: We could adapt these numbers to latency and
        // scroll speed, if the behavior isn't good enough as-is.
        const preloadRatio = 1;
        const kickoutRatio = 2;
        const rowState = this.rowSource.rowsAndOffset();
        const sourceOffset = rowState.rows.frontOffset();
        const sourceBackOffset = rowState.rows.backOffset();
        const { seekLow, seekHigh, highlightInfo } = this.computeSeeking(this.seeking);
        const scrollerRect = this.nodes.rowScroller.getBoundingClientRect();
        const rowsRect = this.nodes.rowHolder.getBoundingClientRect();
        const scrollerHeight = Math.max(0, scrollerRect.bottom - scrollerRect.top);
        const scrollerPreloadTop = scrollerRect.top - scrollerHeight * preloadRatio;
        const scrollerPreloadBottom = scrollerRect.bottom + scrollerHeight * preloadRatio;
        const scrollerKickoutTop = scrollerRect.top - scrollerHeight * kickoutRatio;
        const scrollerKickoutBottom = scrollerRect.bottom + scrollerHeight * kickoutRatio;
        const topPreloadGeometry = rowsRect.top > scrollerPreloadTop;
        const bottomPreloadGeometry = rowsRect.bottom < scrollerPreloadBottom;
        const displayedBackOffset = this.displayedInfo.frontOffset + this.rowhSize();
        // There are two possible situations here.  One is, we're seeking, in
        // which case we want to manually adjust the scroll position, and jump
        // position in the set of rendered documents.  The other is, we're not
        // seeking.
        let shouldLoadTop = (topPreloadGeometry &&
            !(this.displayedInfo.frontOffset === sourceOffset && rowState.hitEndLow)) || seekLow;
        let shouldLoadBottom = (bottomPreloadGeometry &&
            !(displayedBackOffset === sourceBackOffset && rowState.hitEndHigh)) || seekHigh;
        // Now we know how we want to affect the display (except for positioning
        // calculations).  If we have extra rows that are not in the DOM yet,
        // let's try displaying those, first, instead of requesting more.
        // TODO: Do domRenderStep differently when seeking.
        const domRenderStep = 60;
        let newFrontOffset;
        if (shouldLoadTop && this.displayedInfo.frontOffset > sourceOffset) {
            newFrontOffset = seekLow ? sourceOffset : Math.max(this.displayedInfo.frontOffset - domRenderStep, sourceOffset);
            shouldLoadTop = seekLow;
        }
        else if (!seekLow) {
            const newFront = TableViewer.binarySearch(this.displayedInfo.frontOffset, displayedBackOffset, (i) => {
                const bottom = this.rowhChild(i - this.displayedInfo.frontOffset).getBoundingClientRect().bottom;
                return bottom >= scrollerKickoutTop;
            });
            newFrontOffset = newFront;
        }
        else {
            newFrontOffset = this.displayedInfo.frontOffset;
        }
        needsRerender = needsRerender || newFrontOffset !== this.displayedInfo.frontOffset;
        let newBackOffset;
        if (shouldLoadBottom && displayedBackOffset < sourceBackOffset) {
            newBackOffset = seekHigh ? sourceBackOffset : Math.min(displayedBackOffset + domRenderStep, sourceBackOffset);
            shouldLoadBottom = seekHigh;
        }
        else if (!seekHigh) {
            const newBack = TableViewer.binarySearch(this.displayedInfo.frontOffset, displayedBackOffset, (i) => {
                const top = this.rowhChild(i - this.displayedInfo.frontOffset).getBoundingClientRect().top;
                return top > scrollerKickoutBottom;
            });
            newBackOffset = newBack;
        }
        else {
            newBackOffset = displayedBackOffset;
        }
        needsRerender = needsRerender || newBackOffset !== displayedBackOffset;
        if ((rowState.hitEndHigh && !this.rowhHasRenderedHitEndHigh())
            || (rowState.clickToLoadHigh && !this.rowhHasRenderedClickToLoad())) {
            needsRerender = true;
        }
        if (highlightInfo !== null && highlightInfo.needsScrolling) {
            // TODO: Reconsider the needsRerender calculation here.  The case of
            // interest is where data is already in-range -- so we need
            // highlighting but not necessarily scrolling?
            // TODO: We could do better than dumbly rendering _all_ the highlighted rows.
            newFrontOffset = Math.min(newFrontOffset, highlightInfo.start);
            newBackOffset = Math.max(newBackOffset, highlightInfo.start + highlightInfo.count);
            needsRerender = true;
        }
        if (forceCompleteRedraw) {
            needsRerender = true;
        }
        // Calls insertDOMRows before reframe so that there is no possible way
        // the state changes before we rerender.
        if (needsRerender) {
            if (highlightInfo !== null && highlightInfo.needsScrolling) {
                this.seeking.seekingState = SeekingState.SeekingComplete;
                this.insertDOMRows(rowState, newFrontOffset, newBackOffset, highlightInfo, forceCompleteRedraw);
                // Now find the row we need to scroll to, and... scroll to it.
                // TODO: There could be no matching rows... render this somehow.
                const firstRow = highlightInfo.start - this.displayedInfo.frontOffset;
                const lastRow = highlightInfo.start + highlightInfo.count - this.displayedInfo.frontOffset - 1;
                const firstEl = this.rowhChild(firstRow);
                if (firstEl === null) {
                    // We must have an empty match at the end of the rowset
                    // (and the rowset might be empty, sure).
                    // Generic scroll-to-end logic.
                    const rect = this.nodes.rowHolder.getBoundingClientRect();
                    // Browsers treat case where rowHolder height is smaller
                    // than rowScroller height just fine.
                    this.nodes.rowScroller.scrollBy(0, rect.bottom - scrollerRect.bottom);
                }
                else {
                    const firstRect = firstEl.getBoundingClientRect();
                    // TODO: Don't let the scrolling behavior be affected by
                    // domRenderStep or requestSize (e.g. when seeking for id =
                    // 60, we scroll while 60 is the last dom element, and can't
                    // scroll past end).
                    //
                    // (Simply changing dom render step to 60 has made this less frequent.)
                    // Use breathing room in calculations -- we do want this
                    // many pixels of the highlighted row to be on-screen, if we
                    // don't scroll.
                    const breathingRoom = 10;
                    if (firstRect.top >= scrollerRect.bottom - breathingRoom) {
                        this.nodes.rowScroller.scrollBy(0, firstRect.top - (scrollerRect.top + scrollerRect.bottom) * 0.5);
                    }
                    else {
                        let lastEl = this.rowhChild(lastRow);
                        if (lastEl === null) {
                            lastEl = this.rowhChild(lastRow + 1);
                        }
                        const lastRect = lastEl.getBoundingClientRect();
                        const columnRowHeight = this.nodes.columnHeaders.getBoundingClientRect().height;
                        if (lastRect.bottom <= scrollerRect.top + columnRowHeight + breathingRoom) {
                            this.nodes.rowScroller.scrollBy(0, lastRect.top - (scrollerRect.top + scrollerRect.bottom) * 0.5);
                        }
                    }
                }
            }
            else {
                let scrollPos = this.getAScrollPosition(newFrontOffset, newBackOffset);
                this.insertDOMRows(rowState, newFrontOffset, newBackOffset, highlightInfo, forceCompleteRedraw);
                this.adjustScrollPosition(scrollPos);
            }
            this.scheduleRedrawAndFetch();
        }
        if (rowState.clickToLoadHigh) {
            shouldLoadBottom = false;
            this.rowhEnableClickToLoad();
        }
        const reallyLoadBottom = shouldLoadBottom && !rowState.clickToLoadHigh;
        if (reallyLoadBottom) {
            this.rowhEnableLoading();
        }
        this.rowSource.reframe(newFrontOffset, shouldLoadTop, newBackOffset, reallyLoadBottom);
    }
    // We kinda-wanna limit access to rowHolder and
    // displayedInfo.renderedEndRow.  So we use these rowh methods.
    // Returns how many rows are stored in the rowHolder, ignoring any tr elements that are not used to store rows.
    rowhSize() {
        return this.nodes.rowHolder.childElementCount - (this.displayedInfo.renderedEndRow !== null ? 1 : 0);
    }
    rowhChild(index) {
        // Have to return null for the hitEndHigh row, if present.
        return index >= this.rowhSize() ? null : this.nodes.rowHolder.children.item(index);
    }
    rowhWipe() {
        TableViewer.removeChildren(this.nodes.rowHolder);
        this.displayedInfo.renderedEndRow = null;
    }
    rowhHasRenderedHitEndHigh() {
        const rer = this.displayedInfo.renderedEndRow;
        return rer !== null && rer.content === EndRowContent.end;
    }
    rowhHasRenderedClickToLoad() {
        const rer = this.displayedInfo.renderedEndRow;
        return rer !== null && rer.content === EndRowContent.clickToLoad;
    }
    // Returns null if the row is present and has that content.
    rowhEnableEndRow(desiredContent) {
        if (this.displayedInfo.renderedEndRow !== null) {
            if (this.displayedInfo.renderedEndRow.content === desiredContent) {
                return null;
            }
            else {
                // It's the caller's requirement to actually set the content.
                this.displayedInfo.renderedEndRow.content = desiredContent;
                return this.displayedInfo.renderedEndRow.cell;
            }
        }
        const tr = document.createElement('tr');
        tr.className = 'endrow';
        const td = document.createElement('td');
        tr.appendChild(td);
        this.nodes.rowHolder.appendChild(tr);
        this.displayedInfo.renderedEndRow = { cell: td, content: desiredContent };
        return td;
    }
    rowhEnableLoading() {
        const td = this.rowhEnableEndRow(EndRowContent.loading);
        if (td !== null) {
            TableViewer.removeChildren(td);
            td.appendChild(document.createTextNode('Loading more results...'));
        }
    }
    rowhEnableClickToLoad() {
        const td = this.rowhEnableEndRow(EndRowContent.clickToLoad);
        if (td !== null) {
            TableViewer.removeChildren(td);
            const button = document.createElement('button');
            button.appendChild(document.createTextNode("Click to load more..."));
            button.onclick = (ev) => {
                console.log("button onclick");
                this.rowSource.unlimitMemUsage();
                this.redrawAndFetchNow();
            };
            td.appendChild(button);
        }
    }
    rowhEnableHitEndHigh() {
        const td = this.rowhEnableEndRow(EndRowContent.end);
        if (td !== null) {
            TableViewer.removeChildren(td);
            td.appendChild(document.createTextNode(this.rowSource.isFeedSource() ? 'Start of results' : 'End of results'));
        }
    }
    rowhEnableHitEndNone() {
        const td = this.rowhEnableEndRow(EndRowContent.none);
        if (td !== null) {
            TableViewer.removeChildren(td);
            td.appendChild(document.createTextNode('Empty result set'));
        }
    }
    // TODO: For general rerenders, if row heights could change, maybe we should use an on-screen row.
    getAScrollPosition(newFrontOffset, newBackOffset) {
        const commonFront = Math.max(this.displayedInfo.frontOffset, newFrontOffset);
        const commonBack = Math.min(this.displayedInfo.frontOffset + this.rowhSize(), newBackOffset);
        if (commonFront < commonBack) {
            const el = this.rowhChild(commonFront - this.displayedInfo.frontOffset);
            const rect = el.getBoundingClientRect();
            const top = rect.top;
            return { elementOffset: commonFront, elementClientTop: top };
        }
        else {
            return null;
        }
    }
    setRowHolderTop(value) {
        this.displayedInfo.rowHolderTop = value;
        this.nodes.rowHolder.style.top = value + 'px';
    }
    adjustScrollPosition(scrollPos) {
        if (scrollPos === null) {
            this.setRowHolderTop(0);
            return;
        }
        const el = this.rowhChild(scrollPos.elementOffset - this.displayedInfo.frontOffset);
        const rect = el.getBoundingClientRect();
        const adjustment = scrollPos.elementClientTop - rect.top;
        if (adjustment === 0) {
            // This early-exit isn't necessary, but it seems to stop Firefox
            // from making a console warning message linking to
            // https://developer.mozilla.org/en-US/docs/Mozilla/Performance/Scroll-linked_effects
            // that are caused by excessive reassignment of the same value to
            // this.nodes.rowHolder.style.top.  Update:  Now we seem to get this
            // message anyway.
            return;
        }
        const newTop = adjustment + this.displayedInfo.rowHolderTop;
        if (newTop < 0) {
            // This case happens when we have a lowLoader (after seeking).
            this.setRowHolderTop(0);
            // We need to scroll (downward) by -newTop.  (We want to push everything up.)
            this.nodes.rowScroller.scrollBy(0, -newTop);
        }
        else {
            this.setRowHolderTop(newTop);
        }
    }
    static highlightInfoEqual(a, b) {
        return (a !== null && b !== null && a.start === b.start && a.count === b.count)
            || (a === null && b === null);
    }
    // Takes highlightInfo that has already been computed using this.seeking.
    updateSeekMessage(highlightInfo) {
        const seekNodeObj = this.nodes.seekNodeObj;
        if (seekNodeObj === null) {
            return;
        }
        let seekMessageContent;
        // The conditions here are redundant, just being nice to the type checker.
        if (this.seeking === null) {
            seekMessageContent = SeekMessageContent.none;
        }
        else {
            switch (this.seeking.seekingState) {
                case SeekingState.SeekingInProgress:
                    seekMessageContent = SeekMessageContent.inProgress;
                    break;
                case SeekingState.SeekingComplete:
                    if (highlightInfo === null) {
                        console.error("highlightInfo null when seeking complete");
                        seekMessageContent = SeekMessageContent.complete;
                    }
                    else if (highlightInfo.count > 0) {
                        seekMessageContent = SeekMessageContent.complete;
                    }
                    else {
                        seekMessageContent = SeekMessageContent.completeNoMatches;
                    }
                    break;
                default:
                    seekMessageContent = SeekMessageContent.none;
            }
        }
        if (seekMessageContent !== this.displayedInfo.seekMessageContent) {
            seekNodeObj.message.innerText = seekMessageContent;
            this.displayedInfo.seekMessageContent = seekMessageContent;
        }
    }
    currentOrdering() {
        if (this.rowSource.isTableRowSource()) {
            const config = this.rowSource.configLoaded();
            if (config !== null) {
                const column = WindowRowSource.orderingColumn(config, this.rowSource.orderSpec);
                return { column, asc: this.rowSource.orderSpec.asc };
            }
        }
        return null;
    }
    // Inserts dom rows; actually, does all redrawing except scrolling.
    insertDOMRows(rowState, newFrontOffset, newBackOffset, highlightInfo, forceRedraw) {
        const sourceRows = rowState.rows;
        // But we are processing them incrementally, so there's that.
        const displayedBackOffset = this.displayedInfo.frontOffset + this.rowhSize();
        if (newFrontOffset < newBackOffset) {
            const pkeyOrNull = this.rowSource.isTableRowSource() ? this.rowSource.configLoaded().primaryKey : null;
            // The condition newFrontOffset < newBackOffset guarantees that we
            // may call primaryKeyOrNull.
            if (this.docsProcessedForColumnInfo === null) {
                const rows = sourceRows.slice(newFrontOffset, newBackOffset);
                TableViewer.updateColumnInfo(pkeyOrNull, this.columnInfo, rows);
                this.docsProcessedForColumnInfo = { start: newFrontOffset, end: newBackOffset };
            }
            else {
                if (newFrontOffset < this.docsProcessedForColumnInfo.start) {
                    const rows = sourceRows.slice(newFrontOffset, this.docsProcessedForColumnInfo.start);
                    TableViewer.updateColumnInfo(pkeyOrNull, this.columnInfo, rows);
                    this.docsProcessedForColumnInfo.start = newFrontOffset;
                }
                if (newBackOffset > this.docsProcessedForColumnInfo.end) {
                    const rows = sourceRows.slice(this.docsProcessedForColumnInfo.end, newBackOffset);
                    TableViewer.updateColumnInfo(pkeyOrNull, this.columnInfo, rows);
                    this.docsProcessedForColumnInfo.end = newBackOffset;
                }
            }
        }
        const attrs = TableViewer.emitColumnInfoAttrs(this.currentOrdering(), this.columnInfo);
        const attrsChanged = this.applyNewAttrs(attrs);
        // TODO: Super-lame to redraw from scratch when highlight info is not
        // equal (e.g. when scrolling through long highlighted region).
        if (forceRedraw || attrsChanged || !TableViewer.highlightInfoEqual(highlightInfo, this.displayedInfo.renderedHighlightInfo)) {
            for (let colId in attrs) {
                this.setColumnWidth(+colId, attrs[colId].columnInfo.width);
            }
            const rows = sourceRows.slice(newFrontOffset, newBackOffset);
            const trs = TableViewer.json_to_table_get_values(this.showRowNumbers, rows, newFrontOffset, attrs, highlightInfo);
            this.rowhWipe();
            for (let tr of trs) {
                this.nodes.rowHolder.appendChild(tr);
            }
        }
        else {
            if (newFrontOffset < this.displayedInfo.frontOffset) {
                const rows = sourceRows.slice(newFrontOffset, this.displayedInfo.frontOffset);
                const trs = TableViewer.json_to_table_get_values(this.showRowNumbers, rows, newFrontOffset, attrs, highlightInfo);
                const insertionPoint = this.nodes.rowHolder.firstChild;
                for (let tr of trs) {
                    this.nodes.rowHolder.insertBefore(tr, insertionPoint);
                }
            }
            else if (newFrontOffset > this.displayedInfo.frontOffset) {
                const rowsToRemove = Math.min(newFrontOffset, displayedBackOffset) - this.displayedInfo.frontOffset;
                for (let i = 0; i < rowsToRemove; i++) {
                    this.nodes.rowHolder.removeChild(this.nodes.rowHolder.firstChild);
                }
            }
            // At this point, newFrontOffset correctly describes the state of rowHolder's element list.
            // Note: If [newFrontOffset, newBackOffset) were disconnected from
            // [old frontOffset, displayedBackOffset), it would seem undesirable
            // to insert a bunch of rows (above) that we'd end up deleting.  But
            // scrolling is usually pretty continuous.
            if (newBackOffset > displayedBackOffset) {
                const rows = sourceRows.slice(displayedBackOffset, newBackOffset);
                const trs = TableViewer.json_to_table_get_values(this.showRowNumbers, rows, displayedBackOffset, attrs, highlightInfo);
                // The insertionPoint might be a hitEndHighRow.
                const insertionPoint = this.nodes.rowHolder.children.item(this.rowhSize());
                for (let tr of trs) {
                    this.nodes.rowHolder.insertBefore(tr, insertionPoint);
                }
            }
            else if (newBackOffset < displayedBackOffset) {
                const rowsToRemove = displayedBackOffset - Math.max(newFrontOffset, newBackOffset);
                for (let i = 0; i < rowsToRemove; i++) {
                    const removalPoint = this.nodes.rowHolder.children[this.rowhSize() - 1];
                    this.nodes.rowHolder.removeChild(removalPoint);
                }
            }
        }
        if (rowState.hitEndHigh && rowState.rows.backOffset() === newBackOffset) {
            if (rowState.hitEndLow && rowState.rows.backOffset() === rowState.rows.frontOffset()) {
                this.rowhEnableHitEndNone();
            }
            else {
                this.rowhEnableHitEndHigh();
            }
        }
        this.displayedInfo.renderedHighlightInfo = highlightInfo;
        this.displayedInfo.frontOffset = newFrontOffset;
        this.updateSeekMessage(highlightInfo);
    }
    static createSeekNode() {
        let div = document.createElement('div');
        div.className = TableViewer.className + ' upper_forms';
        let form = document.createElement('form');
        form.appendChild(document.createTextNode('Lookup: '));
        let input = document.createElement('input');
        input.setAttribute('type', 'text');
        input.setAttribute('placeholder', 'key');
        input.className = 'seek-box';
        form.appendChild(input);
        let message = document.createElement('span');
        message.className = 'seek-message';
        form.appendChild(message);
        div.appendChild(form);
        return { div, form, input, message };
    }
    static is_ptype(a) {
        return typeof a === 'object' && a !== null && '$reql_type$' in a &&
            typeof a['$reql_type$'] === 'string';
    }
    // From datum_t::pseudo_compares_as_obj.  Afaict it just avoids a duplicate implementation
    // for geometry objects.
    static pseudo_compares_as_obj(a) {
        return a['$reql_type$'] === 'GEOMETRY';
    }
    static get_reql_type(a) {
        return a['$reql_type$'];
    }
    // a and b are both pseudo typed and have the same reql type, either 'BINARY' or 'TIME', but
    // not 'GEOMETRY' because that compares as obj.
    static pseudo_cmp(a, b) {
        if (a['$reql_type$'] === 'BINARY') {
            if (!('data' in a && 'data' in b)) {
                console.error("BINARY ptype doc lacking data field", a, b);
                throw "BINARY ptype doc lacking data field";
            }
            const aData = rethinkdbGlobal.binary_to_string(a['data']);
            const bData = rethinkdbGlobal.binary_to_string(b['data']);
            return aData < bData ? -1 : aData > bData ? 1 : 0;
        }
        if (a['$reql_type$'] === 'TIME') {
            if (!('epoch_time' in a && 'epoch_time' in b)) {
                console.error("TIME ptype doc lacking epoch_time field", a, b);
                throw "TIME ptype doc lacking epoch_time field";
            }
            // These are both numbers.  And if they aren't, we'll just compare them.
            const aEpoch = a['epoch_time'];
            const bEpoch = b['epoch_time'];
            return aEpoch < bEpoch ? -1 : aEpoch > bEpoch ? 1 : 0;
        }
        console.error("pseudo_cmp logic error", a, b);
        throw "pseudo_cmp encountered unhandled type";
    }
    static get_type_name(a) {
        if (this.is_ptype(a)) {
            return 'PTYPE<' + a['$reql_type$'] + '>';
        }
        if (typeof a === 'boolean') {
            return 'BOOL';
        }
        if (typeof a === 'number') {
            return 'NUMBER';
        }
        if (typeof a === 'string') {
            return 'STRING';
        }
        if (typeof a === 'object') {
            // ARRAY, NULL, or OBJECT.
            return a === null ? 'NULL' : Array.isArray(a) ? 'ARRAY' : 'OBJECT';
        }
        console.error("get_type_name unrecognized value type", a);
        throw "get_type_name unrecognized type";
    }
    static reqlCompareArrays(a, b) {
        for (let i = 0, e = Math.min(a.length, b.length); i < e; ++i) {
            const cmpval = this.compareReqlDocs(a[i], b[i]);
            if (cmpval !== 0) {
                return cmpval;
            }
        }
        return a.length < b.length ? -1 : a.length > b.length ? 1 : 0;
    }
    // Used by reqlCompareStrings -- a and b are length 1 or 2.
    static reqlCompareChars(a, b) {
        // I'm assuming surrogate pairs are _not_ used for any characters that
        // can be represented by a single UTF-16 code unit.  And (perhaps
        // incorrectly) that surrogate pair code points themselves are not
        // represented inside of surrogate pairs.  (It would take a pretty
        // freaky user database to hold such code points; I don't care to spend
        // resources dealing with that right now.)
        if (a.length === b.length) {
            return a < b ? -1 : a > b ? 1 : 0;
        }
        return a.length < b.length ? -1 : a.length > b.length ? 1 : 0;
    }
    // Compares strings in ReQL ordering.  Assumes there aren't gratuitous
    // surrogate pairs or (and this may be a bug) any surrogate pair code
    // points; see comment in reqlCompareChars.
    static reqlCompareStrings(a, b) {
        let x = Array.from(a);
        let y = Array.from(b);
        let end = Math.min(x.length, y.length);
        for (let i = 0; i < end; i++) {
            let cmp = TableViewer.reqlCompareChars(x[i], y[i]);
            if (cmp !== 0) {
                return cmp;
            }
        }
        return x.length < y.length ? -1 : x.length > y.length ? 1 : 0;
    }
    // Flattens {b: 1, a: 2} to ['a', 2, 'b', 1] for use in reql comparisons.
    static sorted_keyvals(a) {
        const x = [];
        for (let k in a) {
            x.push(k);
        }
        x.sort(this.reqlCompareStrings);
        const ret = [];
        for (let k of x) {
            ret.push(k, a[k]);
        }
        return ret;
    }
    // Compares documents as specified in ReQL.  Treats undefined as maxval
    // (because we want missing columns to be at the end).
    static compareReqlDocs(a, b) {
        // Handle undefined case, which may happen.
        if (a === undefined) {
            return b === undefined ? 0 : -1;
        }
        else if (b === undefined) {
            return 1;
        }
        // The logic here is cribbed from datum_t::cmp_unchecked_stack.
        const a_ptype = this.is_ptype(a) && !this.pseudo_compares_as_obj(a);
        const b_ptype = this.is_ptype(b) && !this.pseudo_compares_as_obj(b);
        if (a_ptype && b_ptype) {
            const a_reql_type = this.get_reql_type(a);
            const b_reql_type = this.get_reql_type(b);
            if (a_reql_type !== b_reql_type) {
                return a_reql_type < b_reql_type ? -1 : a_reql_type > b_reql_type ? 1 : 0;
            }
            return this.pseudo_cmp(a, b);
        }
        if (a_ptype || b_ptype) {
            const a_name_for_sorting = this.get_type_name(a);
            const b_name_for_sorting = this.get_type_name(b);
            return a_name_for_sorting < b_name_for_sorting ? -1 : a_name_for_sorting > b_name_for_sorting ? 1 : 0;
        }
        const a_type = this.get_type_name(a);
        const b_type = this.get_type_name(b);
        if (a_type !== b_type) {
            return a_type < b_type ? -1 : a_type > b_type ? 1 : 0;
        }
        switch (a_type) {
            case 'NULL':
                return 0;
            case 'BOOL':
                return a < b ? -1 : a > b ? 1 : 0;
            case 'NUMBER':
                return a < b ? -1 : a > b ? 1 : 0;
            case 'STRING':
                return this.reqlCompareStrings(a, b);
            case 'ARRAY':
                return this.reqlCompareArrays(a, b);
            case 'OBJECT':
                return this.reqlCompareArrays(this.sorted_keyvals(a), this.sorted_keyvals(b));
            default:
                console.error("Unhandled type in switch in compareReqlDocs", a_type, a, b);
                throw "compareReqlDocs: unhandled type";
        }
    }
    // Returns some point where test function threshold passes false -> true.
    static binarySearch(lo, hi, fn) {
        // fn returns false for all values below lo, true for all >= hi.
        while (lo < hi) {
            // We avoid (lo + hi) >> 1 not to avoid overflow, but to handle negative numbers.
            let mid = (lo + ((hi - lo) >> 1));
            // Fact: mid >= lo && mid < hi.  So we will make progress.
            if (fn(mid)) {
                hi = mid;
            }
            else {
                lo = mid + 1;
            }
        }
        // lo === hi, at this point.
        return lo;
    }
    // highlightInfo is non-null when we are done seeking. This takes seeking as
    // a parameter (and doesn't use this.seeking) because we haven't necessarily
    // assigned this.seeking yet.
    computeSeeking(seeking) {
        // Check the row source state to see if the value is already present.
        if (seeking === null) {
            return { seekLow: false, seekHigh: false, highlightInfo: null };
        }
        if (!this.rowSource.isTableRowSource()) {
            throw "We have a Seeking object on a non-tableRowSource";
        }
        const { rows, hitEndLow, hitEndHigh } = this.rowSource.rowsAndOffset();
        if (rows.backOffset() - rows.frontOffset() === 0 && !(hitEndLow && hitEndHigh)) {
            return { seekLow: !hitEndLow, seekHigh: !hitEndHigh, highlightInfo: null };
        }
        const config = this.rowSource.configLoaded();
        if (config === null) {
            console.error("configLoaded() returned null, but rows was non-empty");
            return { seekLow: true, seekHigh: true, highlightInfo: null };
        }
        const orderSpec = this.rowSource.orderSpec;
        const orderingColumn = WindowRowSource.orderingColumn(config, orderSpec);
        const mul = orderSpec.asc ? 1 : -1;
        // Now (re)compute highlighting boundaries.
        const lowPoint = TableViewer.binarySearch(rows.frontOffset(), rows.backOffset(), (i) => mul * TableViewer.compareReqlDocs(Preloader.access(rows.get(i), orderingColumn), seeking.target) >= 0);
        const highPoint = TableViewer.binarySearch(lowPoint, rows.backOffset(), (i) => mul * TableViewer.compareReqlDocs(Preloader.access(rows.get(i), orderingColumn), seeking.target) > 0);
        if (highPoint === rows.frontOffset()) {
            if (!hitEndLow) {
                // Not done seeking.
                return { seekLow: true, seekHigh: false, highlightInfo: null };
            }
        }
        else if (lowPoint === rows.backOffset()) {
            if (!hitEndHigh) {
                // Not done seeking.
                return { seekLow: false, seekHigh: true, highlightInfo: null };
            }
        }
        // Done seeking.
        return { seekLow: false, seekHigh: false, highlightInfo: {
                start: lowPoint, count: highPoint - lowPoint, needsScrolling: seeking.seekingState !== SeekingState.SeekingComplete
            } };
    }
    // Initiates seek to some value.
    seek(value) {
        if (!this.rowSource.isTableRowSource()) {
            throw "Seeking on a non-tableRowSource";
        }
        let parsed;
        try {
            parsed = JSON.parse(value);
        }
        catch (error) {
            if (error instanceof SyntaxError) {
                console.log("Could not parse seek key as JSON.  Treating as string.", value);
                parsed = value;
            }
            else {
                throw error;
            }
        }
        const config = this.rowSource.configLoaded();
        const seeking = {
            target: parsed,
            seekingState: SeekingState.SeekingInProgress,
        };
        // There are different mechanisms of seeking, depending on whether we
        // can query by index, or if the value is already loaded.  We use the
        // column's index (with a fresh query), if it's possible and it makes
        // sense to do so (i.e. the data's not already there).
        const { seekLow: _seekLow, seekHigh: _seekHigh, highlightInfo } = this.computeSeeking(seeking);
        if (highlightInfo !== null ||
            (config !== null && !WindowRowSource.canUseIndex(config, this.rowSource.orderSpec))) {
            this.seeking = seeking;
            this.redrawAndFetchNow();
        }
        else {
            // We seek using index.  resetRowSource will assign to this.seeking
            const orderSpec = this.rowSource.orderSpec;
            this.resetRowSource(seeking, this.rowSource.tableSpec.seekingRowSource(orderSpec, parsed, () => { this.onUpdate(); }));
        }
    }
    cleanup() {
        this.rowSource.cancelPendingRequests();
        TableViewer.removeChildren(this.el);
        this.displayedInfo = TableViewer.initialDisplayedInfo();
    }
    wipeAndRedrawAndFetch() {
        this.nodes = this.wipeAndRecreateNodes();
        this.rerenderRowSource(this.seeking);
    }
    onUpdate() {
        this.redrawAndFetchNow();
    }
    static prototypeIsObject(value) {
        // This is good enough for my needs.  Especially after renaming the function.
        return Object.prototype.toString.call(value) === "[object Object]";
    }
    static get className() { return 'tableviewer'; }
    elMouseMove(event) {
        let dragging = this.displayedInfo.dragging;
        if (dragging === null) {
            return;
        }
        if (event.buttons !== 1) {
            this.displayedInfo.dragging = null;
            return;
        }
        let displacement = event.clientX - dragging.initialClientX;
        let columnInfo = this.displayedInfo.attrs[dragging.column].columnInfo;
        const minWidth = 20;
        let oldWidth = columnInfo.width;
        let newWidth = Math.max(minWidth, dragging.initialWidth + displacement);
        columnInfo.width = newWidth;
        if (oldWidth !== columnInfo.width) {
            this.setColumnWidth(dragging.column, newWidth);
        }
    }
    elEndDrag(event) {
        if (this.displayedInfo.dragging === null) {
            return;
        }
        this.displayedInfo.dragging = null;
    }
    static equalPrefix(a, b) {
        if (a.length !== b.length) {
            return false;
        }
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) {
                return false;
            }
        }
        return true;
    }
    rerenderRowSource(seeking) {
        this.displayedInfo.frontOffset = this.rowSource.rowsAndOffset().rows.frontOffset();
        this.rowhWipe();
        // this.displayedInfo.attrs untouched
        this.displayedInfo.dragging = null;
        // Setting top to 0 won't be harmful, at least.
        this.setRowHolderTop(0);
        this.seeking = seeking;
        this.redrawAndFetchNow(true, true);
    }
    resetRowSource(seeking, newRowSource) {
        this.rowSource.cancelPendingRequests();
        this.rowSource = newRowSource;
        this.docsProcessedForColumnInfo = null;
        this.rerenderRowSource(seeking);
    }
    handleColumnSorting(colId) {
        if (!this.rowSource.isTableRowSource()) {
            throw "handleColumnSorting on a non-tableRowSource";
        }
        // We could specially handle case when all data is already loaded, but
        // we don't. It's already on the server; just some network traffic; who
        // cares. We know ConfigLoaded is not null, because we've rendered
        // column headers.
        const config = this.rowSource.configLoaded();
        let prefix = this.displayedInfo.attrs[colId].prefix;
        if (TableViewer.equalPrefix(prefix, WindowRowSource.orderingColumn(config, this.rowSource.orderSpec))) {
            // We always recreate the row source.  Because no matter what, we
            // want undefineds at the end.
            const orderSpec = {
                colPath: this.rowSource.orderSpec.colPath,
                asc: !this.rowSource.orderSpec.asc,
            };
            this.resetRowSource(null, this.rowSource.tableSpec.columnRowSource(orderSpec, () => this.onUpdate()));
        }
        else {
            const orderSpec = { colPath: prefix, asc: true };
            this.resetRowSource(null, this.rowSource.tableSpec.columnRowSource(orderSpec, () => this.onUpdate()));
        }
    }
    // Constructs column header <tr> element.
    json_to_table_get_attr(flatten_attr) {
        const showRowNumbers = this.showRowNumbers;
        let tr = document.createElement('tr');
        tr.className = TableViewer.className + ' attrs';
        if (showRowNumbers !== null) {
            let blankTd = document.createElement('td');
            blankTd.className = 'rowNumber';
            tr.appendChild(blankTd);
        }
        for (let col in flatten_attr) {
            let attr_obj = flatten_attr[col];
            let tdEl = document.createElement('td');
            // TODO: Huh.  What re-sets column widths, if the column set changes after a resizing?
            tdEl.className = 'col-' + col;
            // TODO: Return value on every onclick.
            const colId = +col;
            tdEl.addEventListener('mousedown', (event) => {
                if (event.target !== tdEl) {
                    // We're in the double-click column sorting area.
                    if (event.detail >= 2) {
                        // Prevent highlighting of text upon double-clicking headers.
                        // Or triple-clicking, or quadruple-clicking, or N-tuple-clicking,
                        // which can happen if the data loads quickly enough (after the
                        // second click).
                        event.preventDefault();
                    }
                    return;
                }
                // We're in the resizing area.
                this.displayedInfo.dragging = {
                    column: colId,
                    initialClientX: event.clientX,
                    initialWidth: this.displayedInfo.attrs[colId].columnInfo.width,
                };
                // Prevents highlighting text while dragging.
                event.preventDefault();
                return false;
            });
            if (this.rowSource.isTableRowSource()) {
                tdEl.addEventListener('dblclick', (event) => {
                    if (event.target === tdEl) {
                        // This handler is for double-clicks outside the resizing area.
                        return;
                    }
                    event.preventDefault();
                    this.handleColumnSorting(colId);
                });
            }
            if (attr_obj.columnInfo.objectCount > 0) {
                switch (attr_obj.columnInfo.display) {
                    case ColumnInfoDisplay.Collapsed:
                        {
                            let arrowNode = document.createElement('div');
                            arrowNode.appendChild(document.createTextNode(' >'));
                            arrowNode.className = 'expand';
                            arrowNode.onclick = (event) => {
                                attr_obj.columnInfo.display = ColumnInfoDisplay.Expanded;
                                this.redrawAndFetchNow(true);
                            };
                            tdEl.appendChild(arrowNode);
                        }
                        break;
                    case ColumnInfoDisplay.Expanded:
                        {
                            let arrowNode = document.createElement('div');
                            arrowNode.appendChild(document.createTextNode(' <'));
                            arrowNode.className = 'collapse';
                            arrowNode.onclick = (event) => {
                                attr_obj.columnInfo.display = ColumnInfoDisplay.Collapsed;
                                this.redrawAndFetchNow(true);
                            };
                            tdEl.appendChild(arrowNode);
                        }
                        break;
                }
            }
            let el = document.createElement('div');
            el.className = 'value';
            tdEl.appendChild(el);
            switch (attr_obj.sortingStatus) {
                case ColumnSortingStatus.none:
                    break;
                case ColumnSortingStatus.asc:
                    el.appendChild(document.createTextNode('▲'));
                    break;
                case ColumnSortingStatus.desc:
                    el.appendChild(document.createTextNode('▼'));
                    break;
            }
            if (attr_obj.prefix.length === 0) {
                const italics = document.createElement('i');
                italics.appendChild(document.createTextNode('value'));
                el.appendChild(italics);
            }
            else {
                let text = attr_obj.prefix_str;
                el.appendChild(document.createTextNode(text));
            }
            tr.appendChild(tdEl);
        }
        return tr;
    }
    // Constructs table row <tr> element list.
    static json_to_table_get_values(showRowNumbers, rows, frontOffset, flattenAttr, highlightInfo) {
        let documentList = [];
        for (let i = 0; i < rows.length; i++) {
            let single_result = rows[i];
            let newDocument = { cells: [], tag: frontOffset + i };
            for (let col = 0; col < flattenAttr.length; col++) {
                let attr_obj = flattenAttr[col];
                let value = Preloader.access(single_result, attr_obj.prefix);
                newDocument.cells.push(this.makeDOMCell(value, col));
            }
            documentList.push(newDocument);
        }
        return this.helpMakeDOMRows(showRowNumbers, documentList, highlightInfo);
    }
    static makeDOMCell(value, col) {
        let data = this.compute_data_for_type(value);
        let el = document.createElement('td');
        const colClass = 'col-' + col;
        {
            let inner = document.createElement('span');
            if (data.data_to_expand !== undefined) {
                let arrow = document.createElement('span');
                arrow.className = 'jta_arrow jta_arrow_h';
                inner.dataset.json_data = data.data_to_expand;
                inner.appendChild(arrow);
            }
            inner.appendChild(document.createTextNode(data.value + ''));
            el.appendChild(inner);
        }
        let className = colClass + ' ' + data.classname;
        el.className = className;
        return el;
    }
    // Sets a column width (in pixels).
    setColumnWidth(col, width) {
        let sheet = this.nodes.styleNode.sheet;
        while (sheet.cssRules.length <= col) {
            let i = sheet.cssRules.length;
            sheet.insertRule('.' + TableViewer.className + ' td.col-' + i + ' { }', i);
        }
        sheet.deleteRule(col);
        sheet.insertRule('.' + TableViewer.className + ' td.col-' + col + ' { width: ' + width + 'px; max-width: ' + width + 'px; }', col);
    }
    static helpMakeDOMRows(showRowNumbers, documentList, highlightInfo) {
        let ret = [];
        const highlightStart = highlightInfo !== null ? highlightInfo.start : 0;
        const highlightEnd = highlightStart + (highlightInfo !== null ? highlightInfo.count : 0);
        for (let i = 0; i < documentList.length; i++) {
            let doc = documentList[i];
            let el = document.createElement('tr');
            let even = (doc.tag & 1) === 0;
            let className = this.className + (even ? ' even' : ' odd') +
                (doc.tag >= highlightStart && doc.tag < highlightEnd ? ' seeked' : '');
            if (highlightInfo !== null && highlightInfo.count === 0) {
                if (doc.tag === highlightStart - 1) {
                    className += ' seekedStart';
                }
                else if (doc.tag === highlightEnd) {
                    className += ' seekedEnd';
                }
            }
            el.className = className;
            el.dataset.row = doc.tag.toString();
            if (showRowNumbers !== null) {
                let rowNumberTd = document.createElement('td');
                rowNumberTd.className = 'rowNumber';
                rowNumberTd.appendChild(document.createTextNode('' + showRowNumbers.direction * (showRowNumbers.start + doc.tag)));
                el.appendChild(rowNumberTd);
            }
            for (let cell of doc.cells) {
                el.appendChild(cell);
            }
            ret.push(el);
        }
        return ret;
    }
    static totalSize(value) {
        let ptr = 8;
        if (value === null) {
            return ptr;
        }
        else if (Array.isArray(value)) {
            let size = ptr;
            for (let elt of value) {
                size += this.totalSize(elt);
            }
            return size;
        }
        else if (typeof value === 'number') {
            return ptr;
        }
        else if (typeof value === 'string') {
            return ptr + value.length;
        }
        else if (typeof value === 'boolean') {
            return ptr;
        }
        else if (this.prototypeIsObject(value)) {
            let size = ptr;
            for (let key in value) {
                size += ptr + key.length;
                size += this.totalSize(value[key]);
            }
            return size;
        }
        else {
            // Um, what?
            return ptr;
        }
    }
    // Adapted from other dataexplorer code.
    static compute_data_for_type(value) {
        let data = { value: value, classname: '' };
        if (value === null) {
            data.value = 'null';
            data.classname = 'jta_null';
        }
        else if (value === undefined) {
            data.value = 'undefined';
            data.classname = 'jta_undefined';
        }
        else if (Array.isArray(value)) {
            if (value.length === 0) {
                data.value = '[ ]';
                data.classname = 'empty array';
            }
            else {
                data.value = '[ ... ]';
                data.data_to_expand = JSON.stringify(value);
            }
        }
        else if (typeof value === 'number') {
            data.classname = 'jta_num';
        }
        else if (typeof value === 'string') {
            if (/^(http:https):\/\/[^\s]+$/i.test(value)) {
                data.classname = 'jta_url';
            }
            else if (/^[a-z0-9]+@[a-z0-9]+.[a-z0-9]{2,4}/i.test(value)) {
                data.classname = 'jta_email';
            }
            else {
                data.classname = 'jta_string';
            }
        }
        else if (typeof value === 'boolean') {
            data.classname = 'jta_bool';
            data.value = value === true ? 'true' : 'false';
        }
        else if (this.prototypeIsObject(value)) {
            if (value['$reql_type$'] === 'TIME') {
                data.value = rethinkdbGlobal.date_to_string(value);
                data.classname = 'jta_date';
            }
            else if (value['$reql_type$'] === 'BINARY') {
                data.value = rethinkdbGlobal.binary_to_string(value);
                data.classname = 'jta_bin';
            }
            else {
                data.value = '{ ... }';
                // TODO: is_object is unused.  How is it used in the data explorer?
                data.is_object = true;
                data.classname = '';
            }
        }
        return data;
    }
    static computeOntoColumnInfo(info, row) {
        if (this.prototypeIsObject(row) && !this.is_ptype(row)) {
            info.objectCount++;
            for (let key in row) {
                let obj = info.structure[key];
                if (obj === undefined) {
                    obj = this.makeNewInfo();
                    info.structure[key] = obj;
                }
                this.computeOntoColumnInfo(obj, row[key]);
            }
        }
        else {
            info.primitiveCount++;
        }
    }
    static makeNewInfo() {
        return {
            structure: {},
            primitiveCount: 0,
            objectCount: 0,
        };
    }
    static helpMakeColumnInfo(display) {
        // TODO: Adapt width to data, if we can.
        const defaultWidth = 100;
        return {
            structure: {},
            primitiveCount: 0,
            objectCount: 0,
            order: [],
            display: display,
            width: defaultWidth,
        };
    }
    static makeColumnInfo() {
        return this.helpMakeColumnInfo(ColumnInfoDisplay.Expanded);
    }
    static orderColumnInfo(pkeyOrNull, info) {
        let keys = [];
        for (let key in info.structure) {
            this.orderColumnInfo(null, info.structure[key]);
            keys.push({
                key: key,
                count: info.structure[key].objectCount + info.structure[key].primitiveCount
            });
        }
        if (pkeyOrNull !== null) {
            keys.sort((a, b) => {
                let diff = b.count - a.count;
                if (diff !== 0) {
                    return diff;
                }
                if (a.key === pkeyOrNull) {
                    return b.key === pkeyOrNull ? 0 : -1;
                }
                if (b.key === pkeyOrNull) {
                    return 1;
                }
                return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
            });
        }
        else {
            keys.sort((a, b) => b.count - a.count || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
        }
        info.sorted = keys;
    }
    static computeNewColumnInfo(pkeyOrNull, rows) {
        const info = this.makeNewInfo();
        for (let row of rows) {
            this.computeOntoColumnInfo(info, row);
        }
        this.orderColumnInfo(pkeyOrNull, info);
        return info;
    }
    // newInfo has its sorted field (filled out recursively).
    static mergeColumnInfo(columnInfo, newInfo) {
        columnInfo.primitiveCount += newInfo.primitiveCount;
        columnInfo.objectCount += newInfo.objectCount;
        for (let item of newInfo.sorted) {
            let key = item.key;
            let obj = columnInfo.structure[key];
            if (obj === undefined) {
                obj = this.makeColumnInfo();
                columnInfo.structure[key] = obj;
                columnInfo.order.push(key);
            }
            this.mergeColumnInfo(obj, newInfo.structure[key]);
        }
    }
    static updateColumnInfo(pkeyOrNull, columnInfo, rows) {
        const newInfo = this.computeNewColumnInfo(pkeyOrNull, rows);
        this.mergeColumnInfo(columnInfo, newInfo);
    }
    static helpEmitColumnInfoAttrs(ordering, prefix, onto, columnInfo) {
        if (columnInfo.primitiveCount > 0) {
            let sorting = ordering === null || !this.equalPrefix(prefix, ordering.column) ?
                ColumnSortingStatus.none :
                (ordering.asc ? ColumnSortingStatus.asc : ColumnSortingStatus.desc);
            let obj = {
                prefix: prefix.slice(),
                prefix_str: prefix.join('.'),
                columnInfo: columnInfo,
                sortingStatus: sorting,
            };
            onto.push(obj);
            if (columnInfo.display === ColumnInfoDisplay.Collapsed) {
                return;
            }
        }
        for (let key of columnInfo.order) {
            prefix.push(key);
            this.helpEmitColumnInfoAttrs(ordering, prefix, onto, columnInfo.structure[key]);
            prefix.pop();
        }
    }
    static emitColumnInfoAttrs(ordering, columnInfo) {
        let prefix = [];
        let onto = [];
        this.helpEmitColumnInfoAttrs(ordering, prefix, onto, columnInfo);
        return onto;
    }
    applyNewAttrs(attrs) {
        let old_attrs = this.displayedInfo.attrs;
        let changed = false;
        if (old_attrs.length !== attrs.length) {
            changed = true;
        }
        else {
            // Would the sort order or column set actually be different?
            // Probably not. Maybe if you shrank one column set and expanded
            // another, simultaneously.
            for (let i = 0; i < old_attrs.length; i++) {
                const oldAttr = old_attrs[i];
                const newAttr = attrs[i];
                if (oldAttr.prefix_str !== newAttr.prefix_str || oldAttr.sortingStatus !== newAttr.sortingStatus) {
                    changed = true;
                    break;
                }
            }
        }
        this.displayedInfo.attrs = attrs;
        let attrs_row = this.json_to_table_get_attr(attrs);
        TableViewer.removeChildren(this.nodes.columnHeaders);
        this.nodes.columnHeaders.appendChild(attrs_row);
        return changed;
    }
    static removeChildren(element) {
        while (element.lastChild) {
            element.removeChild(element.lastChild);
        }
    }
}
