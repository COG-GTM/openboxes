/**
 * Copyright (c) 2012 Partners In Health.  All rights reserved.
 * The use and distribution terms for this software are covered by the
 * Eclipse Public License 1.0 (http://opensource.org/licenses/eclipse-1.0.php)
 * which can be found in the file epl-v10.html at the root of this distribution.
 * By using this software in any fashion, you are agreeing to be bound by
 * the terms of this license.
 * You must not remove this notice, or any other, from this software.
 **/
package util.liquibase

import liquibase.change.AbstractChange
import liquibase.change.DatabaseChange
import liquibase.change.ChangeMetaData
import liquibase.database.Database
import liquibase.parser.core.ParsedNode
import liquibase.resource.ResourceAccessor
import liquibase.statement.SqlStatement

/**
 * No-op stand-in for the Liquibase 1.9-era {@code <modifyColumn>} tag.
 *
 * Seven historical changesets (0.5.x, 0.6.x, 0.8.x) still use this tag.
 * Liquibase 3.x had no ModifyColumnChange implementation either: its XML
 * parser silently dropped the unknown tag, so those changesets executed as
 * empty changesets (zero statements) and were recorded in DATABASECHANGELOG.
 * Liquibase 4.x instead fails the parse with "Unknown change type
 * 'modifyColumn'". This extension restores the exact Liquibase 3.10.1
 * behavior: the tag parses, produces no SQL, and the changeset is recorded
 * as ran.
 */
@DatabaseChange(
        name = 'modifyColumn',
        description = 'Legacy 1.9-XSD modifyColumn tag; a no-op, exactly as under Liquibase 3.x',
        priority = ChangeMetaData.PRIORITY_DEFAULT)
class ModifyColumnChange extends AbstractChange {

    @Override
    SqlStatement[] generateStatements(Database database) {
        return new SqlStatement[0]
    }

    @Override
    String getConfirmationMessage() {
        return 'Skipped legacy modifyColumn change (no-op under Liquibase 3.x and 4.x alike)'
    }

    /**
     * Swallow attributes and nested {@code <column>} nodes so the strict
     * Liquibase 4 ParsedNode loader doesn't reject them.
     */
    @Override
    void load(ParsedNode parsedNode, ResourceAccessor resourceAccessor) {
        // deliberately ignore all attributes and children
    }

    @Override
    boolean generateStatementsVolatile(Database database) {
        return false
    }

    @Override
    boolean supports(Database database) {
        return true
    }
}
