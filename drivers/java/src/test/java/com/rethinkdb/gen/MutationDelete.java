// Autogenerated by convert_tests.py and process_polyglot.py.
// Do not edit this file directly.
// The template for this file is located at:
// ../../../../../../../templates/Test.java
package com.rethinkdb.gen;

import com.rethinkdb.RethinkDB;
import com.rethinkdb.gen.exc.*;
import com.rethinkdb.gen.ast.*;
import com.rethinkdb.ast.ReqlAst;
import com.rethinkdb.model.MapObject;
import com.rethinkdb.model.OptArgs;
import com.rethinkdb.net.Connection;
import com.rethinkdb.net.Cursor;
import junit.framework.TestCase;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertArrayEquals;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.junit.*;
import org.junit.rules.ExpectedException;

import java.util.Arrays;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.Instant;
import java.util.stream.LongStream;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import java.util.concurrent.TimeoutException;
import java.util.regex.Pattern;
import java.util.Collections;
import java.nio.charset.StandardCharsets;

import static com.rethinkdb.TestingCommon.*;
import com.rethinkdb.TestingFramework;

public class MutationDelete {
    // Tests deletes of selections
    Logger logger = LoggerFactory.getLogger(MutationDelete.class);
    public static final RethinkDB r = RethinkDB.r;
    public static final Table tbl = r.db("test").table("tbl");

    Connection conn;

    @Before
    public void setUp() throws Exception {
        logger.info("Setting up.");
        conn = TestingFramework.createConnection();
        try {
            r.dbCreate("test").run(conn);
            r.db("test").wait_().run(conn);
        }catch (Exception e){}
        try {
            r.db("test").tableCreate("tbl").run(conn);
            r.db("test").table(tbl).wait_().run(conn);
        }catch (Exception e){}
    }

    @After
    public void tearDown() throws Exception {
        logger.info("Tearing down.");
        r.db("rethinkdb").table("_debug_scratch").delete().run(conn);
        if(!conn.isOpen()){
            conn.close();
            conn = TestingFramework.createConnection();
        }
        r.db("test").tableDrop("tbl").run(conn);
        r.dbDrop("test").run(conn);
        conn.close(false);
    }

    // Matches Python's str() function, which we use.
    // TODO: We might want to handle this in a visit_Call in convert_tests.py instead.
    private static String str(long i) {
        return String.valueOf(i);
    }

    // Autogenerated tests below

