// Autogenerated by convert_tests.py and process_polyglot.py.
// Do not edit this file directly.
// The template for this file is located at:
// ../../../../../templates/Test.java
package gen;

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

import static gen.TestingCommon.*;
import gen.TestingFramework;

public class MutationSync {
    // Tests syncing tables
    Logger logger = LoggerFactory.getLogger(MutationSync.class);
    public static final RethinkDB r = RethinkDB.r;

    Connection conn;
    public String hostname = TestingFramework.getConfig().getHostName();
    public int port = TestingFramework.getConfig().getPort();

    @Before
    public void setUp() throws Exception {
        logger.info("Setting up.");
        conn = TestingFramework.createConnection();
        try {
            r.dbCreate("test").run(conn);
            r.db("test").wait_().run(conn);
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
        r.dbDrop("test").run(conn);
        conn.close(false);
    }

    // Autogenerated tests below

    @Test(timeout=120000)
    public void test() throws Exception {

        {
            // mutation/sync.yaml line #5
            /* partial({'tables_created':1}) */
            Partial expected_ = partial(r.hashMap("tables_created", 1L));
            /* r.db('test').table_create('test1') */
            logger.info("About to run line #5: r.db('test').tableCreate('test1')");
            Object obtained = runOrCatch(r.db("test").tableCreate("test1"),
                                          new OptArgs()
                                          ,conn);
            try {
                assertEquals(expected_, obtained);
            logger.info("Finished running line #5");
            } catch (Throwable ae) {
                logger.error("Whoops, got exception on line #5:" + ae.toString());
                if(obtained instanceof Throwable) {
                    ae.addSuppressed((Throwable) obtained);
                }
                throw ae;
            }
        }

        {
            // mutation/sync.yaml line #7
            /* partial({'tables_created':1}) */
            Partial expected_ = partial(r.hashMap("tables_created", 1L));
            /* r.db('test').table_create('test1soft') */
            logger.info("About to run line #7: r.db('test').tableCreate('test1soft')");
            Object obtained = runOrCatch(r.db("test").tableCreate("test1soft"),
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
            // mutation/sync.yaml line #9
            /* {'skipped':0, 'deleted':0, 'unchanged':0, 'errors':0, 'replaced':1, 'inserted':0} */
            Map expected_ = r.hashMap("skipped", 0L).with("deleted", 0L).with("unchanged", 0L).with("errors", 0L).with("replaced", 1L).with("inserted", 0L);
            /* r.db('test').table('test1soft').config().update({'durability':'soft'}) */
            logger.info("About to run line #9: r.db('test').table('test1soft').config().update(r.hashMap('durability', 'soft'))");
            Object obtained = runOrCatch(r.db("test").table("test1soft").config().update(r.hashMap("durability", "soft")),
                                          new OptArgs()
                                          ,conn);
            try {
                assertEquals(expected_, obtained);
            logger.info("Finished running line #9");
            } catch (Throwable ae) {
                logger.error("Whoops, got exception on line #9:" + ae.toString());
                if(obtained instanceof Throwable) {
                    ae.addSuppressed((Throwable) obtained);
                }
                throw ae;
            }
        }

        // mutation/sync.yaml line #11
        // tbl = r.db('test').table('test1')
        logger.info("Possibly executing: Table tbl = (Table) (r.db('test').table('test1'));");
        Table tbl = (Table) (r.db("test").table("test1"));

        // mutation/sync.yaml line #12
        // tbl_soft = r.db('test').table('test1soft')
        logger.info("Possibly executing: Table tbl_soft = (Table) (r.db('test').table('test1soft'));");
        Table tbl_soft = (Table) (r.db("test").table("test1soft"));

        {
            // mutation/sync.yaml line #13
            /* partial({'created':1}) */
            Partial expected_ = partial(r.hashMap("created", 1L));
            /* tbl.index_create('x') */
            logger.info("About to run line #13: tbl.indexCreate('x')");
            Object obtained = runOrCatch(tbl.indexCreate("x"),
                                          new OptArgs()
                                          ,conn);
            try {
                assertEquals(expected_, obtained);
            logger.info("Finished running line #13");
            } catch (Throwable ae) {
                logger.error("Whoops, got exception on line #13:" + ae.toString());
                if(obtained instanceof Throwable) {
                    ae.addSuppressed((Throwable) obtained);
                }
                throw ae;
            }
        }

        {
            // mutation/sync.yaml line #15
            /* [{'ready':True, 'index':'x'}] */
            List expected_ = r.array(r.hashMap("ready", true).with("index", "x"));
            /* tbl.index_wait('x').pluck('index', 'ready') */
            logger.info("About to run line #15: tbl.indexWait('x').pluck('index', 'ready')");
            Object obtained = runOrCatch(tbl.indexWait("x").pluck("index", "ready"),
                                          new OptArgs()
                                          ,conn);
            try {
                assertEquals(expected_, obtained);
            logger.info("Finished running line #15");
            } catch (Throwable ae) {
                logger.error("Whoops, got exception on line #15:" + ae.toString());
                if(obtained instanceof Throwable) {
                    ae.addSuppressed((Throwable) obtained);
                }
                throw ae;
            }
        }

        {
            // mutation/sync.yaml line #19
            /* {'synced':1} */
            Map expected_ = r.hashMap("synced", 1L);
            /* tbl.sync() */
            logger.info("About to run line #19: tbl.sync()");
            Object obtained = runOrCatch(tbl.sync(),
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
            // mutation/sync.yaml line #21
            /* {'synced':1} */
            Map expected_ = r.hashMap("synced", 1L);
            /* tbl_soft.sync() */
            logger.info("About to run line #21: tbl_soft.sync()");
            Object obtained = runOrCatch(tbl_soft.sync(),
                                          new OptArgs()
                                          ,conn);
            try {
                assertEquals(expected_, obtained);
            logger.info("Finished running line #21");
            } catch (Throwable ae) {
                logger.error("Whoops, got exception on line #21:" + ae.toString());
                if(obtained instanceof Throwable) {
                    ae.addSuppressed((Throwable) obtained);
                }
                throw ae;
            }
        }

        {
            // mutation/sync.yaml line #23
            /* {'synced':1} */
            Map expected_ = r.hashMap("synced", 1L);
            /* tbl.sync() */
            logger.info("About to run line #23: tbl.sync()");
            Object obtained = runOrCatch(tbl.sync(),
                                          new OptArgs()
                                          .with("durability", "soft")
                                          ,conn);
            try {
                assertEquals(expected_, obtained);
            logger.info("Finished running line #23");
            } catch (Throwable ae) {
                logger.error("Whoops, got exception on line #23:" + ae.toString());
                if(obtained instanceof Throwable) {
                    ae.addSuppressed((Throwable) obtained);
                }
                throw ae;
            }
        }

        {
            // mutation/sync.yaml line #27
            /* {'synced':1} */
            Map expected_ = r.hashMap("synced", 1L);
            /* tbl.sync() */
            logger.info("About to run line #27: tbl.sync()");
            Object obtained = runOrCatch(tbl.sync(),
                                          new OptArgs()
                                          .with("durability", "hard")
                                          ,conn);
            try {
                assertEquals(expected_, obtained);
            logger.info("Finished running line #27");
            } catch (Throwable ae) {
                logger.error("Whoops, got exception on line #27:" + ae.toString());
                if(obtained instanceof Throwable) {
                    ae.addSuppressed((Throwable) obtained);
                }
                throw ae;
            }
        }

        {
            // mutation/sync.yaml line #48
            /* partial({'tables_dropped':1}) */
            Partial expected_ = partial(r.hashMap("tables_dropped", 1L));
            /* r.db('test').table_drop('test1') */
            logger.info("About to run line #48: r.db('test').tableDrop('test1')");
            Object obtained = runOrCatch(r.db("test").tableDrop("test1"),
                                          new OptArgs()
                                          ,conn);
            try {
                assertEquals(expected_, obtained);
            logger.info("Finished running line #48");
            } catch (Throwable ae) {
                logger.error("Whoops, got exception on line #48:" + ae.toString());
                if(obtained instanceof Throwable) {
                    ae.addSuppressed((Throwable) obtained);
                }
                throw ae;
            }
        }

        {
            // mutation/sync.yaml line #50
            /* partial({'tables_dropped':1}) */
            Partial expected_ = partial(r.hashMap("tables_dropped", 1L));
            /* r.db('test').table_drop('test1soft') */
            logger.info("About to run line #50: r.db('test').tableDrop('test1soft')");
            Object obtained = runOrCatch(r.db("test").tableDrop("test1soft"),
                                          new OptArgs()
                                          ,conn);
            try {
                assertEquals(expected_, obtained);
            logger.info("Finished running line #50");
            } catch (Throwable ae) {
                logger.error("Whoops, got exception on line #50:" + ae.toString());
                if(obtained instanceof Throwable) {
                    ae.addSuppressed((Throwable) obtained);
                }
                throw ae;
            }
        }
    }
}
