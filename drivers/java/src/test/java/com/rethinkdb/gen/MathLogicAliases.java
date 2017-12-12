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

public class MathLogicAliases {
    // Test named aliases for math and logic operators
    Logger logger = LoggerFactory.getLogger(MathLogicAliases.class);
    public static final RethinkDB r = RethinkDB.r;

    Connection conn;

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

    // Matches Python's str() function, which we use.
    // TODO: We might want to handle this in a visit_Call in convert_tests.py instead.
    private static String str(long i) {
        return String.valueOf(i);
    }

    // Autogenerated tests below

    @Test(timeout=120000)
    public void test() throws Exception {

        {
            // math_logic/aliases.yaml line #5
            /* 1 */
            Long expected_ = 1L;
            /* r.expr(0).add(1) */
            logger.info("About to run line #5: r.expr(0L).add(1L)");
            Object obtained = runOrCatch(r.expr(0L).add(1L),
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
            // math_logic/aliases.yaml line #6
            /* 1 */
            Long expected_ = 1L;
            /* r.add(0, 1) */
            logger.info("About to run line #6: r.add(0L, 1L)");
            Object obtained = runOrCatch(r.add(0L, 1L),
                                          new OptArgs()
                                          ,conn);
            try {
                assertEquals(expected_, obtained);
            logger.info("Finished running line #6");
            } catch (Throwable ae) {
                logger.error("Whoops, got exception on line #6:" + ae.toString());
                if(obtained instanceof Throwable) {
                    ae.addSuppressed((Throwable) obtained);
                }
                throw ae;
            }
        }

        {
            // math_logic/aliases.yaml line #7
            /* 1 */
            Long expected_ = 1L;
            /* r.expr(2).sub(1) */
            logger.info("About to run line #7: r.expr(2L).sub(1L)");
            Object obtained = runOrCatch(r.expr(2L).sub(1L),
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
            // math_logic/aliases.yaml line #8
            /* 1 */
            Long expected_ = 1L;
            /* r.sub(2, 1) */
            logger.info("About to run line #8: r.sub(2L, 1L)");
            Object obtained = runOrCatch(r.sub(2L, 1L),
                                          new OptArgs()
                                          ,conn);
            try {
                assertEquals(expected_, obtained);
            logger.info("Finished running line #8");
            } catch (Throwable ae) {
                logger.error("Whoops, got exception on line #8:" + ae.toString());
                if(obtained instanceof Throwable) {
                    ae.addSuppressed((Throwable) obtained);
                }
                throw ae;
            }
        }

        {
            // math_logic/aliases.yaml line #9
            /* 1 */
            Long expected_ = 1L;
            /* r.expr(2).div(2) */
            logger.info("About to run line #9: r.expr(2L).div(2L)");
            Object obtained = runOrCatch(r.expr(2L).div(2L),
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

        {
            // math_logic/aliases.yaml line #10
            /* 1 */
            Long expected_ = 1L;
            /* r.div(2, 2) */
            logger.info("About to run line #10: r.div(2L, 2L)");
            Object obtained = runOrCatch(r.div(2L, 2L),
                                          new OptArgs()
                                          ,conn);
            try {
                assertEquals(expected_, obtained);
            logger.info("Finished running line #10");
            } catch (Throwable ae) {
                logger.error("Whoops, got exception on line #10:" + ae.toString());
                if(obtained instanceof Throwable) {
                    ae.addSuppressed((Throwable) obtained);
                }
                throw ae;
            }
        }

        {
            // math_logic/aliases.yaml line #11
            /* 1 */
            Long expected_ = 1L;
            /* r.expr(1).mul(1) */
            logger.info("About to run line #11: r.expr(1L).mul(1L)");
            Object obtained = runOrCatch(r.expr(1L).mul(1L),
                                          new OptArgs()
                                          ,conn);
            try {
                assertEquals(expected_, obtained);
            logger.info("Finished running line #11");
            } catch (Throwable ae) {
                logger.error("Whoops, got exception on line #11:" + ae.toString());
                if(obtained instanceof Throwable) {
                    ae.addSuppressed((Throwable) obtained);
                }
                throw ae;
            }
        }

        {
            // math_logic/aliases.yaml line #12
            /* 1 */
            Long expected_ = 1L;
            /* r.mul(1, 1) */
            logger.info("About to run line #12: r.mul(1L, 1L)");
            Object obtained = runOrCatch(r.mul(1L, 1L),
                                          new OptArgs()
                                          ,conn);
            try {
                assertEquals(expected_, obtained);
            logger.info("Finished running line #12");
            } catch (Throwable ae) {
                logger.error("Whoops, got exception on line #12:" + ae.toString());
                if(obtained instanceof Throwable) {
                    ae.addSuppressed((Throwable) obtained);
                }
                throw ae;
            }
        }

        {
            // math_logic/aliases.yaml line #13
            /* 1 */
            Long expected_ = 1L;
            /* r.expr(1).mod(2) */
            logger.info("About to run line #13: r.expr(1L).mod(2L)");
            Object obtained = runOrCatch(r.expr(1L).mod(2L),
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
            // math_logic/aliases.yaml line #14
            /* 1 */
            Long expected_ = 1L;
            /* r.mod(1, 2) */
            logger.info("About to run line #14: r.mod(1L, 2L)");
            Object obtained = runOrCatch(r.mod(1L, 2L),
                                          new OptArgs()
                                          ,conn);
            try {
                assertEquals(expected_, obtained);
            logger.info("Finished running line #14");
            } catch (Throwable ae) {
                logger.error("Whoops, got exception on line #14:" + ae.toString());
                if(obtained instanceof Throwable) {
                    ae.addSuppressed((Throwable) obtained);
                }
                throw ae;
            }
        }

        {
            // math_logic/aliases.yaml line #25
            /* True */
            Boolean expected_ = true;
            /* r.expr(True).and_(True) */
            logger.info("About to run line #25: r.expr(true).and(true)");
            Object obtained = runOrCatch(r.expr(true).and(true),
                                          new OptArgs()
                                          ,conn);
            try {
                assertEquals(expected_, obtained);
            logger.info("Finished running line #25");
            } catch (Throwable ae) {
                logger.error("Whoops, got exception on line #25:" + ae.toString());
                if(obtained instanceof Throwable) {
                    ae.addSuppressed((Throwable) obtained);
                }
                throw ae;
            }
        }

        {
            // math_logic/aliases.yaml line #26
            /* True */
            Boolean expected_ = true;
            /* r.expr(True).or_(True) */
            logger.info("About to run line #26: r.expr(true).or(true)");
            Object obtained = runOrCatch(r.expr(true).or(true),
                                          new OptArgs()
                                          ,conn);
            try {
                assertEquals(expected_, obtained);
            logger.info("Finished running line #26");
            } catch (Throwable ae) {
                logger.error("Whoops, got exception on line #26:" + ae.toString());
                if(obtained instanceof Throwable) {
                    ae.addSuppressed((Throwable) obtained);
                }
                throw ae;
            }
        }

        {
            // math_logic/aliases.yaml line #27
            /* True */
            Boolean expected_ = true;
            /* r.and_(True, True) */
            logger.info("About to run line #27: r.and(true, true)");
            Object obtained = runOrCatch(r.and(true, true),
                                          new OptArgs()
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
            // math_logic/aliases.yaml line #28
            /* True */
            Boolean expected_ = true;
            /* r.or_(True, True) */
            logger.info("About to run line #28: r.or(true, true)");
            Object obtained = runOrCatch(r.or(true, true),
                                          new OptArgs()
                                          ,conn);
            try {
                assertEquals(expected_, obtained);
            logger.info("Finished running line #28");
            } catch (Throwable ae) {
                logger.error("Whoops, got exception on line #28:" + ae.toString());
                if(obtained instanceof Throwable) {
                    ae.addSuppressed((Throwable) obtained);
                }
                throw ae;
            }
        }

        {
            // math_logic/aliases.yaml line #29
            /* True */
            Boolean expected_ = true;
            /* r.expr(False).not_() */
            logger.info("About to run line #29: r.expr(false).not()");
            Object obtained = runOrCatch(r.expr(false).not(),
                                          new OptArgs()
                                          ,conn);
            try {
                assertEquals(expected_, obtained);
            logger.info("Finished running line #29");
            } catch (Throwable ae) {
                logger.error("Whoops, got exception on line #29:" + ae.toString());
                if(obtained instanceof Throwable) {
                    ae.addSuppressed((Throwable) obtained);
                }
                throw ae;
            }
        }

        {
            // math_logic/aliases.yaml line #30
            /* True */
            Boolean expected_ = true;
            /* r.not_(False) */
            logger.info("About to run line #30: r.not(false)");
            Object obtained = runOrCatch(r.not(false),
                                          new OptArgs()
                                          ,conn);
            try {
                assertEquals(expected_, obtained);
            logger.info("Finished running line #30");
            } catch (Throwable ae) {
                logger.error("Whoops, got exception on line #30:" + ae.toString());
                if(obtained instanceof Throwable) {
                    ae.addSuppressed((Throwable) obtained);
                }
                throw ae;
            }
        }

        {
            // math_logic/aliases.yaml line #34
            /* True */
            Boolean expected_ = true;
            /* r.expr(1).eq(1) */
            logger.info("About to run line #34: r.expr(1L).eq(1L)");
            Object obtained = runOrCatch(r.expr(1L).eq(1L),
                                          new OptArgs()
                                          ,conn);
            try {
                assertEquals(expected_, obtained);
            logger.info("Finished running line #34");
            } catch (Throwable ae) {
                logger.error("Whoops, got exception on line #34:" + ae.toString());
                if(obtained instanceof Throwable) {
                    ae.addSuppressed((Throwable) obtained);
                }
                throw ae;
            }
        }

        {
            // math_logic/aliases.yaml line #35
            /* True */
            Boolean expected_ = true;
            /* r.expr(1).ne(2) */
            logger.info("About to run line #35: r.expr(1L).ne(2L)");
            Object obtained = runOrCatch(r.expr(1L).ne(2L),
                                          new OptArgs()
                                          ,conn);
            try {
                assertEquals(expected_, obtained);
            logger.info("Finished running line #35");
            } catch (Throwable ae) {
                logger.error("Whoops, got exception on line #35:" + ae.toString());
                if(obtained instanceof Throwable) {
                    ae.addSuppressed((Throwable) obtained);
                }
                throw ae;
            }
        }

        {
            // math_logic/aliases.yaml line #36
            /* True */
            Boolean expected_ = true;
            /* r.expr(1).lt(2) */
            logger.info("About to run line #36: r.expr(1L).lt(2L)");
            Object obtained = runOrCatch(r.expr(1L).lt(2L),
                                          new OptArgs()
                                          ,conn);
            try {
                assertEquals(expected_, obtained);
            logger.info("Finished running line #36");
            } catch (Throwable ae) {
                logger.error("Whoops, got exception on line #36:" + ae.toString());
                if(obtained instanceof Throwable) {
                    ae.addSuppressed((Throwable) obtained);
                }
                throw ae;
            }
        }

        {
            // math_logic/aliases.yaml line #37
            /* True */
            Boolean expected_ = true;
            /* r.expr(1).gt(0) */
            logger.info("About to run line #37: r.expr(1L).gt(0L)");
            Object obtained = runOrCatch(r.expr(1L).gt(0L),
                                          new OptArgs()
                                          ,conn);
            try {
                assertEquals(expected_, obtained);
            logger.info("Finished running line #37");
            } catch (Throwable ae) {
                logger.error("Whoops, got exception on line #37:" + ae.toString());
                if(obtained instanceof Throwable) {
                    ae.addSuppressed((Throwable) obtained);
                }
                throw ae;
            }
        }

        {
            // math_logic/aliases.yaml line #38
            /* True */
            Boolean expected_ = true;
            /* r.expr(1).le(1) */
            logger.info("About to run line #38: r.expr(1L).le(1L)");
            Object obtained = runOrCatch(r.expr(1L).le(1L),
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
            // math_logic/aliases.yaml line #39
            /* True */
            Boolean expected_ = true;
            /* r.expr(1).ge(1) */
            logger.info("About to run line #39: r.expr(1L).ge(1L)");
            Object obtained = runOrCatch(r.expr(1L).ge(1L),
                                          new OptArgs()
                                          ,conn);
            try {
                assertEquals(expected_, obtained);
            logger.info("Finished running line #39");
            } catch (Throwable ae) {
                logger.error("Whoops, got exception on line #39:" + ae.toString());
                if(obtained instanceof Throwable) {
                    ae.addSuppressed((Throwable) obtained);
                }
                throw ae;
            }
        }

        {
            // math_logic/aliases.yaml line #40
            /* True */
            Boolean expected_ = true;
            /* r.eq(1, 1) */
            logger.info("About to run line #40: r.eq(1L, 1L)");
            Object obtained = runOrCatch(r.eq(1L, 1L),
                                          new OptArgs()
                                          ,conn);
            try {
                assertEquals(expected_, obtained);
            logger.info("Finished running line #40");
            } catch (Throwable ae) {
                logger.error("Whoops, got exception on line #40:" + ae.toString());
                if(obtained instanceof Throwable) {
                    ae.addSuppressed((Throwable) obtained);
                }
                throw ae;
            }
        }

        {
            // math_logic/aliases.yaml line #41
            /* True */
            Boolean expected_ = true;
            /* r.ne(1, 2) */
            logger.info("About to run line #41: r.ne(1L, 2L)");
            Object obtained = runOrCatch(r.ne(1L, 2L),
                                          new OptArgs()
                                          ,conn);
            try {
                assertEquals(expected_, obtained);
            logger.info("Finished running line #41");
            } catch (Throwable ae) {
                logger.error("Whoops, got exception on line #41:" + ae.toString());
                if(obtained instanceof Throwable) {
                    ae.addSuppressed((Throwable) obtained);
                }
                throw ae;
            }
        }

        {
            // math_logic/aliases.yaml line #42
            /* True */
            Boolean expected_ = true;
            /* r.lt(1, 2) */
            logger.info("About to run line #42: r.lt(1L, 2L)");
            Object obtained = runOrCatch(r.lt(1L, 2L),
                                          new OptArgs()
                                          ,conn);
            try {
                assertEquals(expected_, obtained);
            logger.info("Finished running line #42");
            } catch (Throwable ae) {
                logger.error("Whoops, got exception on line #42:" + ae.toString());
                if(obtained instanceof Throwable) {
                    ae.addSuppressed((Throwable) obtained);
                }
                throw ae;
            }
        }

        {
            // math_logic/aliases.yaml line #43
            /* True */
            Boolean expected_ = true;
            /* r.gt(1, 0) */
            logger.info("About to run line #43: r.gt(1L, 0L)");
            Object obtained = runOrCatch(r.gt(1L, 0L),
                                          new OptArgs()
                                          ,conn);
            try {
                assertEquals(expected_, obtained);
            logger.info("Finished running line #43");
            } catch (Throwable ae) {
                logger.error("Whoops, got exception on line #43:" + ae.toString());
                if(obtained instanceof Throwable) {
                    ae.addSuppressed((Throwable) obtained);
                }
                throw ae;
            }
        }

        {
            // math_logic/aliases.yaml line #44
            /* True */
            Boolean expected_ = true;
            /* r.le(1, 1) */
            logger.info("About to run line #44: r.le(1L, 1L)");
            Object obtained = runOrCatch(r.le(1L, 1L),
                                          new OptArgs()
                                          ,conn);
            try {
                assertEquals(expected_, obtained);
            logger.info("Finished running line #44");
            } catch (Throwable ae) {
                logger.error("Whoops, got exception on line #44:" + ae.toString());
                if(obtained instanceof Throwable) {
                    ae.addSuppressed((Throwable) obtained);
                }
                throw ae;
            }
        }

        {
            // math_logic/aliases.yaml line #45
            /* True */
            Boolean expected_ = true;
            /* r.ge(1, 1) */
            logger.info("About to run line #45: r.ge(1L, 1L)");
            Object obtained = runOrCatch(r.ge(1L, 1L),
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
    }
}