    @Test(timeout=120000)
    public void test() throws Exception {

        {
            // mutation/delete.yaml line #7
            /* ({'deleted':0,'replaced':0,'unchanged':0,'errors':0,'skipped':0,'inserted':100}) */
            Map expected_ = r.hashMap("deleted", 0L).with("replaced", 0L).with("unchanged", 0L).with("errors", 0L).with("skipped", 0L).with("inserted", 100L);
            /* tbl.insert([{'id':i} for i in xrange(100)]) */
            logger.info("About to run line #7: tbl.insert(LongStream.range(0, 100L).boxed().map(i -> r.hashMap('id', i)).collect(Collectors.toList()))");
            Object obtained = runOrCatch(tbl.insert(LongStream.range(0, 100L).boxed().map(i -> r.hashMap("id", i)).collect(Collectors.toList())),
                                          new OptArgs()
                                          ,conn);
            try {
                assertEquals(expected_, obtained);
            logger.info("Finished running line #7");
            } catch (Throwable ae) {
                logger.error("Whoops, got exception on line #7:" + ae.toString());
                if(obtained instanceof Throwable) {
                    ae.addSuppressed((Throwable) obtained);
                }
                throw ae;
            }
        }

        {
            // mutation/delete.yaml line #19
            /* 100 */
            Long expected_ = 100L;
            /* tbl.count() */
            logger.info("About to run line #19: tbl.count()");
            Object obtained = runOrCatch(tbl.count(),
                                          new OptArgs()
                                          ,conn);
            try {
                assertEquals(expected_, obtained);
            logger.info("Finished running line #19");
            } catch (Throwable ae) {
                logger.error("Whoops, got exception on line #19:" + ae.toString());
                if(obtained instanceof Throwable) {
                    ae.addSuppressed((Throwable) obtained);
                }
                throw ae;
            }
        }

        {
            // mutation/delete.yaml line #24
            /* ({'deleted':1,'replaced':0,'unchanged':0,'errors':0,'skipped':0,'inserted':0}) */
            Map expected_ = r.hashMap("deleted", 1L).with("replaced", 0L).with("unchanged", 0L).with("errors", 0L).with("skipped", 0L).with("inserted", 0L);
            /* tbl.get(12).delete() */
            logger.info("About to run line #24: tbl.get(12L).delete()");
            Object obtained = runOrCatch(tbl.get(12L).delete(),
                                          new OptArgs()
                                          ,conn);
            try {
                assertEquals(expected_, obtained);
            logger.info("Finished running line #24");
            } catch (Throwable ae) {
                logger.error("Whoops, got exception on line #24:" + ae.toString());
                if(obtained instanceof Throwable) {
                    ae.addSuppressed((Throwable) obtained);
                }
                throw ae;
            }
        }

        {
            // mutation/delete.yaml line #31
            /* err('ReqlQueryLogicError', 'Durability option `wrong` unrecognized (options are "hard" and "soft").', [0]) */
            Err expected_ = err("ReqlQueryLogicError", "Durability option `wrong` unrecognized (options are \"hard\" and \"soft\").", r.array(0L));
            /* tbl.skip(50).delete(durability='wrong') */
            logger.info("About to run line #31: tbl.skip(50L).delete().optArg('durability', 'wrong')");
            Object obtained = runOrCatch(tbl.skip(50L).delete().optArg("durability", "wrong"),
                                          new OptArgs()
                                          ,conn);
            try {
                assertEquals(expected_, obtained);
            logger.info("Finished running line #31");
            } catch (Throwable ae) {
                logger.error("Whoops, got exception on line #31:" + ae.toString());
                if(obtained instanceof Throwable) {
                    ae.addSuppressed((Throwable) obtained);
                }
                throw ae;
            }
        }

        {
            // mutation/delete.yaml line #38
            /* ({'deleted':49,'replaced':0,'unchanged':0,'errors':0,'skipped':0,'inserted':0}) */
            Map expected_ = r.hashMap("deleted", 49L).with("replaced", 0L).with("unchanged", 0L).with("errors", 0L).with("skipped", 0L).with("inserted", 0L);
            /* tbl.skip(50).delete(durability='soft') */
            logger.info("About to run line #38: tbl.skip(50L).delete().optArg('durability', 'soft')");
            Object obtained = runOrCatch(tbl.skip(50L).delete().optArg("durability", "soft"),
                                          new OptArgs()
                                          ,conn);
            try {
                assertEquals(expected_, obtained);
            logger.info("Finished running line #38");
            } catch (Throwable ae) {
                logger.error("Whoops, got exception on line #38:" + ae.toString());
                if(obtained instanceof Throwable) {
                    ae.addSuppressed((Throwable) obtained);
                }
                throw ae;
            }
        }

        {
            // mutation/delete.yaml line #45
            /* ({'deleted':50,'replaced':0,'unchanged':0,'errors':0,'skipped':0,'inserted':0}) */
            Map expected_ = r.hashMap("deleted", 50L).with("replaced", 0L).with("unchanged", 0L).with("errors", 0L).with("skipped", 0L).with("inserted", 0L);
            /* tbl.delete(durability='hard') */
            logger.info("About to run line #45: tbl.delete().optArg('durability', 'hard')");
            Object obtained = runOrCatch(tbl.delete().optArg("durability", "hard"),
                                          new OptArgs()
                                          ,conn);
            try {
                assertEquals(expected_, obtained);
            logger.info("Finished running line #45");
            } catch (Throwable ae) {
                logger.error("Whoops, got exception on line #45:" + ae.toString());
                if(obtained instanceof Throwable) {
                    ae.addSuppressed((Throwable) obtained);
                }
                throw ae;
            }
        }

        {
            // mutation/delete.yaml line #49
            /* err('ReqlQueryLogicError', 'Expected type SELECTION but found DATUM:', [0]) */
            Err expected_ = err("ReqlQueryLogicError", "Expected type SELECTION but found DATUM:", r.array(0L));
            /* r.expr([1, 2]).delete() */
            logger.info("About to run line #49: r.expr(r.array(1L, 2L)).delete()");
            Object obtained = runOrCatch(r.expr(r.array(1L, 2L)).delete(),
                                          new OptArgs()
                                          ,conn);
            try {
                assertEquals(expected_, obtained);
            logger.info("Finished running line #49");
            } catch (Throwable ae) {
                logger.error("Whoops, got exception on line #49:" + ae.toString());
                if(obtained instanceof Throwable) {
                    ae.addSuppressed((Throwable) obtained);
                }
                throw ae;
            }
        }
    }
}
