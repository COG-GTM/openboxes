/*
 * Spock 2 fails tests whose @Unroll expressions cannot be resolved
 * (Spock 1 silently rendered them as-is). Keep the lenient behavior
 * so long-standing specs continue to run unchanged.
 */
unroll {
    validateExpressions false
}
