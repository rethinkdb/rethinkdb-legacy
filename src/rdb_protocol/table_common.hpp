// Copyright 2010-2014 RethinkDB, all rights reserved.
#ifndef RDB_PROTOCOL_TABLE_COMMON_HPP_
#define RDB_PROTOCOL_TABLE_COMMON_HPP_

#include <string>

#include "containers/optional.hpp"
#include "rdb_protocol/protocol.hpp"

/* This file is for logic that is shared between `real_table_t` and `artificial_table_t`.
*/

/* This function generates an error message for when the user tries to run a query with a
secondary index that doesn't exist. It's defined here so that `real_table_t` and
`artificial_table_t` produce consistent error messages. */
std::string error_message_index_not_found(
        const std::string &sindex, const std::string &table);

/* Returns `[{"old_val": old_val, "new_val": new_val}]` */
MUST_USE ql::datum_t
make_replacement_pair(ql::datum_t old_val, ql::datum_t new_val);

/* `rcheck_row_replacement()` checks that a change to a row is legal. Specifically, it
makes sure that the new row is an object and has the same primary key as the old row. */
void rcheck_row_replacement(
        /* The primary key name for the table, i.e. `id` */
        const datum_string_t &primary_key_name,
        /* The primary key for the row being replaced, in the form of a `store_key_t`. */
        const store_key_t &primary_key_value,
        /* The previous value of the row. If the row was present before, this should be
        an object with the same primary key as `primary_key_value`. If the row was absent
        before, this should be a `null` datum. */
        ql::datum_t old_row,
        /* The new value of the row, as generated by the user's function. */
        ql::datum_t new_row);

/* `make_row_replacement_stats()` generates a stats object describing a change. If the
change is not legal, behavior is undefined; you should call `rcheck_row_replacement()` to
make sure the change is legal before calling this. */
ql::datum_t make_row_replacement_stats(
        const datum_string_t &primary_key_name,
        const store_key_t &primary_key_value,
        ql::datum_t old_row,
        ql::datum_t new_row,
        /* The return_changes flag passed to `write_batched_replace()` */
        return_changes_t return_changes,
        /* Set to `*old_row != *new_row`. This is to avoid having to compare the
        documents twice; they may be large. */
        bool *was_changed_out);

/* `make_row_replacement_error_stats()` generates a stats object describing a change to a
row in the case where an exception was thrown. If `rcheck_row_replacement()` throws
an exception, you should pass the error message to `make_row_replacement_error_stats()`.
*/
ql::datum_t make_row_replacement_error_stats(
        ql::datum_t old_row,
        ql::datum_t new_row,
        return_changes_t return_changes,
        const char *error_message);

/* `resolve_insert_conflict` computes what the new value of a row should be after
performing an insert operation with the given conflict behavior. It may throw a QL
exception. */
ql::datum_t resolve_insert_conflict(
        ql::env_t *env,
        const std::string &primary_key,
        ql::datum_t old_row,
        ql::datum_t insert_row,
        conflict_behavior_t conflict_behavior,
        optional<counted_t<const ql::func_t> > conflict_func);

#endif /* RDB_PROTOCOL_TABLE_COMMON_HPP_ */

